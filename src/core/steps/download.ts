import { prisma } from '@/clients/prisma';
import { downloadYouTubeAudio } from '@/utils/youtube';
import { uploadFile } from '@/clients/storage';

type CoverWithArtifacts = {
  id: string;
  youtubeUrl: string;
  title?: string | null;
  artist?: string | null;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
};

export async function downloadAudio(cover: CoverWithArtifacts) {
  console.log(`Downloading audio for cover ${cover.id}`);
  
  // Download audio from YouTube
  const audioPath = await downloadYouTubeAudio(cover.youtubeUrl, cover.id);
  
  // Upload to storage
  const audioUrl = await uploadFile(audioPath, `${cover.id}/audio.mp3`);
  
  // Save audio artifact
  await prisma.artifact.create({
    data: {
      coverId: cover.id,
      type: 'audio',
      url: audioUrl,
    },
  });

  // Update cover status to trigger next step
  await prisma.cover.update({
    where: { id: cover.id },
    data: {
      status: 'generating_image',
      progress: 20,
      title: cover.title || `Cover ${new Date().toLocaleDateString()}`,
      artist: cover.artist || 'Unknown Artist',
    },
  });

  // Continue to next step
  const { processNextStep } = await import('@/core/pipeline');
  await processNextStep(cover.id);
}