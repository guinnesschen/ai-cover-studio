import { put } from '@vercel/blob';
import fs from 'fs/promises';
import path from 'path';

// For local development, we'll still use the file system
const isDevelopment = process.env.NODE_ENV === 'development';
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'covers');

// Ensure public directory exists for local development
if (isDevelopment) {
  fs.mkdir(PUBLIC_DIR, { recursive: true }).catch(() => {});
}

export async function uploadFile(filePath: string, fileName: string): Promise<string> {
  try {
    // In production or when Vercel Blob is configured
    if (!isDevelopment && process.env.BLOB_READ_WRITE_TOKEN) {
      console.log('Uploading to Vercel Blob:', fileName);
      
      const fileBuffer = await fs.readFile(filePath);
      const blob = await put(fileName, fileBuffer, {
        access: 'public',
        contentType: getContentType(fileName),
      });
      
      // Clean up local file
      await fs.unlink(filePath).catch(() => {});
      
      console.log('Successfully uploaded to Vercel Blob:', blob.url);
      return blob.url;
    }
    
    // Local development fallback
    console.log('Using local storage for:', fileName);
    const destination = path.join(PUBLIC_DIR, fileName.replace(/\//g, '-'));
    await fs.copyFile(filePath, destination);
    
    // Clean up temp file
    await fs.unlink(filePath).catch(() => {});
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    return `${baseUrl}/covers/${fileName.replace(/\//g, '-')}`;
    
  } catch (error) {
    console.error('Upload error:', error);
    
    // Return placeholder for development
    return '/placeholder.mp4';
  }
}

function getContentType(filename: string): string {
  if (filename.endsWith('.mp3')) return 'audio/mpeg';
  if (filename.endsWith('.mp4')) return 'video/mp4';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}