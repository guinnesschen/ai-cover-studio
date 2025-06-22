import { prisma } from '@/clients/prisma';
import { replicate, getWebhookUrl, isReplicateConfigured } from '@/clients/replicate';
import { getCharacterById } from '@/data/characters';

type CoverWithArtifacts = {
  id: string;
  imagePrompt?: string | null;
  character: string;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
};

export async function generateImage(cover: CoverWithArtifacts) {
  console.log(`Generating image for cover ${cover.id}`);
  
  if (!isReplicateConfigured()) {
    throw new Error('Replicate is not configured');
  }

  const character = getCharacterById(cover.character);
  const webhookUrl = getWebhookUrl();

  // Create image generation prediction
  const prompt = cover.imagePrompt || 
    `${character?.name || cover.character} performing on stage, professional portrait, dramatic lighting`;

  const prediction = await replicate!.predictions.create({
    model: 'black-forest-labs/flux-schnell',
    input: { prompt },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  // Store prediction ID for webhook correlation
  await prisma.artifact.create({
    data: {
      coverId: cover.id,
      type: 'image',
      url: '', // Will be updated by webhook
      replicateId: prediction.id,
    },
  });

  console.log('Image generation started');
}