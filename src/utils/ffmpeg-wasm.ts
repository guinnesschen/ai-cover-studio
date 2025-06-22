import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import fs from 'fs/promises';
import path from 'path';
import { validateUrl, sanitizeJobId } from './validation';

const TEMP_DIR = '/tmp';

// Initialize FFmpeg.wasm
async function initFFmpeg(): Promise<FFmpeg> {
  const ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  return ffmpeg;
}

export async function stitchVideoAudioWasm(
  videoUrl: string,
  audioUrl: string,
  jobId: string
): Promise<string> {
  if (!validateUrl(videoUrl) || !validateUrl(audioUrl)) {
    throw new Error('Invalid URL');
  }
  
  const sanitizedJobId = sanitizeJobId(jobId);
  
  const videoFileName = `${sanitizedJobId}_video.mp4`;
  const audioFileName = `${sanitizedJobId}_audio.mp3`;
  const outputFileName = `${sanitizedJobId}_final.mp4`;
  const outputPath = path.join(TEMP_DIR, outputFileName);
  
  // Initialize FFmpeg
  const ffmpeg = await initFFmpeg();
  
  // Download files
  const [videoData, audioData] = await Promise.all([
    fetch(videoUrl).then(r => r.arrayBuffer()).then(b => new Uint8Array(b)),
    fetch(audioUrl).then(r => r.arrayBuffer()).then(b => new Uint8Array(b))
  ]);
  
  // Write to FFmpeg virtual filesystem
  await ffmpeg.writeFile(videoFileName, videoData);
  await ffmpeg.writeFile(audioFileName, audioData);

  // Process with FFmpeg
  await ffmpeg.exec([
    '-i', videoFileName,
    '-i', audioFileName,
    '-map', '0:v',
    '-map', '1:a', 
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    '-y',
    outputFileName
  ]);

  // Read output and save to disk
  const outputData = await ffmpeg.readFile(outputFileName);
  await fs.writeFile(outputPath, outputData as Uint8Array);
  
  return outputPath;
}

export async function simpleVideoAudioMerge(
  videoUrl: string,
  audioUrl: string,
  jobId: string
): Promise<string> {
  const sanitizedJobId = sanitizeJobId(jobId);
  const outputPath = path.join(TEMP_DIR, `${sanitizedJobId}_final.mp4`);
  
  // Just download the video as fallback
  const videoData = await fetch(videoUrl).then(r => r.arrayBuffer());
  await fs.writeFile(outputPath, new Uint8Array(videoData));
  
  return outputPath;
}