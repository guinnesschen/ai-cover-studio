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

  // Create video generation prediction using Sonic model
  const prediction = await replicate!.predictions.create({
    model: 'zsxkib/sonic',
    input: {
      image: imageArtifact.url,
      audio: vocalsArtifact.url,
      dynamic_scale: 1,
      min_resolution: 512,
      inference_steps: 25,
      keep_resolution: false,
      seed: 42,
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

  console.log('Video generation started');
}