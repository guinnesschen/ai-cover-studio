import { NextRequest, NextResponse } from 'next/server';
import { jobStore } from '@/lib/jobs';
import { processJob } from '@/lib/pipeline';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { youtubeUrl, character, imagePrompt } = body;

    // Basic validation
    if (!youtubeUrl || !character) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate job ID
    const jobId = crypto.randomUUID();

    // Create job
    jobStore.create(jobId, {
      youtubeUrl,
      character,
      imagePrompt,
    });

    // Process job asynchronously
    processJob(jobId).catch(error => {
      console.error(`Job ${jobId} failed:`, error);
      jobStore.update(jobId, {
        status: 'error',
        error: error.message,
      });
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}