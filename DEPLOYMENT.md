# Deployment Guide

This project is split into two parts:
1. **Main App** (Next.js) - Deploy to Vercel
2. **Processing Service** (Express.js) - Deploy to Render/Railway/Fly.io

## Quick Setup (5 minutes)

### Step 1: Deploy Processing Service

1. **Push to GitHub**: Commit and push the `processing-service` folder to a new GitHub repo
2. **Deploy to Render**:
   - Go to [render.com](https://render.com) and sign up
   - Click "New Web Service"
   - Connect your GitHub repo
   - Select the `processing-service` folder as the root directory
   - Click "Deploy"
   - Copy the service URL (e.g., `https://your-service.onrender.com`)

### Step 2: Configure Main App

1. **Set Environment Variable**:
   - In your Vercel project settings
   - Add environment variable: `PROCESSING_SERVICE_URL=https://your-service.onrender.com`

2. **Deploy Main App**:
   - Push your changes to GitHub
   - Vercel will auto-deploy

That's it! 🎉

## Alternative Services

### Railway (Also free)
1. Go to [railway.app](https://railway.app)
2. "Deploy from GitHub" → Select your repo → `processing-service` folder
3. Deploy and copy the URL

### Fly.io (Free tier)
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. `cd processing-service && fly launch`
3. Follow the prompts and copy the URL

## Testing

Once deployed, your YouTube downloads will automatically use the processing service instead of local processing. No code changes needed!

## Troubleshooting

- **Service not responding**: Check the processing service logs in Render/Railway
- **CORS errors**: The processing service includes CORS middleware
- **Build failures**: Make sure the `processing-service` folder is at the root of your repo

## Benefits of This Setup

✅ **YouTube downloads work reliably** (no Vercel limitations)  
✅ **Video processing works** (real FFmpeg instead of WASM)  
✅ **Free hosting** (Render/Railway free tiers)  
✅ **Auto-scaling** (services wake up when needed)  
✅ **Simple maintenance** (separate deployments)