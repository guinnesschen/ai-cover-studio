# Implementation Guide

This guide shows the key code patterns for implementing the architecture described in ARCHITECTURE.md.

## 1. Database Setup with Prisma

```bash
npm install prisma @prisma/client @vercel/postgres
npx prisma init
```

### prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}

model Cover {
  id           String    @id @default(cuid())
  youtubeUrl   String
  character    String
  imagePrompt  String?
  
  // Processing state
  status       String    @default("queued")
  progress     Int       @default(0)
  errorMessage String?
  
  // Metadata
  title        String?
  artist       String?
  
  // Final outputs
  videoUrl     String?
  thumbnailUrl String?
  
  // Timestamps
  createdAt    DateTime  @default(now())
  completedAt  DateTime?
  
  // Relations
  artifacts    Artifact[]
}

model Artifact {
  id          String   @id @default(cuid())
  coverId     String
  type        String   // 'audio', 'image', 'vocals_full', 'vocals_isolated', 'video'
  url         String
  replicateId String?  // For webhook correlation
  metadata    Json?
  createdAt   DateTime @default(now())
  
  cover       Cover    @relation(fields: [coverId], references: [id])
  
  @@index([replicateId])
}
```

## 2. Key API Route Patterns

### POST /api/covers - Create Cover

```typescript
// app/api/covers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processNextStep } from '@/lib/pipeline';

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl, character, imagePrompt } = await req.json();
    
    // Create cover record
    const cover = await prisma.cover.create({
      data: {
        youtubeUrl,
        character,
        imagePrompt,
        status: 'downloading'
      }
    });
    
    // Trigger pipeline (fire and forget)
    processNextStep(cover.id).catch(console.error);
    
    return NextResponse.json({ coverId: cover.id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create cover' }, { status: 500 });
  }
}
```

### POST /api/webhooks/replicate - Webhook Handler

```typescript
// app/api/webhooks/replicate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { processNextStep } from '@/lib/pipeline';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  // Verify webhook signature
  const webhookSecret = process.env.WEBHOOK_SECRET!;
  const signature = req.headers.get('x-webhook-secret');
  
  if (signature !== webhookSecret) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const prediction = await req.json();
  
  // Find the artifact this prediction belongs to
  const artifact = await prisma.artifact.findFirst({
    where: { replicateId: prediction.id }
  });
  
  if (!artifact) {
    return NextResponse.json({ error: 'Unknown prediction' }, { status: 404 });
  }
  
  if (prediction.status === 'succeeded') {
    // Update artifact with result
    await prisma.artifact.update({
      where: { id: artifact.id },
      data: { 
        url: prediction.output,
        metadata: { 
          processingTime: prediction.metrics?.predict_time 
        }
      }
    });
    
    // Process next step
    await processNextStep(artifact.coverId);
  } else if (prediction.status === 'failed') {
    // Mark cover as failed
    await prisma.cover.update({
      where: { id: artifact.coverId },
      data: {
        status: 'failed',
        errorMessage: prediction.error || 'Processing failed'
      }
    });
  }
  
  return NextResponse.json({ received: true });
}
```

## 3. Pipeline Implementation

```typescript
// lib/pipeline.ts
import prisma from '@/lib/prisma';
import { downloadYouTubeAudio } from '@/lib/youtube';
import { uploadToBlob } from '@/lib/storage';
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

export async function processNextStep(coverId: string) {
  const cover = await prisma.cover.findUnique({
    where: { id: coverId },
    include: { artifacts: true }
  });
  
  if (!cover) return;
  
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/replicate`;
  
  switch (cover.status) {
    case 'downloading': {
      // Download audio (synchronous - it's fast)
      const audioPath = await downloadYouTubeAudio(cover.youtubeUrl);
      const audioUrl = await uploadToBlob(audioPath, `${coverId}/audio.mp3`);
      
      // Save audio artifact
      await prisma.artifact.create({
        data: {
          coverId,
          type: 'audio',
          url: audioUrl
        }
      });
      
      // Update status
      await prisma.cover.update({
        where: { id: coverId },
        data: { 
          status: 'generating_image',
          progress: 20
        }
      });
      
      // Trigger image generation
      const prediction = await replicate.predictions.create({
        model: 'black-forest-labs/flux-schnell',
        input: {
          prompt: cover.imagePrompt || `${cover.character} portrait`,
        },
        webhook: webhookUrl,
        webhook_events_filter: ['completed']
      });
      
      // Store prediction ID for correlation
      await prisma.artifact.create({
        data: {
          coverId,
          type: 'image',
          url: '', // Will be updated by webhook
          replicateId: prediction.id
        }
      });
      break;
    }
    
    case 'generating_image': {
      // Get audio URL
      const audioArtifact = cover.artifacts.find(a => a.type === 'audio');
      if (!audioArtifact) throw new Error('Audio not found');
      
      // Update progress
      await prisma.cover.update({
        where: { id: coverId },
        data: { 
          status: 'cloning_voice_full',
          progress: 40
        }
      });
      
      // Start voice cloning
      const prediction = await replicate.predictions.create({
        model: 'zsxkib/realistic-voice-cloning',
        input: {
          input_audio: audioArtifact.url,
          rvc_model: 'Squidward', // or custom model
          // ... other parameters
        },
        webhook: webhookUrl,
        webhook_events_filter: ['completed']
      });
      
      await prisma.artifact.create({
        data: {
          coverId,
          type: 'vocals_full',
          url: '',
          replicateId: prediction.id
        }
      });
      break;
    }
    
    // Continue pattern for other steps...
    
    case 'completed': {
      // Final cleanup, generate thumbnail, etc.
      await prisma.cover.update({
        where: { id: coverId },
        data: {
          completedAt: new Date(),
          progress: 100
        }
      });
      break;
    }
  }
}
```

## 4. Server-Sent Events for Progress

```typescript
// app/api/covers/[id]/stream/route.ts
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Poll database for updates
  const interval = setInterval(async () => {
    try {
      const cover = await prisma.cover.findUnique({
        where: { id },
        include: {
          artifacts: {
            select: {
              id: true,
              type: true
            }
          }
        }
      });
      
      if (!cover) {
        clearInterval(interval);
        writer.close();
        return;
      }
      
      // Format progress update
      const update = {
        status: cover.status,
        progress: cover.progress,
        message: getStatusMessage(cover.status),
        artifacts: {
          downloadedAudioId: cover.artifacts.find(a => a.type === 'audio')?.id,
          generatedImageId: cover.artifacts.find(a => a.type === 'image')?.id,
          generatedVocalsId: cover.artifacts.find(a => a.type === 'vocals_full')?.id,
          generatedVideoId: cover.artifacts.find(a => a.type === 'video')?.id,
        },
        error: cover.errorMessage
      };
      
      await writer.write(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));
      
      // Stop polling when done
      if (cover.status === 'completed' || cover.status === 'failed') {
        setTimeout(() => {
          clearInterval(interval);
          writer.close();
        }, 1000);
      }
    } catch (error) {
      clearInterval(interval);
      writer.close();
    }
  }, 1000); // Poll every second
  
  // Clean up on disconnect
  req.signal.addEventListener('abort', () => {
    clearInterval(interval);
    writer.close();
  });
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    downloading: 'Downloading audio...',
    generating_image: 'Creating character portrait...',
    cloning_voice_full: 'Cloning voice with music...',
    cloning_voice_isolated: 'Isolating vocals...',
    generating_video: 'Animating performance...',
    stitching: 'Finalizing your cover...',
    completed: 'Your cover is ready!',
    failed: 'Something went wrong'
  };
  return messages[status] || 'Processing...';
}
```

## 5. File Storage with Vercel Blob

```typescript
// lib/storage.ts
import { put } from '@vercel/blob';
import fs from 'fs/promises';

export async function uploadToBlob(
  localPath: string, 
  blobPath: string
): Promise<string> {
  const file = await fs.readFile(localPath);
  
  const blob = await put(blobPath, file, {
    access: 'public',
    contentType: getContentType(blobPath)
  });
  
  // Clean up local file
  await fs.unlink(localPath).catch(() => {});
  
  return blob.url;
}

function getContentType(filename: string): string {
  if (filename.endsWith('.mp3')) return 'audio/mpeg';
  if (filename.endsWith('.mp4')) return 'video/mp4';
  if (filename.endsWith('.jpg')) return 'image/jpeg';
  return 'application/octet-stream';
}
```

## 6. Environment Variables

```bash
# .env.local
POSTGRES_URL="..."
POSTGRES_URL_NON_POOLING="..."
BLOB_READ_WRITE_TOKEN="..."
REPLICATE_API_TOKEN="..."
WEBHOOK_SECRET="generate-a-random-string"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 7. Local Development with Webhooks

For local webhook testing:

```bash
# Install ngrok
npm install -g ngrok

# In one terminal
npm run dev

# In another terminal
ngrok http 3000

# Use the ngrok URL for NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_APP_URL="https://abc123.ngrok.io"
```

## Key Patterns to Remember

1. **Never wait for Replicate** - Always use webhooks
2. **Database is source of truth** - Don't store state in memory
3. **Artifacts track everything** - Makes debugging easy
4. **Status drives the pipeline** - Each status triggers next step
5. **SSE polls database** - Simple and reliable

This implementation is simple, scalable, and perfect for learning Vercel!