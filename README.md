# 🧪 AI CoverLab

Transform any song into a character performance using AI. Drop in a YouTube link, pick a character like Squidward, and watch AI generate a full cover with voice cloning and custom visuals.

## How it works

1. **🔗 Submit a song** - Paste any YouTube URL
2. **🎭 Pick a character** - Choose from Squidward and more coming soon  
3. **🖼️ Describe the vibe** - Optional prompt for custom artwork
4. **🎵 Get your cover** - AI generates voice, visuals, and video

## Characters available

- **Squidward** 🦑 (Active)
- Patrick ⭐ (Coming Soon)
- SpongeBob 🧽 (Coming Soon) 
- K-Pop Idol 🎤 (Coming Soon)
- Drake 🦉 (Coming Soon)

## Architecture

This project uses a hybrid deployment approach for optimal performance:

- **Main App** (Next.js) → Vercel - Handles UI, API routes, and database
- **Processing Service** (Express.js) → Render/Railway - Handles YouTube downloads and video processing

This split solves Vercel's limitations with binary processing while keeping the main app simple to deploy.

## Quick Start

1. **Deploy Processing Service**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
2. **Deploy Main App**: Standard Vercel deployment
3. **Configure**: Set `PROCESSING_SERVICE_URL` environment variable

## Development

```bash
# Main app
npm install
npm run dev

# Processing service (separate terminal)
cd processing-service
npm install
npm run dev
```

---

*Built with AI voice cloning, image generation, and video synthesis*