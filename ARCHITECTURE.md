# Vivid Cover Studio - Architecture Documentation

## Overview

Vivid Cover Studio is a web application that creates AI-generated character covers of songs. Users provide a YouTube URL, select a character, and the system generates a video of that character performing the song using AI voice cloning and video generation.

## Core Architecture Principles

1. **Pure Vercel Deployment** - Everything runs on Vercel's serverless platform
2. **Event-Driven Processing** - Use Replicate webhooks to avoid idle compute time
3. **Simple State Management** - Database as the single source of truth
4. **No Complex Infrastructure** - No Redis, no message queues, just webhooks and a database

## Tech Stack

- **Frontend**: Next.js 14 (App Router)
- **Backend**: Vercel Serverless Functions
- **Database**: Vercel Postgres (managed PostgreSQL via Neon)
- **File Storage**: Vercel Blob Storage
- **AI Processing**: Replicate API with webhooks
- **Real-time Updates**: Server-Sent Events (SSE)

## Data Model

### Single Entity Design

We use a single ID for the entire cover lifecycle. A "job" is just an incomplete cover.

```typescript
// Cover entity represents both in-progress and completed covers
Cover {
  id: string                    // Single ID for entire lifecycle
  youtubeUrl: string           // Input YouTube URL
  character: string            // Selected character
  imagePrompt?: string         // Optional image generation prompt
  
  // Processing state
  status: CoverStatus          // Current processing step
  progress: number             // 0-100
  errorMessage?: string        
  
  // Metadata (populated during processing)
  title?: string               // Extracted from YouTube
  artist?: string              // Extracted from YouTube
  
  // Final outputs
  videoUrl?: string            // Final cover video
  thumbnailUrl?: string        // Video thumbnail
  
  // Timestamps
  createdAt: Date
  completedAt?: Date
}

// Artifacts store intermediate outputs
Artifact {
  id: string
  coverId: string              // References Cover.id
  type: ArtifactType          // 'audio', 'image', 'vocals', etc.
  url: string                  // Vercel Blob URL
  replicateId?: string         // For webhook correlation
  metadata?: object            // Additional info (duration, format, etc.)
  createdAt: Date
}
```

### Status Flow

```
queued → downloading → generating_image → cloning_voice_full → 
cloning_voice_isolated → generating_video → stitching → completed
                                                      ↘
                                                        failed
```

## Processing Pipeline

### Event-Driven Architecture

The pipeline is triggered by user request and progresses via Replicate webhooks:

```
1. User Request → POST /api/covers
   - Create Cover record (status: 'queued')
   - Trigger first step
   - Return coverId immediately

2. Download Audio (inline processing)
   - Quick enough to do synchronously (~10-30s)
   - Save to Vercel Blob
   - Update status → 'generating_image'

3. Generate Image → Replicate webhook
   - Call Replicate API with webhook URL
   - Return immediately (no waiting)
   - Replicate calls webhook when done

4. Webhook receives result → Process next step
   - Save artifact
   - Update cover status
   - Trigger next Replicate call

5. Repeat for each AI step
   - Voice cloning (full mix)
   - Voice cloning (isolated vocals)
   - Video generation

6. Final stitching (inline processing)
   - Quick FFmpeg operation
   - Update status → 'completed'
```

### Key Insight: No Idle Compute

Instead of paying for compute time while waiting for Replicate:
- Each step triggers the next via webhooks
- Vercel functions only run when there's work to do
- Total compute time: ~30 seconds instead of 5+ minutes

## API Routes

### Public Endpoints

```typescript
// Create new cover
POST /api/covers
Body: { youtubeUrl, character, imagePrompt? }
Response: { coverId }

// Get gallery of completed covers
GET /api/covers
Response: { 
  covers: Cover[], 
  total: number,
  hasMore: boolean 
}

// Get specific cover (works for in-progress too)
GET /api/covers/[id]
Response: Cover & { 
  artifacts: {
    downloadedAudioId?: string,
    generatedImageId?: string,
    generatedVocalsId?: string,
    generatedMixedAudioId?: string,
    generatedVideoId?: string
  }
}

// Real-time progress updates
GET /api/covers/[id]/stream
Response: Server-Sent Events stream

// Get artifact details
GET /api/artifacts/[id]
Response: Artifact
```

### Webhook Endpoints

```typescript
// Replicate webhook receiver
POST /api/webhooks/replicate
Headers: { 'x-webhook-secret': '...' }
Body: ReplicatePrediction
```

## Real-time Updates

We use Server-Sent Events (SSE) for real-time progress updates:

1. Client connects to `/api/covers/[id]/stream`
2. Server queries database for current status
3. Sends updates as status changes
4. Client shows progressive UI as artifacts become available

## File Storage Strategy

All files stored in Vercel Blob Storage:
- Audio files: `covers/[coverId]/audio.mp3`
- Images: `covers/[coverId]/image.jpg`
- Videos: `covers/[coverId]/video.mp4`
- Final output: `covers/[coverId]/final.mp4`

URLs are permanent and can be cached indefinitely.

## Error Handling

1. **Replicate Failures**: Webhook includes error status
2. **Timeout Protection**: Each step has max duration
3. **Retry Logic**: Replicate automatically retries failed predictions
4. **User Feedback**: Errors stored in cover record and shown via SSE

## Security Considerations

1. **Webhook Authentication**: Verify `x-webhook-secret` header
2. **Input Validation**: YouTube URL format, file size limits
3. **Rate Limiting**: Consider adding if usage grows
4. **Content Moderation**: May need for public gallery

## Development vs Production

### Local Development
- Use ngrok for webhook testing
- SQLite for local database
- Local filesystem for blob storage

### Production (Vercel)
- Automatic webhook URL from environment
- Vercel Postgres
- Vercel Blob Storage

## Deployment

1. Push to GitHub
2. Vercel auto-deploys
3. Set environment variables:
   ```
   POSTGRES_URL          (auto-set by Vercel)
   BLOB_READ_WRITE_TOKEN (auto-set by Vercel)
   REPLICATE_API_TOKEN   (your API key)
   WEBHOOK_SECRET        (generate random string)
   NEXT_PUBLIC_APP_URL   (your deployment URL)
   ```

## Cost Analysis

For ~20 users creating ~100 covers/month:
- **Vercel Hobby**: $0 (includes Postgres & Blob)
- **Replicate**: ~$20-50 (depending on model usage)
- **Total**: $20-50/month

## Future Enhancements

If the app grows, consider:
1. **Authentication**: Protect the creation endpoint
2. **Queue Management**: Upstash QStash for better reliability
3. **CDN**: Cloudflare for video delivery
4. **Analytics**: Track popular characters and songs

## Why This Architecture?

1. **Simple**: No external services besides Replicate
2. **Cheap**: Scales to zero, pay only for usage
3. **Reliable**: Webhooks handle failures gracefully
4. **Fast**: No idle compute time
5. **Educational**: Learn Vercel, Next.js, and webhooks
6. **Maintainable**: Clear separation of concerns

## Common Pitfalls to Avoid

1. **Don't process in API routes** - Use webhooks for long tasks
2. **Don't store state in memory** - Serverless functions are stateless
3. **Don't forget webhook auth** - Verify requests are from Replicate
4. **Don't trust client timestamps** - Use server-side dates

## Debugging Tips

1. **Vercel Functions Log**: Check function logs in Vercel dashboard
2. **Webhook Testing**: Use Replicate dashboard to see webhook attempts
3. **Database State**: Add admin endpoint to inspect cover status
4. **SSE Debugging**: Browser DevTools shows EventSource connections