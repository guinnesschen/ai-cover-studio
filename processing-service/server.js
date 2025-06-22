import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';
import YouTubeDownloader from './youtube-downloader.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Temp directory for file processing
const TEMP_DIR = '/tmp';

// Initialize YouTube downloader with anti-bot detection measures
const ytDownloader = new YouTubeDownloader({
  tempDir: TEMP_DIR,
  cookiesFile: process.env.YOUTUBE_COOKIES_FILE || null,
  maxRetries: 3,
  retryDelay: 2000,
  rateLimitDelay: 1000,
  verbose: true
});

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

// YouTube Download Endpoint with improved anti-bot detection
app.post('/download-youtube', async (req, res) => {
  try {
    const { url, jobId } = req.body;

    if (!validateYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }

    const sanitizedJobId = sanitizeJobId(jobId);
    
    console.log(`\n[YouTube Download] Starting download for job ${sanitizedJobId}`);
    console.log(`[YouTube Download] URL: ${url}`);
    console.log(`[YouTube Download] Using enhanced downloader with anti-bot detection`);
    
    try {
      // Use the new downloader with anti-bot detection
      const result = await ytDownloader.download(url, sanitizedJobId);
      
      // Read the downloaded file
      const fileData = fs.readFileSync(result.path);
      const base64Data = fileData.toString('base64');
      
      // Clean up the file
      fs.unlinkSync(result.path);
      
      console.log(`[YouTube Download] Successfully sent ${(result.size / 1024 / 1024).toFixed(2)}MB to client`);
      
      res.json({
        success: true,
        fileData: base64Data,
        fileName: path.basename(result.path),
        size: result.size
      });
      
    } catch (downloadError) {
      console.error(`[YouTube Download] Download failed:`, downloadError);
      
      // Check if it's a bot detection error
      if (downloadError.message.includes('Sign in to confirm') || 
          downloadError.message.includes('bot') || 
          downloadError.message.includes('429')) {
        console.error(`[YouTube Download] Bot detection triggered!`);
        
        // Log additional debug info
        console.log(`[YouTube Download] Consider using cookies from a logged-in browser session`);
        console.log(`[YouTube Download] Set YOUTUBE_COOKIES_FILE environment variable to cookies file path`);
        
        res.status(429).json({
          error: 'YouTube bot detection triggered. Please try again later or use authentication cookies.',
          details: downloadError.message
        });
      } else {
        throw downloadError;
      }
    }
    
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

// Cookie update endpoint
app.post('/update-cookies', (req, res) => {
  try {
    const { cookiesPath, cookiesContent } = req.body;
    
    if (cookiesPath) {
      // Update with file path
      ytDownloader.updateCookies(cookiesPath);
      res.json({ 
        success: true, 
        message: `Cookies updated from file: ${cookiesPath}` 
      });
    } else if (cookiesContent) {
      // Save content to temp file and update
      const tempCookiesPath = path.join(TEMP_DIR, 'youtube-cookies.txt');
      fs.writeFileSync(tempCookiesPath, cookiesContent);
      ytDownloader.updateCookies(tempCookiesPath);
      res.json({ 
        success: true, 
        message: 'Cookies updated from content',
        path: tempCookiesPath 
      });
    } else {
      res.status(400).json({ 
        error: 'Either cookiesPath or cookiesContent must be provided' 
      });
    }
  } catch (error) {
    console.error('[Cookie Update] Failed:', error);
    res.status(500).json({ 
      error: `Failed to update cookies: ${error.message}` 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'AI Cover Lab Processing Service',
    features: {
      antiBot: true,
      cookieSupport: !!process.env.YOUTUBE_COOKIES_FILE,
      retryLogic: true,
      userAgentRotation: true
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Processing service running on port ${PORT}`);
  console.log(`📥 YouTube downloads: POST /download-youtube`);
  console.log(`🎬 Video stitching: POST /stitch-video-audio`);
  console.log(`❤️  Health check: GET /health`);
});