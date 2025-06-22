import fs from 'fs';
import path from 'path';
import youtubedl from 'youtube-dl-exec';
import { randomInt } from 'crypto';

// Configuration for anti-bot detection
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
];

class YouTubeDownloader {
  constructor(config = {}) {
    this.config = {
      tempDir: config.tempDir || '/tmp',
      cookiesFile: config.cookiesFile || null,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 2000,
      rateLimitDelay: config.rateLimitDelay || 1000,
      verbose: config.verbose !== false
    };
    
    this.lastDownloadTime = 0;
    console.log('[YouTubeDownloader] Initialized with config:', this.config);
  }

  // Get a random user agent
  getRandomUserAgent() {
    return USER_AGENTS[randomInt(0, USER_AGENTS.length)];
  }

  // Apply rate limiting
  async applyRateLimit() {
    const now = Date.now();
    const timeSinceLastDownload = now - this.lastDownloadTime;
    
    if (timeSinceLastDownload < this.config.rateLimitDelay) {
      const delay = this.config.rateLimitDelay - timeSinceLastDownload;
      console.log(`[YouTubeDownloader] Rate limiting: waiting ${delay}ms before next download`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastDownloadTime = Date.now();
  }

  // Build yt-dlp options - SIMPLIFIED VERSION THAT WORKS
  buildYtDlpOptions(outputPath, attempt = 1) {
    const userAgent = this.getRandomUserAgent();
    
    console.log(`[YouTubeDownloader] Building options for attempt ${attempt}`);
    console.log(`[YouTubeDownloader] Using User-Agent: ${userAgent}`);
    
    // Start with minimal working options
    const options = {
      output: outputPath,
      format: 'best[ext=mp4]/best', // Simplified format that works
      userAgent: userAgent,
      referer: 'https://www.youtube.com/'
    };

    // Add cookies if available
    if (this.config.cookiesFile && fs.existsSync(this.config.cookiesFile)) {
      console.log(`[YouTubeDownloader] Using cookies from: ${this.config.cookiesFile}`);
      options.cookies = this.config.cookiesFile;
    }

    // For later attempts, try different strategies
    if (attempt > 1) {
      console.log(`[YouTubeDownloader] Attempt ${attempt}: trying alternative strategies`);
      
      if (attempt === 2) {
        // Try audio-only format
        options.format = 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best';
      }
      
      if (attempt >= 3) {
        // Try with extractor args for age-gated content
        options.extractorArgs = 'youtube:player_client=tv_embedded';
      }
    }

    return options;
  }

  // Download with retry logic
  async downloadWithRetry(url, outputPath, jobId) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`\n[YouTubeDownloader] Download attempt ${attempt}/${this.config.maxRetries} for job ${jobId}`);
        
        // Apply rate limiting before each attempt
        await this.applyRateLimit();
        
        // Build options for this attempt
        const options = this.buildYtDlpOptions(outputPath, attempt);
        
        console.log(`[YouTubeDownloader] Starting yt-dlp with options:`, JSON.stringify(options, null, 2));
        
        // Execute yt-dlp
        const result = await youtubedl(url, options);
        
        console.log(`[YouTubeDownloader] yt-dlp completed successfully`);
        
        // Check if file was created (might have different extension)
        let actualPath = outputPath;
        if (!fs.existsSync(outputPath)) {
          // Check for files with same base name but different extension
          const dir = path.dirname(outputPath);
          const baseName = path.basename(outputPath, path.extname(outputPath));
          const files = fs.readdirSync(dir).filter(f => f.startsWith(baseName));
          
          if (files.length > 0) {
            actualPath = path.join(dir, files[0]);
            console.log(`[YouTubeDownloader] File created with different name: ${actualPath}`);
          } else {
            throw new Error('Download completed but no file was created');
          }
        }
        
        // Verify file size
        const stats = fs.statSync(actualPath);
        if (stats.size === 0) {
          fs.unlinkSync(actualPath);
          throw new Error('Downloaded file is empty');
        }
        
        // If we need the file at the expected path, rename it
        if (actualPath !== outputPath && fs.existsSync(actualPath)) {
          fs.renameSync(actualPath, outputPath);
          console.log(`[YouTubeDownloader] Renamed to expected path: ${outputPath}`);
        }
        
        console.log(`[YouTubeDownloader] Success! Downloaded ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
        return { success: true, path: outputPath, size: stats.size };
        
      } catch (error) {
        lastError = error;
        console.error(`[YouTubeDownloader] Attempt ${attempt} failed:`, error.message);
        
        if (error.stderr) {
          console.error(`[YouTubeDownloader] yt-dlp stderr:`, error.stderr);
        }
        
        // Check for specific error types
        if (error.message && (
            error.message.includes('Sign in to confirm') || 
            error.message.includes('bot') || 
            error.message.includes('429'))) {
          console.log(`[YouTubeDownloader] Detected bot/rate limit error`);
          
          // Exponential backoff for rate limit errors
          if (attempt < this.config.maxRetries) {
            const backoffDelay = this.config.retryDelay * Math.pow(2, attempt - 1);
            console.log(`[YouTubeDownloader] Waiting ${backoffDelay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
        } else if (attempt < this.config.maxRetries) {
          // Regular retry delay for other errors
          console.log(`[YouTubeDownloader] Waiting ${this.config.retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }
    
    // All attempts failed
    throw new Error(`Failed after ${this.config.maxRetries} attempts. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  // Main download method
  async download(url, jobId) {
    const sanitizedJobId = jobId.replace(/[^a-zA-Z0-9-_]/g, '');
    const outputPath = path.join(this.config.tempDir, `${sanitizedJobId}_audio.webm`);
    
    console.log(`\n[YouTubeDownloader] Starting download for job ${sanitizedJobId}`);
    console.log(`[YouTubeDownloader] URL: ${url}`);
    console.log(`[YouTubeDownloader] Output path: ${outputPath}`);
    
    try {
      const result = await this.downloadWithRetry(url, outputPath, sanitizedJobId);
      return result;
    } catch (error) {
      console.error(`[YouTubeDownloader] Download failed for job ${sanitizedJobId}:`, error);
      
      // Clean up any partial files
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
          console.log(`[YouTubeDownloader] Cleaned up partial file`);
        }
        
        // Also clean up any files with the same base name
        const dir = path.dirname(outputPath);
        const baseName = path.basename(outputPath, path.extname(outputPath));
        const files = fs.readdirSync(dir).filter(f => f.startsWith(baseName));
        files.forEach(file => {
          const filePath = path.join(dir, file);
          fs.unlinkSync(filePath);
          console.log(`[YouTubeDownloader] Cleaned up: ${filePath}`);
        });
      } catch (cleanupError) {
        console.error(`[YouTubeDownloader] Cleanup error:`, cleanupError);
      }
      
      throw error;
    }
  }

  // Method to update cookies
  updateCookies(cookiesPath) {
    if (cookiesPath && fs.existsSync(cookiesPath)) {
      this.config.cookiesFile = cookiesPath;
      console.log(`[YouTubeDownloader] Updated cookies file to: ${cookiesPath}`);
    } else {
      console.warn(`[YouTubeDownloader] Cookies file not found: ${cookiesPath}`);
    }
  }
}

export default YouTubeDownloader;