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

  // Use custom finetune if available, otherwise fallback to basic Flux
  const useCustomFinetune = character?.fluxFineTuneId && character.fluxFineTuneId.trim() !== '';
  
  const prediction = await replicate!.predictions.create({
    model: useCustomFinetune ? 'black-forest-labs/flux-pro-finetuned' : 'black-forest-labs/flux-schnell',
    input: useCustomFinetune ? {
      prompt,
      finetune_id: character!.fluxFineTuneId!,
      finetune_strength: 1,
      aspect_ratio: '1:1',
      steps: 40,
      guidance: 3,
      safety_tolerance: 2,
      output_format: 'jpg'
    } : {
      prompt,
      aspect_ratio: '1:1',
      num_outputs: 1,
      output_format: 'jpg',
      output_quality: 80
    },
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