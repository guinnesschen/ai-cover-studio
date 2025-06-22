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

  // Update cover metadata
  await prisma.cover.update({
    where: { id: cover.id },
    data: {
      progress: 20,
      title: cover.title || `Cover ${new Date().toLocaleDateString()}`,
      artist: cover.artist || 'Unknown Artist',
    },
  });

  // Trigger voice cloning tasks in parallel
  const { processNextStep } = await import('@/core/pipeline');
  
  // Start voice cloning (both full and isolated) in parallel
  // Note: image generation is already started in parallel with download
  await Promise.all([
    processNextStep(cover.id, 'cloning_voice_full'),
    processNextStep(cover.id, 'cloning_voice_isolated'),
  ]);
}