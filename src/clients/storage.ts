import { put } from '@vercel/blob';
import fs from 'fs/promises';

export async function uploadFile(filePath: string, fileName: string): Promise<string> {
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

function getContentType(filename: string): string {
  if (filename.endsWith('.mp3')) return 'audio/mpeg';
  if (filename.endsWith('.mp4')) return 'video/mp4';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}