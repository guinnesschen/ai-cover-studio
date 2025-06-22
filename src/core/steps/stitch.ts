import { prisma } from '@/clients/prisma';
import { stitchVideoAudio } from '@/utils/ffmpeg';
import { uploadFile } from '@/clients/storage';

type CoverWithArtifacts = {
  id: string;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
};

export async function stitchFinal(cover: CoverWithArtifacts) {
  console.log(`Stitching final video for cover ${cover.id}`);
  
  const videoArtifact = cover.artifacts.find(a => a.type === 'video');
  const fullMixArtifact = cover.artifacts.find(a => a.type === 'vocals_full');
  const imageArtifact = cover.artifacts.find(a => a.type === 'image');
  
  if (!videoArtifact || !fullMixArtifact) {
    throw new Error('Required artifacts not found for stitching');
  }

  // Stitch video with full audio mix
  const finalVideoPath = await stitchVideoAudio(
    videoArtifact.url,
    fullMixArtifact.url,
    cover.id
  );

  // Upload final video
  const finalVideoUrl = await uploadFile(finalVideoPath, `${cover.id}/final.mp4`);

  // Use the generated image as thumbnail (or the first frame of video)
  const thumbnailUrl = imageArtifact?.url || finalVideoUrl;

  // Update cover with final outputs
  await prisma.cover.update({
    where: { id: cover.id },
    data: {
      status: 'completed',
      progress: 100,
      videoUrl: finalVideoUrl,
      thumbnailUrl,
      completedAt: new Date(),
    },
  });

  console.log(`Cover ${cover.id} completed successfully!`);
}