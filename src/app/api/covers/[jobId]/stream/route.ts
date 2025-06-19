import { NextRequest } from 'next/server';
import { jobStore } from '@/lib/jobs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  const encoder = new TextEncoder();

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Subscribe to job updates
  const unsubscribe = jobStore.subscribe(jobId, (progress) => {
    const data = `data: ${JSON.stringify(progress)}\n\n`;
    writer.write(encoder.encode(data));

    // Close stream when job is done
    if (progress.status === 'completed' || progress.status === 'error') {
      setTimeout(() => {
        writer.close();
        unsubscribe();
      }, 1000);
    }
  });

  // Handle client disconnect
  request.signal.addEventListener('abort', () => {
    unsubscribe();
    writer.close();
  });

  return new Response(stream.readable, { headers });
}