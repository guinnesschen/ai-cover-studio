# AI Cover Lab Processing Service

This service handles YouTube downloads and video/audio stitching for the AI Cover Lab application.

## Features

- 📥 YouTube audio downloads using `youtube-dl-exec`
- 🎬 Video and audio stitching using FFmpeg
- 🚀 Ready for deployment on Render, Railway, or Fly.io

## API Endpoints

### POST /download-youtube
Downloads audio from a YouTube URL.

**Request:**
```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "jobId": "unique-job-id"
}
```

**Response:**
```json
{
  "success": true,
  "fileData": "base64-encoded-audio-data",
  "fileName": "job-id_audio.webm",
  "size": 3456789
}
```

### POST /stitch-video-audio
Combines video and audio files.

**Request:**
```json
{
  "videoUrl": "https://example.com/video.mp4",
  "audioData": "base64-encoded-audio-data",
  "jobId": "unique-job-id"
}
```

**Response:**
```json
{
  "success": true,
  "fileData": "base64-encoded-video-data",
  "fileName": "job-id_final.mp4"
}
```

## Quick Deploy to Render

1. Push this folder to a GitHub repo
2. Go to [render.com](https://render.com)
3. "New Web Service" → Connect your repo
4. Select the `processing-service` folder
5. Deploy!

## Local Development

```bash
npm install
npm run dev
```

The service will run on `http://localhost:3001`.