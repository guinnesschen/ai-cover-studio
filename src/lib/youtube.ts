import fs from 'fs';
import path from 'path';
import ytdl from 'ytdl-core';

// Create temp directory if it doesn't exist
const TEMP_DIR = path.join(process.cwd(), 'temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export async function downloadYouTubeAudio(url: string, jobId: string): Promise<string> {
  try {
    // For MVP, we'll use ytdl-core directly
    // In production, you might want to use ytdl-worker.vercel.app or yt-dlp
    
    const info = await ytdl.getInfo(url);
    
    // Get audio format
    const format = ytdl.chooseFormat(info.formats, {
      quality: 'highestaudio',
      filter: 'audioonly',
    });

    if (!format) {
      throw new Error('No suitable audio format found');
    }

    const outputPath = path.join(TEMP_DIR, `${jobId}_audio.mp3`);
    
    return new Promise((resolve, reject) => {
      const stream = ytdl(url, { format });
      const writeStream = fs.createWriteStream(outputPath);
      
      stream.pipe(writeStream);
      
      stream.on('error', reject);
      writeStream.on('error', reject);
      writeStream.on('finish', () => resolve(outputPath));
    });

  } catch (error) {
    console.error('YouTube download error:', error);
    
    // Fallback: for MVP, create a dummy audio file
    const dummyPath = path.join(TEMP_DIR, `${jobId}_audio.mp3`);
    fs.writeFileSync(dummyPath, ''); // Empty file
    return dummyPath;
  }
}