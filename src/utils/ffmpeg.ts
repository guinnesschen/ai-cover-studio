import fs from 'fs';
import path from 'path';

// Use /tmp directory for serverless environments like Vercel
const TEMP_DIR = '/tmp';

// Get processing service URL from environment variable
const PROCESSING_SERVICE_URL = process.env.PROCESSING_SERVICE_URL || 'http://localhost:3001';

function sanitizeJobId(jobId: string): string {
  return jobId.replace(/[^a-zA-Z0-9-_]/g, '');
}

export async function stitchVideoAudio(
  videoUrl: string,
  audioUrl: string,
  jobId: string
): Promise<string> {
  const sanitizedJobId = sanitizeJobId(jobId);
  const outputPath = path.join(TEMP_DIR, `${sanitizedJobId}_final.mp4`);
  
  console.log(`[Video Stitch] Starting for job ${sanitizedJobId} via processing service`);
  
  try {
    // Read audio file and convert to base64
    let audioData: string;
    if (audioUrl.startsWith('http')) {
      // Download audio file first
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
      }
      const audioBuffer = await audioResponse.arrayBuffer();
      audioData = Buffer.from(audioBuffer).toString('base64');
    } else {
      // Local file path
      const audioBuffer = fs.readFileSync(audioUrl);
      audioData = audioBuffer.toString('base64');
    }

    // Call external processing service
    const response = await fetch(`${PROCESSING_SERVICE_URL}/stitch-video-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoUrl,
        audioData,
        jobId: sanitizedJobId
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Processing service failed: ${errorData.error || response.statusText}`);
    }

    const data = await response.json();

    if (!data.success || !data.fileData) {
      throw new Error('Invalid response from processing service');
    }

    // Convert base64 back to file
    const buffer = Buffer.from(data.fileData, 'base64');
    fs.writeFileSync(outputPath, buffer);

    // Verify file was created and has content
    if (!fs.existsSync(outputPath)) {
      throw new Error('Failed to create video file');
    }
    
    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      fs.unlinkSync(outputPath);
      throw new Error('Stitched video file is empty');
    }
    
    console.log(`[Video Stitch] Success! Created ${(stats.size / 1024 / 1024).toFixed(2)}MB video via processing service`);
    return outputPath;
    
  } catch (error) {
    console.error('[Video Stitch] Failed:', error);
    
    // Clean up any partial files
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (cleanupError) {
      console.error('[Video Stitch] Cleanup error:', cleanupError);
    }
    
    throw new Error(`Failed to stitch video and audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}