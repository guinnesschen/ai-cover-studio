# Vivid Cover Studio

A cozy digital studio to craft playful character song covers effortlessly. Transform YouTube songs into captivating performances starring charming AI characters.

## Features

- 🎤 **AI Voice Cloning** - Clone character voices using state-of-the-art AI models
- 🎨 **AI Video Generation** - Generate animated performances of characters singing
- 🎵 **YouTube Integration** - Simply paste a YouTube URL to get started
- 🎭 **Multiple Characters** - Choose from pre-defined characters (Squidward, K-Pop Idol, Drake)
- 📱 **Real-time Progress** - Watch your cover being created with live updates
- 🖼️ **Gallery View** - Browse and enjoy all your created covers

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Vercel Serverless Functions
- **Database**: Vercel Postgres (via Prisma ORM)
- **File Storage**: Vercel Blob Storage
- **AI Processing**: Replicate API with webhooks
- **Real-time Updates**: Server-Sent Events (SSE)

## Architecture

This project uses a webhook-driven architecture to minimize compute costs:

1. User requests a cover → Create database record
2. Download YouTube audio → Trigger AI processing via Replicate
3. Replicate processes asynchronously → Calls webhook when done
4. Webhook triggers next step → Chain continues
5. Final video is stitched and stored → User is notified

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Prerequisites

- Node.js 18+ and npm
- Vercel account (for deployment)
- Replicate API key
- PostgreSQL database (Vercel Postgres recommended)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd voice-studio
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   - `POSTGRES_URL` - Your PostgreSQL connection string
   - `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
   - `REPLICATE_API_TOKEN` - Your Replicate API key
   - `WEBHOOK_SECRET` - Random string for webhook security
   - `NEXT_PUBLIC_APP_URL` - Your app URL (for webhooks)

4. **Set up the database**
   ```bash
   npm run setup
   ```
   
   This will:
   - Generate Prisma client
   - Push the database schema

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app.

## Local Development with Webhooks

For local development with Replicate webhooks, you'll need a public URL:

1. Install ngrok: `npm install -g ngrok`
2. Run ngrok: `ngrok http 3000`
3. Update `NEXT_PUBLIC_APP_URL` in `.env.local` with the ngrok URL

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

Vercel will automatically:
- Set up Vercel Postgres
- Configure Blob Storage
- Handle serverless functions

## Project Structure

```
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── api/          # API routes
│   │   │   ├── covers/   # Cover CRUD and streaming
│   │   │   └── webhooks/ # Replicate webhook handler
│   │   └── page.tsx      # Main app page
│   ├── components/       # React components
│   ├── lib/              # Utility functions
│   │   ├── pipeline.ts   # Processing pipeline
│   │   ├── storage.ts    # File storage utilities
│   │   └── youtube.ts    # YouTube downloader
│   └── types/            # TypeScript types
├── prisma/
│   └── schema.prisma     # Database schema
└── scripts/
    └── setup-db.js       # Database setup script
```

## Implementation Guide

See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) for code patterns and implementation details.

## Cost Analysis

For ~100 covers/month:
- **Vercel Hobby**: $0 (includes Postgres & Blob)
- **Replicate**: ~$20-50 (depending on model usage)
- **Total**: $20-50/month

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Database commands
npm run db:push      # Push schema changes
npm run db:generate  # Generate Prisma client

# Linting
npm run lint
```

## Troubleshooting

### FFmpeg Issues
The app includes `ffmpeg-static` for video processing. If you encounter issues:
- Ensure you have enough disk space for temporary files
- Check that the `/temp` directory is writable

### YouTube Download Errors
- Ensure the YouTube URL is valid and public
- Videos must be under 10 minutes
- Some regions may have restrictions

### Webhook Failures
- Verify `WEBHOOK_SECRET` matches in your code and Replicate
- Check Vercel function logs for webhook errors
- Ensure your app URL is publicly accessible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT