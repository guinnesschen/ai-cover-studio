import fs from 'fs';
import path from 'path';

// For MVP, we'll use local file storage in the public directory
// In production, this would upload to S3/R2
const PUBLIC_DIR = path.join(process.cwd(), 'public', 'covers');

// Create directory if it doesn't exist
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

export async function uploadFile(filePath: string, fileName: string): Promise<string> {
  try {
    const destination = path.join(PUBLIC_DIR, fileName);
    
    // Copy file to public directory
    await fs.promises.copyFile(filePath, destination);
    
    // Return public URL
    return `/covers/${fileName}`;
  } catch (error) {
    console.error('Upload error:', error);
    
    // For MVP, return a placeholder URL
    return `/placeholder.mp4`;
  }
}