# YouTube Download Anti-Bot Detection Guide

This guide explains the improved YouTube download implementation with anti-bot detection measures.

## Features

### 1. **User Agent Rotation**
- Randomly selects from a pool of real browser user agents
- Mimics Chrome, Firefox on Windows, Mac, and Linux

### 2. **Browser-like Headers**
- Sends headers that real browsers send
- Includes Accept-Language, Sec-Fetch headers, etc.

### 3. **Cookie Support**
- Load cookies from a file or browser
- Helps bypass age restrictions and bot detection
- Maintains login session for better access

### 4. **Retry Logic with Exponential Backoff**
- Automatically retries failed downloads
- Exponential backoff for rate limit errors
- Different strategies for each retry attempt

### 5. **Rate Limiting**
- Configurable delays between downloads
- Prevents triggering YouTube's rate limits

### 6. **Multiple YouTube Player Clients**
- Tries web, android, and ios player clients
- Falls back to tv_embedded for age-gated content

## Setup

### 1. Basic Usage (No Cookies)

```bash
# Start the processing service
cd processing-service
npm install
npm start
```

### 2. With Cookies (Recommended)

#### Option A: Extract cookies from your browser

```bash
# Run the cookie extraction helper
node extract-cookies.js

# This will attempt to extract cookies using yt-dlp
# Or provide manual instructions for extraction
```

#### Option B: Manual cookie extraction

1. Log into YouTube in your browser
2. Install a browser extension like "Get cookies.txt" or "EditThisCookie"
3. Export cookies in Netscape format
4. Save as `cookies.txt`

#### Option C: Using yt-dlp directly

```bash
# For Chrome
yt-dlp --cookies-from-browser chrome --cookies cookies.txt --skip-download https://www.youtube.com

# For Firefox
yt-dlp --cookies-from-browser firefox --cookies cookies.txt --skip-download https://www.youtube.com
```

### 3. Configure the service

```bash
# Set the cookies file path (optional)
export YOUTUBE_COOKIES_FILE=/path/to/cookies.txt

# Start the service
npm start
```

## Testing

### Run the test script

```bash
# Test with a default video
node test-youtube-download.js

# Test with a specific URL
node test-youtube-download.js https://www.youtube.com/watch?v=VIDEO_ID
```

### Check service health

```bash
curl http://localhost:3001/health
```

## API Endpoints

### Download YouTube Audio

```bash
POST /download-youtube
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "jobId": "unique-job-id"
}
```

### Update Cookies

```bash
POST /update-cookies
Content-Type: application/json

# Option 1: With file path
{
  "cookiesPath": "/path/to/cookies.txt"
}

# Option 2: With content
{
  "cookiesContent": "# Netscape HTTP Cookie File\n..."
}
```

## Troubleshooting

### Bot Detection (Error 429)

1. **Use cookies**: This is the most effective solution
2. **Increase delays**: Modify `rateLimitDelay` in the configuration
3. **Use a VPN**: Change your IP address
4. **Try different times**: YouTube may have different rate limits at different times

### Age-Restricted Videos

The service automatically tries the `tv_embedded` player client for age-gated content.

### Regional Restrictions

Use a VPN to access region-locked content.

## Configuration Options

When initializing the YouTubeDownloader:

```javascript
const ytDownloader = new YouTubeDownloader({
  tempDir: '/tmp',                    // Temporary directory for downloads
  cookiesFile: 'cookies.txt',         // Path to cookies file
  maxRetries: 3,                      // Maximum retry attempts
  retryDelay: 2000,                   // Initial retry delay (ms)
  rateLimitDelay: 1000,              // Delay between downloads (ms)
  verbose: true                       // Enable verbose logging
});
```

## Logging

The service provides extensive logging to help debug issues:

- Download attempts and retry information
- User agent selection
- Cookie usage
- Error details with suggestions

## Security Notes

1. **Cookies**: Keep your cookies file secure and don't share it
2. **Rate Limits**: Respect YouTube's terms of service
3. **Legal**: Only download content you have permission to download

## Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Sign in to confirm your age" | Use cookies from a logged-in session |
| "HTTP Error 429: Too Many Requests" | Add delays, use cookies, or use a VPN |
| "Video unavailable" | Check if the video is private or deleted |
| "No video formats found" | Update yt-dlp: `pip install -U yt-dlp` |

## Updates

The YouTube API changes frequently. To update:

```bash
# Update yt-dlp
npm update youtube-dl-exec

# Or globally
npm install -g youtube-dl-exec@latest
```