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
        message: getStatusMessage(cover.status),
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

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    queued: 'Preparing your cover...',
    downloading: 'Downloading audio from YouTube...',
    generating_image: 'Creating character portrait...',
    cloning_voice_full: 'Cloning voice with full mix...',
    cloning_voice_isolated: 'Isolating vocals...',
    generating_video: 'Animating your performance...',
    stitching: 'Finalizing your cover...',
    completed: 'Your cover is ready!',
    failed: 'Something went wrong',
  };
  return messages[status] || 'Processing...';
}