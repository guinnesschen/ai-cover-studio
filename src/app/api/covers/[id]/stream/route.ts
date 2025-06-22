import { NextRequest } from 'next/server';
import { prisma } from '@/clients/prisma';
import { ProgressUpdate, CoverStatus } from '@/types';

// GET /api/covers/[id]/stream - Server-Sent Events for progress updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // eslint-disable-next-line prefer-const
  let intervalId: NodeJS.Timeout;
  
  // Poll database for updates
  const sendUpdate = async () => {
    try {
      const cover = await prisma.cover.findUnique({
        where: { id },
        include: {
          artifacts: {
            select: {
              id: true,
              type: true,
              url: true,
              replicateId: true,
            },
          },
        },
      });

      if (!cover) {
        clearInterval(intervalId);
        await writer.close();
        return;
      }

      // Build progress update
      const update: ProgressUpdate = {
        status: cover.status as CoverStatus,
        progress: cover.progress,
        message: getStatusMessage(cover.status, cover.artifacts),
        artifacts: {
          downloadedAudioId: cover.artifacts.find(a => a.type === 'audio')?.id,
          generatedImageId: cover.artifacts.find(a => a.type === 'image')?.id,
          generatedVocalsFullId: cover.artifacts.find(a => a.type === 'vocals_full')?.id,
          generatedVocalsIsolatedId: cover.artifacts.find(a => a.type === 'vocals_isolated')?.id,
          generatedVideoId: cover.artifacts.find(a => a.type === 'video')?.id,
        },
        error: cover.errorMessage || undefined,
      };

      // Send SSE update
      await writer.write(encoder.encode(`data: ${JSON.stringify(update)}\n\n`));

      // Stop polling when done
      if (cover.status === 'completed' || cover.status === 'failed') {
        setTimeout(async () => {
          clearInterval(intervalId);
          await writer.close();
        }, 1000);
      }
    } catch (error) {
      console.error('Error sending update:', error);
      clearInterval(intervalId);
      try {
        await writer.close();
      } catch {}
    }
  };

  // Start polling
  intervalId = setInterval(sendUpdate, 1000);
  
  // Send initial update immediately
  sendUpdate();

  // Clean up on disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(intervalId);
    writer.close().catch(() => {});
  });

  return new Response(stream.readable, { headers });
}

function getStatusMessage(status: string, artifacts: { type: string; url?: string; replicateId?: string }[]): string {
  // For overall status messages
  if (status === 'completed') return 'Your cover is ready!';
  if (status === 'failed') return 'Something went wrong';
  
  // Determine what's currently happening based on completed artifacts
  const completedArtifacts = new Set(
    artifacts.filter(a => a.url).map(a => a.type)
  );
  
  // Check artifacts that exist but may not have URLs yet (in progress)
  const inProgressArtifacts = new Set(
    artifacts.filter(a => !a.url && a.replicateId).map(a => a.type)
  );
  
  const messages: string[] = [];
  
  // Show what's currently in progress
  if (!completedArtifacts.has('audio') && !inProgressArtifacts.has('audio')) {
    messages.push('Downloading audio from YouTube');
  }
  if (!completedArtifacts.has('image') && inProgressArtifacts.has('image')) {
    messages.push('Creating character portrait');
  }
  if (completedArtifacts.has('audio')) {
    if (!completedArtifacts.has('vocals_full') && inProgressArtifacts.has('vocals_full')) {
      messages.push('Cloning voice with full mix');
    }
    if (!completedArtifacts.has('vocals_isolated') && inProgressArtifacts.has('vocals_isolated')) {
      messages.push('Isolating vocals');
    }
  }
  if (completedArtifacts.has('image') && completedArtifacts.has('vocals_isolated')) {
    if (!completedArtifacts.has('video') && inProgressArtifacts.has('video')) {
      messages.push('Animating your performance');
    }
  }
  if (completedArtifacts.has('video') && completedArtifacts.has('vocals_full')) {
    messages.push('Finalizing your cover');
  }
  
  return messages.length > 0 ? messages.join(' • ') : 'Processing...';
}