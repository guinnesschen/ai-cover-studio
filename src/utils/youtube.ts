import fs from 'fs';
import path from 'path';

// Use /tmp directory for serverless environments like Vercel
const TEMP_DIR = '/tmp';

// Get processing service URL from environment variable
const PROCESSING_SERVICE_URL = process.env.PROCESSING_SERVICE_URL || 'http://localhost:3001';

// Validation helpers
function validateYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com' || urlObj.hostname === 'youtu.be') &&
           (urlObj.pathname.includes('/watch') || urlObj.hostname === 'youtu.be');
  } catch {
    return false;
  }
}

function sanitizeJobId(jobId: string): string {
  // Remove any path traversal attempts and special characters
  return jobId.replace(/[^a-zA-Z0-9-_]/g, '');
}

export async function downloadYouTubeAudio(url: string, jobId: string): Promise<string> {
  // Validate inputs
  if (!validateYouTubeUrl(url)) {
    throw new Error('Invalid YouTube URL');
  }
  
  const sanitizedJobId = sanitizeJobId(jobId);
  const outputPath = path.join(TEMP_DIR, `${sanitizedJobId}_audio.webm`);
  
  console.log(`[YouTube Download] Starting download for job ${sanitizedJobId} via processing service`);
  
  try {
    // Call external processing service
    const response = await fetch(`${PROCESSING_SERVICE_URL}/download-youtube`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
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
      throw new Error('Failed to create audio file');
    }
    
    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      fs.unlinkSync(outputPath);
      throw new Error('Downloaded file is empty');
    }
    
    console.log(`[YouTube Download] Success! Downloaded ${(stats.size / 1024 / 1024).toFixed(2)}MB via processing service`);
    return outputPath;
    
  } catch (error) {
    console.error('[YouTube Download] Failed:', error);
    
    // Clean up any partial files
    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
    } catch (cleanupError) {
      console.error('[YouTube Download] Cleanup error:', cleanupError);
    }
    
    throw new Error(`Failed to download YouTube audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}