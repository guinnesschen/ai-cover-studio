import fs from 'fs';
import path from 'path';
import youtubedl from 'youtube-dl-exec';

// Use /tmp directory for serverless environments like Vercel
const TEMP_DIR = '/tmp';

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

// File size limit is handled by yt-dlp with maxFilesize option

export async function downloadYouTubeAudio(url: string, jobId: string): Promise<string> {
  // Validate inputs
  if (!validateYouTubeUrl(url)) {
    throw new Error('Invalid YouTube URL');
  }
  
  const sanitizedJobId = sanitizeJobId(jobId);
  const outputPath = path.join(TEMP_DIR, `${sanitizedJobId}_audio.%(ext)s`);
  
  console.log(`[YouTube Download] Starting download for job ${sanitizedJobId}`);
  
  try {
    // Use youtube-dl-exec (yt-dlp) which is much more reliable
    // Download audio in its original format (usually webm/opus) 
    await youtubedl(url, {
      format: 'bestaudio', // Download best audio format available
      output: outputPath,
      maxFilesize: '500M', // 500MB limit
      matchFilter: 'duration < 600', // 10 minutes max
      noPlaylist: true,
      // Add user agent to avoid bot detection
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    // Find the actual downloaded file (since extension can vary)
    const baseName = `${sanitizedJobId}_audio`;
    const files = fs.readdirSync(TEMP_DIR).filter(file => file.startsWith(baseName));
    
    if (files.length === 0) {
      throw new Error('No downloaded file found');
    }
    
    const actualPath = path.join(TEMP_DIR, files[0]);
    
    // Verify file was created and has content
    if (!fs.existsSync(actualPath)) {
      throw new Error('Failed to create audio file');
    }
    
    const stats = fs.statSync(actualPath);
    if (stats.size === 0) {
      fs.unlinkSync(actualPath);
      throw new Error('Downloaded file is empty');
    }
    
    console.log(`[YouTube Download] Success! Downloaded ${(stats.size / 1024 / 1024).toFixed(2)}MB to ${actualPath}`);
    return actualPath;
    
  } catch (error) {
    console.error('[YouTube Download] Failed:', error);
    
    // Clean up any partial files
    const baseName = `${sanitizedJobId}_audio`;
    const files = fs.readdirSync(TEMP_DIR).filter(file => file.startsWith(baseName));
    files.forEach(file => {
      const filePath = path.join(TEMP_DIR, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    throw new Error(`Failed to download YouTube audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}