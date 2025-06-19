# 🎙️ Vivid Cover Studio

A minimalist, elegant web app for creating AI-powered song covers with animated character performances.

## ✨ Features

- **YouTube Integration**: Paste any YouTube link to use as your audio source
- **Character Voice Cloning**: Transform vocals using pre-trained character voices (Squidward, K-Pop Idol, Drake)
- **AI Image Generation**: Create custom visuals for your character performance
- **Animated Videos**: Generate lip-synced videos with realistic facial animations
- **Gallery**: Browse and replay all your created covers
- **Real-time Progress**: Beautiful loading animations with status updates

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Replicate API token (get one at https://replicate.com/account/api-tokens)
- FFmpeg (optional, for video stitching)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```
   Then edit `.env.local` and add your Replicate API token.

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## 🎨 Architecture

The app follows a clean, serverless architecture:

- **Frontend**: Next.js 14 with React Server Components
- **Styling**: Tailwind CSS with custom design tokens
- **API**: Next.js API routes with Server-Sent Events for real-time updates
- **Job Queue**: In-memory store (upgradeable to Redis/Upstash)
- **Storage**: Local filesystem (upgradeable to S3/R2)
- **ML Pipeline**: Replicate API for all AI models

## 🔧 How It Works

1. User submits YouTube URL + character + image prompt
2. Backend creates a job and starts processing:
   - Downloads YouTube audio
   - Runs voice cloning (2x - full mix and isolated vocals)
   - Generates character portrait with Flux
   - Creates lip-synced video with Sonic
   - Stitches final video with full audio mix
3. Frontend receives real-time updates via SSE
4. Completed covers are saved to gallery (localStorage)

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── covers/       # API endpoints
│   ├── page.tsx          # Main studio interface
│   └── globals.css       # Global styles
├── components/           # React components
├── lib/                  # Core business logic
│   ├── pipeline.ts       # Orchestrates Replicate calls
│   ├── youtube.ts        # YouTube downloader
│   ├── ffmpeg.ts         # Video/audio stitching
│   └── storage.ts        # File storage
└── types/                # TypeScript definitions
```

## 🎯 Key Design Decisions

- **Minimalist UI**: Clean, gallery-inspired aesthetic with subtle animations
- **Edge-first**: Designed to run on Vercel Edge Functions
- **Progressive Enhancement**: Works without Replicate API (demo mode)
- **Local-first**: Gallery stored in browser, no user accounts needed

## 🚧 Production Considerations

For production deployment:

1. **Storage**: Replace local filesystem with S3/R2
2. **Queue**: Use Redis/Upstash instead of in-memory store
3. **YouTube**: Use external service (ytdl-worker) for better reliability
4. **Rate Limiting**: Add per-IP limits
5. **Error Handling**: Add Sentry or similar
6. **Character Models**: Train custom LoRA/RVC models for each character

## 🎭 Adding New Characters

1. Train RVC model for voice (see Replicate docs)
2. Train Flux LoRA for visuals (optional)
3. Add to `src/lib/characters.ts`:
   ```typescript
   {
     id: 'new-character',
     name: 'Character Name',
     emoji: '🎭',
     voiceModelUrl: 'https://...',
     fluxFineTuneId: 'abc123...'
   }
   ```

## 📝 License

This project is for educational/demo purposes. Be mindful of:
- YouTube's Terms of Service
- Copyright on songs and character likenesses
- Replicate's usage policies

## 🙏 Credits

Built with:
- [Replicate](https://replicate.com) - AI infrastructure
- [Next.js](https://nextjs.org) - React framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- Models by zsxkib, black-forest-labs, and the Replicate community