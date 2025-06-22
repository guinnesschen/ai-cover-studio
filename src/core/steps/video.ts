import { prisma } from '@/clients/prisma';
import { replicate, getWebhookUrl, isReplicateConfigured } from '@/clients/replicate';

type CoverWithArtifacts = {
  id: string;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
};

export async function generateVideo(cover: CoverWithArtifacts) {
  console.log(`Generating video for cover ${cover.id}`);
  
  if (!isReplicateConfigured()) {
    throw new Error('Replicate is not configured');
  }

  const imageArtifact = cover.artifacts.find(a => a.type === 'image');
  const vocalsArtifact = cover.artifacts.find(a => a.type === 'vocals_isolated');
  
  if (!imageArtifact || !vocalsArtifact) {
    throw new Error('Required artifacts not found for video generation');
  }

  const webhookUrl = getWebhookUrl();

  // Create video generation prediction
  const prediction = await replicate!.predictions.create({
    model: 'cjwbw/sadtalker',
    version: 'a519444a7cf00483017a1d0135402ed84e2c40d86aee96f94f0cf99315bb41f8',
    input: {
      source_image: imageArtifact.url,
      driven_audio: vocalsArtifact.url,
      preprocess: 'crop',
      still: false,
      expression_scale: 1,
      pose_style: 0,
      result_format: '.mp4',
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  // Store prediction ID
  await prisma.artifact.create({
    data: {
      coverId: cover.id,
      type: 'video',
      url: '',
      replicateId: prediction.id,
    },
  });

  // Update progress
  await prisma.cover.update({
    where: { id: cover.id },
    data: {
      status: 'generating_video',
      progress: 85,
    },
  });
}