import fs from 'fs';
import path from 'path';
import ytdl from '@distube/ytdl-core';

// Create temp directory if it doesn't exist
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

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

// Maximum file size: 500MB
const MAX_FILE_SIZE = 500 * 1024 * 1024;

export async function downloadYouTubeAudio(url: string, jobId: string): Promise<string> {
  // Validate inputs
  if (!validateYouTubeUrl(url)) {
    throw new Error('Invalid YouTube URL');
  }
  
  const sanitizedJobId = sanitizeJobId(jobId);
  
  try {
    // For MVP, we'll use ytdl-core directly
    // In production, you might want to use ytdl-worker.vercel.app or yt-dlp
    
    const info = await ytdl.getInfo(url);
    
    // Validate video duration (max 10 minutes for safety)
    const duration = parseInt(info.videoDetails.lengthSeconds);
    if (duration > 600) {
      throw new Error('Video duration exceeds 10 minutes');
    }
    
    // Get audio format
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    if (!format) {
      throw new Error('No suitable audio format found');
    }

    const outputPath = path.join(TEMP_DIR, `${sanitizedJobId}_audio.mp3`);
    
    return new Promise((resolve, reject) => {
      let downloadedBytes = 0;
      
      const stream = ytdl(url, { format });
      const writeStream = fs.createWriteStream(outputPath);
      
      stream.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        
        // Check file size limit
        if (downloadedBytes > MAX_FILE_SIZE) {
          stream.destroy();
          writeStream.destroy();
          if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
          }
          reject(new Error('File size exceeds 500MB limit'));
        }
      });
      
      stream.pipe(writeStream);
      
      stream.on('error', (error) => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(error);
      });
      
      writeStream.on('error', (error) => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        reject(error);
      });
      
      writeStream.on('finish', () => {
        // Verify file was created and has content
        if (!fs.existsSync(outputPath)) {
          reject(new Error('Failed to create audio file'));
          return;
        }
        
        const stats = fs.statSync(outputPath);
        if (stats.size === 0) {
          fs.unlinkSync(outputPath);
          reject(new Error('Downloaded file is empty'));
          return;
        }
        
        resolve(outputPath);
      });
    });

  } catch (error) {
    console.error('YouTube download error:', error);
    throw error;
  }
}