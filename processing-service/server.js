import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import youtubedl from 'youtube-dl-exec';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Temp directory for file processing
const TEMP_DIR = '/tmp';

// Helper functions
function validateYouTubeUrl(url) {
  try {
    const urlObj = new URL(url);
    return (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com' || urlObj.hostname === 'youtu.be') &&
           (urlObj.pathname.includes('/watch') || urlObj.hostname === 'youtu.be');
  } catch {
    return false;
  }
}

function sanitizeJobId(jobId) {
  return jobId.replace(/[^a-zA-Z0-9-_]/g, '');
}

// Initialize FFmpeg
let ffmpegInstance = null;
async function initFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance;
  
  ffmpegInstance = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpegInstance.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  
  return ffmpegInstance;
}

// YouTube Download Endpoint
app.post('/download-youtube', async (req, res) => {
  try {
    const { url, jobId } = req.body;

    if (!validateYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const sanitizedJobId = sanitizeJobId(jobId);
    const outputPath = path.join(TEMP_DIR, `${sanitizedJobId}_audio.%(ext)s`);

    console.log(`[YouTube Download] Starting download for job ${sanitizedJobId}`);

    // Download using youtube-dl-exec (works great on real servers!)
    await youtubedl(url, {
      format: 'bestaudio',
      output: outputPath,
      maxFilesize: '500M',
      matchFilter: 'duration < 600',
      noPlaylist: true,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    // Find the actual downloaded file
    const baseName = `${sanitizedJobId}_audio`;
    const files = fs.readdirSync(TEMP_DIR).filter(file => file.startsWith(baseName));

    if (files.length === 0) {
      throw new Error('No downloaded file found');
    }

    const actualPath = path.join(TEMP_DIR, files[0]);

    // Verify file
    if (!fs.existsSync(actualPath)) {
      throw new Error('Failed to create audio file');
    }

    const stats = fs.statSync(actualPath);
    if (stats.size === 0) {
      fs.unlinkSync(actualPath);
      throw new Error('Downloaded file is empty');
    }

    console.log(`[YouTube Download] Success! Downloaded ${(stats.size / 1024 / 1024).toFixed(2)}MB`);

    // Return file as base64 for easy transport
    const fileData = fs.readFileSync(actualPath);
    const base64Data = fileData.toString('base64');

    // Clean up
    fs.unlinkSync(actualPath);

    res.json({
      success: true,
      fileData: base64Data,
      fileName: files[0],
      size: stats.size
    });

  } catch (error) {
    console.error('[YouTube Download] Failed:', error);
    
    // Clean up any partial files
    try {
      const baseName = `${req.body.jobId ? sanitizeJobId(req.body.jobId) : 'unknown'}_audio`;
      const files = fs.readdirSync(TEMP_DIR).filter(file => file.startsWith(baseName));
      files.forEach(file => {
        const filePath = path.join(TEMP_DIR, file);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    } catch (cleanupError) {
      console.error('[YouTube Download] Cleanup error:', cleanupError);
    }

    res.status(500).json({
      error: `Failed to download YouTube audio: ${error.message}`
    });
  }
});

// Video Audio Stitching Endpoint
app.post('/stitch-video-audio', async (req, res) => {
  try {
    const { videoUrl, audioData, jobId } = req.body;

    if (!videoUrl || !audioData || !jobId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const sanitizedJobId = sanitizeJobId(jobId);
    const videoFileName = `${sanitizedJobId}_video.mp4`;
    const audioFileName = `${sanitizedJobId}_audio.webm`;
    const outputFileName = `${sanitizedJobId}_final.mp4`;
    const outputPath = path.join(TEMP_DIR, outputFileName);

    console.log(`[Video Stitch] Starting for job ${sanitizedJobId}`);

    // Initialize FFmpeg
    const ffmpeg = await initFFmpeg();

    // Download video
    const videoResponse = await fetch(videoUrl);
    const videoData = await videoResponse.arrayBuffer();
    const videoBuffer = new Uint8Array(videoData);

    // Convert audio from base64
    const audioBuffer = Buffer.from(audioData, 'base64');

    // Write to FFmpeg virtual filesystem
    await ffmpeg.writeFile(videoFileName, videoBuffer);
    await ffmpeg.writeFile(audioFileName, new Uint8Array(audioBuffer));

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

    // Read output
    const outputData = await ffmpeg.readFile(outputFileName);
    const outputBase64 = Buffer.from(outputData).toString('base64');

    console.log(`[Video Stitch] Success for job ${sanitizedJobId}`);

    res.json({
      success: true,
      fileData: outputBase64,
      fileName: outputFileName
    });

  } catch (error) {
    console.error('[Video Stitch] Failed:', error);
    res.status(500).json({
      error: `Failed to stitch video and audio: ${error.message}`
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', service: 'AI Cover Lab Processing Service' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Processing service running on port ${PORT}`);
  console.log(`📥 YouTube downloads: POST /download-youtube`);
  console.log(`🎬 Video stitching: POST /stitch-video-audio`);
  console.log(`❤️  Health check: GET /health`);
});