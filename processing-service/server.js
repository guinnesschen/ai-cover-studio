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
    
    console.log(`[YouTube Download] Starting download for job ${sanitizedJobId}`);

    // Use a fixed webm extension since that's what YouTube typically provides for audio
    const outputPath = path.join(TEMP_DIR, `${sanitizedJobId}_audio.webm`);
    
    console.log(`[YouTube Download] Attempting download with yt-dlp...`);
    console.log(`[YouTube Download] Output path: ${outputPath}`);
    console.log(`[YouTube Download] URL: ${url}`);
    
    // HYPOTHESIS TESTING: 3 possible reasons why tmp dir is empty after yt-dlp claims success
    console.log(`\n=== HYPOTHESIS TESTING STARTS ===`);
    
    // Pre-download baseline
    console.log(`[BASELINE] Pre-download state:`);
    console.log(`[BASELINE] Current working directory: ${process.cwd()}`);
    console.log(`[BASELINE] TEMP_DIR value: ${TEMP_DIR}`);
    console.log(`[BASELINE] /tmp exists: ${fs.existsSync('/tmp')}`);
    
    const preDownloadFiles = fs.readdirSync('/tmp');
    const preDownloadCount = preDownloadFiles.length;
    console.log(`[BASELINE] Files in /tmp before download (${preDownloadCount}):`, preDownloadFiles);
    
    // Test yt-dlp availability
    console.log(`[BASELINE] Testing yt-dlp availability...`);
    try {
      const versionOutput = await youtubedl('--version');
      console.log(`[BASELINE] yt-dlp version: ${versionOutput}`);
    } catch (versionError) {
      console.error(`[BASELINE] yt-dlp version check failed:`, versionError);
      throw new Error(`yt-dlp not available: ${versionError.message}`);
    }
    
    // HYPOTHESIS 1: yt-dlp writing to wrong directory
    console.log(`\n[HYPOTHESIS 1] Testing: yt-dlp writes to wrong directory`);
    console.log(`[HYPOTHESIS 1] Expected output path: ${outputPath}`);
    console.log(`[HYPOTHESIS 1] Expected directory: ${path.dirname(outputPath)}`);
    console.log(`[HYPOTHESIS 1] Working directory: ${process.cwd()}`);
    
    // HYPOTHESIS 2: yt-dlp failing silently
    console.log(`\n[HYPOTHESIS 2] Testing: yt-dlp fails silently`);
    let ytdlResult = null;
    let ytdlError = null;
    let ytdlStdout = '';
    let ytdlStderr = '';
    
    // HYPOTHESIS 3: Files created then immediately deleted
    console.log(`\n[HYPOTHESIS 3] Testing: files created then deleted`);
    const startTime = Date.now();
    
    try {
      console.log(`[DOWNLOAD] Starting yt-dlp with options:`, {
        format: 'bestaudio',
        output: outputPath,
        noPlaylist: true,
        verbose: true,
        printJson: true
      });
      
      // Run yt-dlp and capture everything
      ytdlResult = await youtubedl(url, {
        format: 'bestaudio',
        output: outputPath,
        noPlaylist: true,
        verbose: true,
        printJson: true
      });
      
      console.log(`[DOWNLOAD] yt-dlp returned successfully`);
      console.log(`[DOWNLOAD] Result type:`, typeof ytdlResult);
      console.log(`[DOWNLOAD] Result content:`, ytdlResult);
      
    } catch (error) {
      console.log(`[DOWNLOAD] yt-dlp threw an error`);
      ytdlError = error;
      console.error(`[DOWNLOAD] Error details:`, error);
      console.error(`[DOWNLOAD] Error message:`, error.message);
      console.error(`[DOWNLOAD] Error stack:`, error.stack);
      
      // Don't throw yet, continue with hypothesis testing
    }
    
    const endTime = Date.now();
    const downloadDuration = endTime - startTime;
    
    // IMMEDIATE post-download checks (HYPOTHESIS 3)
    console.log(`\n[HYPOTHESIS 3] Immediate post-download checks (${downloadDuration}ms after start):`);
    const immediatePostFiles = fs.readdirSync('/tmp');
    const immediatePostCount = immediatePostFiles.length;
    console.log(`[HYPOTHESIS 3] Files in /tmp immediately after (${immediatePostCount}):`, immediatePostFiles);
    console.log(`[HYPOTHESIS 3] File count change: ${preDownloadCount} → ${immediatePostCount} (${immediatePostCount - preDownloadCount > 0 ? '+' : ''}${immediatePostCount - preDownloadCount})`);
    
    // Check for expected file specifically
    const expectedFileExists = fs.existsSync(outputPath);
    console.log(`[HYPOTHESIS 3] Expected file exists at ${outputPath}: ${expectedFileExists}`);
    
    // Check for any new files (HYPOTHESIS 1 & 3)
    const newFiles = immediatePostFiles.filter(file => !preDownloadFiles.includes(file));
    console.log(`[HYPOTHESIS 3] New files created: ${newFiles.length > 0 ? newFiles : 'NONE'}`);
    
    if (newFiles.length > 0) {
      console.log(`[HYPOTHESIS 1] SUCCESS - Files were created, checking locations:`);
      newFiles.forEach(file => {
        const filePath = path.join('/tmp', file);
        const stats = fs.statSync(filePath);
        console.log(`[HYPOTHESIS 1] - ${file}: ${stats.size} bytes, created ${new Date(stats.birthtime).toISOString()}`);
      });
    } else {
      console.log(`[HYPOTHESIS 1] FAILED - No new files created anywhere in /tmp`);
    }
    
    // Wait a moment and check again (HYPOTHESIS 3)
    console.log(`[HYPOTHESIS 3] Waiting 2 seconds to check for file deletion...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const delayedPostFiles = fs.readdirSync('/tmp');
    const delayedPostCount = delayedPostFiles.length;
    console.log(`[HYPOTHESIS 3] Files in /tmp after 2s delay (${delayedPostCount}):`, delayedPostFiles);
    
    const filesDeletedAfterDelay = newFiles.filter(file => !delayedPostFiles.includes(file));
    if (filesDeletedAfterDelay.length > 0) {
      console.log(`[HYPOTHESIS 3] SUCCESS - Files were deleted after creation:`, filesDeletedAfterDelay);
    } else if (newFiles.length > 0 && delayedPostFiles.filter(file => newFiles.includes(file)).length > 0) {
      console.log(`[HYPOTHESIS 3] FAILED - Files still exist after delay`);
    } else {
      console.log(`[HYPOTHESIS 3] INDETERMINATE - No files were created to test deletion`);
    }
    
    // HYPOTHESIS 2 evaluation
    console.log(`\n[HYPOTHESIS 2] Evaluating silent failure:`);
    if (ytdlError) {
      console.log(`[HYPOTHESIS 2] FAILED - yt-dlp threw visible error:`, ytdlError.message);
      throw ytdlError; // Rethrow the original error
    } else if (newFiles.length === 0) {
      console.log(`[HYPOTHESIS 2] SUCCESS - yt-dlp claimed success but created no files`);
      console.log(`[HYPOTHESIS 2] This indicates yt-dlp failed silently or returned false success`);
      throw new Error('yt-dlp claimed success but created no files (silent failure)');
    } else {
      console.log(`[HYPOTHESIS 2] FAILED - yt-dlp succeeded and created files`);
    }
    
    console.log(`\n=== HYPOTHESIS TESTING COMPLETE ===\n`)

    // Determine which file to use based on hypothesis testing results
    let actualPath;
    let actualFileName;
    
    if (newFiles.length === 0) {
      // This should have been caught by hypothesis testing above
      throw new Error('No files were created during download');
    }
    
    // Check if the file was created at the expected location
    if (fs.existsSync(outputPath)) {
      console.log(`[File Resolution] Using expected file: ${outputPath}`);
      actualPath = outputPath;
      actualFileName = path.basename(outputPath);
    } else {
      // Use the first new file we found (they were already logged in hypothesis testing)
      console.log(`[File Resolution] Expected file not found, using first new file: ${newFiles[0]}`);
      actualPath = path.join(TEMP_DIR, newFiles[0]);
      actualFileName = newFiles[0];
    }

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
      fileName: actualFileName,
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