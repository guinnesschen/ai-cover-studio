# Local Development Setup

## Prerequisites

You need PostgreSQL installed on your machine.

### Install PostgreSQL with Docker (Recommended)
```bash
# Start PostgreSQL with Docker
docker run --name ai-coverlab-postgres \
  -e POSTGRES_USER=ai_coverlab \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=ai_coverlab_dev \
  -p 5432:5432 \
  -d postgres:15
```

## Setup Steps

1. **Update your `.env.local` file** with your Vercel Blob token:
   - Go to your Vercel project settings
   - Copy the `BLOB_READ_WRITE_TOKEN` value
   - Replace `"your-blob-token-here"` in `.env.local`

2. **Push the database schema**:
   ```bash
   npm run db:push
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

## Useful Commands

- `npm run db:push` - Apply schema changes to database
- `npm run db:reset` - Reset database (⚠️ deletes all data)
- `npm run db:generate` - Regenerate Prisma client

## Troubleshooting

### Connection Issues
- Ensure PostgreSQL is running: `pg_isready -h localhost -p 5432`
- For Docker: `docker logs ai-coverlab-postgres`
- Try connecting manually: `psql postgresql://ai_coverlab:dev_password@localhost:5432/ai_coverlab_dev`