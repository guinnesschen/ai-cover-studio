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
  console.log(`[Image] Starting image generation for cover ${cover.id}`);
  
  try {
    if (!isReplicateConfigured()) {
      throw new Error('Replicate is not configured - missing API token');
    }

    const character = getCharacterById(cover.character);
    if (!character) {
      throw new Error(`Character not found: ${cover.character}`);
    }
    
    const webhookUrl = getWebhookUrl();
    console.log(`[Image] Using character: ${character.name}, webhook: ${webhookUrl}`);

    // Create image generation prediction
    const prompt = cover.imagePrompt || 
      `${character.name} performing on stage, professional portrait, dramatic lighting`;

    // Use custom finetune if available, otherwise fallback to basic Flux
    const useCustomFinetune = character.fluxFineTuneId && character.fluxFineTuneId.trim() !== '';
    const model = useCustomFinetune ? 'black-forest-labs/flux-pro-finetuned' : 'black-forest-labs/flux-schnell';
    
    console.log(`[Image] Generating with model: ${model}, prompt: "${prompt}"`);
    
    const prediction = await replicate!.predictions.create({
      model,
      input: useCustomFinetune ? {
        prompt,
        finetune_id: character.fluxFineTuneId!,
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

    console.log(`[Image] Replicate prediction created: ${prediction.id}`);

    // Store prediction ID for webhook correlation
    await prisma.artifact.create({
      data: {
        coverId: cover.id,
        type: 'image',
        url: '', // Will be updated by webhook
        replicateId: prediction.id,
      },
    });

    console.log(`[Image] Image generation started for cover ${cover.id}`);
    
  } catch (error) {
    console.error(`[Image] Failed for cover ${cover.id}:`, {
      error: error instanceof Error ? error.message : error,
      character: cover.character,
      hasImagePrompt: !!cover.imagePrompt,
      timestamp: new Date().toISOString()
    });
    
    throw error; // Re-throw to trigger pipeline error handling
  }
}