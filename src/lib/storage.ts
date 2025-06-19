import fs from 'fs';
import path from 'path';

// Helper function to upload to temporary public hosting for development
async function uploadToTempHost(filePath: string): Promise<string | null> {
  try {
    const FormData = require('form-data');
    const fetch = (await import('node-fetch')).default;
    
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    const response = await fetch('https://0x0.st', {
      method: 'POST',
      body: form,
    });
    
    if (response.ok) {
      const url = await response.text();
      return url.trim();
    }
  } catch (error) {
    console.error('Temp upload failed:', error);
  }
  return null;
}

// For MVP, we'll use local file storage in the public directory
// In production, this would upload to S3/R2
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'covers');

// Create directory if it doesn't exist
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

export async function uploadFile(filePath: string, fileName: string): Promise<string> {
  try {
    // In development, use temporary public hosting so Replicate can access files
    if (process.env.NODE_ENV !== 'production') {
      console.log('Uploading to temporary public host:', fileName);
      const publicUrl = await uploadToTempHost(filePath);
      if (publicUrl) {
        console.log('Successfully uploaded to:', publicUrl);
        return publicUrl;
      }
      console.log('Temp upload failed, falling back to local storage');
    }
    
    // Fallback to local storage
    const destination = path.join(PUBLIC_DIR, fileName);
    await fs.promises.copyFile(filePath, destination);
    
    // Get the base URL from environment or use localhost for development
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    // Return full public URL
    return `${baseUrl}/covers/${fileName}`;
  } catch (error) {
    console.error('Upload error:', error);
    
    // For MVP, return a placeholder URL
    return `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/placeholder.mp4`;
  }
}