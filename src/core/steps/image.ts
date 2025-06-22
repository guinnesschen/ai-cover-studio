import { prisma } from '@/clients/prisma';
import { replicate, getWebhookUrl, isReplicateConfigured } from '@/clients/replicate';

type CoverWithArtifacts = {
  id: string;
  imagePrompt?: string | null;
  character: string;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
};

export async function generateImage(cover: CoverWithArtifacts) {
  const startTime = Date.now();
  console.log(`[IMAGE STEP] 🖼️ Starting image generation - START`, {
    coverId: cover.id,
    character: cover.character,
    hasImagePrompt: !!cover.imagePrompt,
    timestamp: new Date().toISOString()
  });
  
  try {
    console.log(`[IMAGE STEP] 🔧 Checking Replicate configuration...`);
    if (!isReplicateConfigured()) {
      console.error(`[IMAGE STEP] ❌ Replicate not configured - missing API token`);
      throw new Error('Replicate is not configured - missing API token');
    }
    console.log(`[IMAGE STEP] ✅ Replicate configuration verified`);
    
    console.log(`[IMAGE STEP] 🌐 Getting webhook URL...`);
    const webhookUrl = getWebhookUrl();
    console.log(`[IMAGE STEP] ✅ Webhook URL obtained`, { webhookUrl });

    // Use user's prompt, or simple fallback
    const prompt = cover.imagePrompt || 'a professional portrait, dramatic lighting';
    const model = 'black-forest-labs/flux-schnell';
    
    const predictionConfig = {
      prompt,
      aspect_ratio: '1:1',
      num_outputs: 1,
      output_format: 'jpg',
      output_quality: 80
    };

    console.log(`[IMAGE STEP] 🚀 Creating Replicate prediction...`, {
      model,
      prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      webhookUrl,
      config: predictionConfig
    });
    
    const prediction = await replicate!.predictions.create({
      model,
      input: predictionConfig,
      webhook: webhookUrl,
      webhook_events_filter: ['completed'],
    });

    const predictionTime = Date.now() - startTime;
    console.log(`[IMAGE STEP] ✅ Replicate prediction created successfully`, {
      predictionId: prediction.id,
      predictionTime: `${predictionTime}ms`,
      status: prediction.status,
      model,
      webhookUrl,
      webhookEvents: ['completed']
    });

    console.log(`[IMAGE STEP] 💾 Storing artifact record in database...`);
    const artifact = await prisma.artifact.create({
      data: {
        coverId: cover.id,
        type: 'image',
        url: '', // Will be updated by webhook
        replicateId: prediction.id,
      },
    });

    const totalTime = Date.now() - startTime;
    console.log(`[IMAGE STEP] ✅ Image generation initiated successfully`, {
      coverId: cover.id,
      predictionId: prediction.id,
      artifactId: artifact.id,
      totalTime: `${totalTime}ms`,
      nextStep: 'waiting_for_webhook',
      webhookUrl,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[IMAGE STEP] ❌ IMAGE GENERATION FAILED`, {
      coverId: cover.id,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      hasImagePrompt: !!cover.imagePrompt,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString(),
      replicateConfigured: isReplicateConfigured(),
      webhookUrl: (() => {
        try {
          return getWebhookUrl();
        } catch (e) {
          return `Error getting webhook URL: ${e instanceof Error ? e.message : e}`;
        }
      })()
    });
    
    throw error; // Re-throw to trigger pipeline error handling
  }
}