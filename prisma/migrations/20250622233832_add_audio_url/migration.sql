-- AlterTable
ALTER TABLE "covers" ADD COLUMN "audio_url" TEXT;

-- Make youtube_url optional
ALTER TABLE "covers" ALTER COLUMN "youtube_url" DROP NOT NULL;