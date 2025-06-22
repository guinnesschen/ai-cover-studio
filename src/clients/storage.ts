import { put } from '@vercel/blob';
import fs from 'fs/promises';

export async function uploadFile(filePath: string, fileName: string): Promise<string> {
  console.log(`[Storage] Uploading file: ${filePath} → ${fileName}`);
  
  try {
    // Check if file exists
    await fs.access(filePath);
    
    const fileBuffer = await fs.readFile(filePath);
    console.log(`[Storage] File size: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`);
    
    const blob = await put(fileName, fileBuffer, {
      access: 'public',
      contentType: getContentType(fileName),
    });
    
    // Clean up local file
    await fs.unlink(filePath).catch((err) => {
      console.warn('[Storage] Failed to clean up local file:', err.message);
    });
    
    console.log(`[Storage] Successfully uploaded: ${blob.url}`);
    return blob.url;
    
  } catch (error) {
    console.error(`[Storage] Upload failed for ${fileName}:`, error);
    throw new Error(`Failed to upload ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getContentType(filename: string): string {
  if (filename.endsWith('.mp3')) return 'audio/mpeg';
  if (filename.endsWith('.webm')) return 'audio/webm';
  if (filename.endsWith('.mp4')) return 'video/mp4';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.wav')) return 'audio/wav';
  if (filename.endsWith('.m4a')) return 'audio/mp4';
  return 'application/octet-stream';
}