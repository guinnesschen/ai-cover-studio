import Replicate from 'replicate';
import { prisma } from '@/lib/prisma';
import { downloadYouTubeAudio } from './youtube';
import { stitchVideoAudio } from './ffmpeg';
import { uploadFile } from './storage';
import { getCharacterById } from './characters';
import { CoverStatus } from '@/types';

const replicate = process.env.REPLICATE_API_TOKEN 
  ? new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })
  : null;

// Get webhook URL from environment
const getWebhookUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
  return `${baseUrl}/api/webhooks/replicate`;
};

export async function processNextStep(coverId: string) {
  try {
    const cover = await prisma.cover.findUnique({
      where: { id: coverId },
      include: { artifacts: true },
    });

    if (!cover) {
      console.error('Cover not found:', coverId);
      return;
    }

    console.log(`Processing cover ${coverId} - Current status: ${cover.status}`);

    switch (cover.status as CoverStatus) {
      case 'downloading':
        await handleDownloadAudio(cover);
        break;
      
      case 'generating_image':
        await handleGenerateImage(cover);
        break;
      
      case 'cloning_voice_full':
        await handleCloneVoiceFull(cover);
        break;
      
      case 'cloning_voice_isolated':
        await handleCloneVoiceIsolated(cover);
        break;
      
      case 'generating_video':
        await handleGenerateVideo(cover);
        break;
      
      case 'stitching':
        await handleStitchFinal(cover);
        break;
      
      case 'completed':
      case 'failed':
        // Nothing to do
        break;
      
      default:
        console.warn(`Unknown status: ${cover.status}`);
    }
  } catch (error) {
    console.error(`Error processing cover ${coverId}:`, error);
    await prisma.cover.update({
      where: { id: coverId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Processing failed',
      },
    });
  }
}

async function handleDownloadAudio(cover: {
  id: string;
  youtubeUrl: string;
  title?: string | null;
  artist?: string | null;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
}) {
  // Download audio (synchronous - it's fast enough)
  const audioPath = await downloadYouTubeAudio(cover.youtubeUrl, cover.id);
  const audioUrl = await uploadFile(audioPath, `${cover.id}/audio.mp3`);
  
  // Extract video title for metadata
  // For now, we'll use a placeholder - you could enhance this with ytdl info
  const title = `Cover ${new Date().toLocaleDateString()}`;
  
  // Save audio artifact
  await prisma.artifact.create({
    data: {
      coverId: cover.id,
      type: 'audio',
      url: audioUrl,
      metadata: { originalPath: audioPath },
    },
  });

  // Update cover status and metadata
  await prisma.cover.update({
    where: { id: cover.id },
    data: {
      status: 'generating_image',
      progress: 20,
      title,
    },
  });

  // If no Replicate API, simulate the rest
  if (!replicate) {
    await simulatePipeline(cover.id);
    return;
  }

  // Process next step
  await processNextStep(cover.id);
}

async function handleGenerateImage(cover: {
  id: string;
  imagePrompt?: string | null;
  character: string;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
}) {
  const characterData = getCharacterById(cover.character);
  const webhookUrl = getWebhookUrl();
  
  // Generate image prompt
  const imagePrompt = cover.imagePrompt || 
    `${characterData?.name || cover.character} performing on stage, close-up portrait, professional lighting, high quality`;
  
  // Create Replicate prediction
  const prediction = await replicate!.predictions.create({
    model: 'black-forest-labs/flux-schnell',
    version: '131d9e185621b4b4d349fd262e363420a6f74081d8c27966c9c5bcf120fa3985',
    input: {
      prompt: imagePrompt,
      num_outputs: 1,
      aspect_ratio: '1:1',
      output_format: 'jpg',
      output_quality: 90,
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  // Create placeholder artifact with Replicate ID
  await prisma.artifact.create({
    data: {
      coverId: cover.id,
      type: 'image',
      url: '', // Will be updated by webhook
      replicateId: prediction.id,
    },
  });

  // Update progress
  await prisma.cover.update({
    where: { id: cover.id },
    data: {
      status: 'generating_image',
      progress: 30,
    },
  });
}

async function handleCloneVoiceFull(cover: {
  id: string;
  character: string;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
}) {
  const characterData = getCharacterById(cover.character);
  const audioArtifact = cover.artifacts.find((a) => a.type === 'audio');
  
  if (!audioArtifact) {
    throw new Error('Audio artifact not found');
  }

  const webhookUrl = getWebhookUrl();
  
  // Create voice cloning prediction (full mix)
  const prediction = await replicate!.predictions.create({
    model: 'zsxkib/realistic-voice-cloning',
    version: '0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550',
    input: {
      input_audio: audioArtifact.url,
      rvc_model: characterData?.voiceModelUrl ? 'CUSTOM' : 'Squidward',
      custom_rvc_model_download_url: characterData?.voiceModelUrl,
      pitch_change: 'no-change',
      index_rate: 0.6,
      filter_radius: 3,
      rms_mix_rate: 0.25,
      pitch_detection_algorithm: 'rmvpe',
      crepe_hop_length: 128,
      protect: 0.33,
      main_vocals_volume_change: 0,
      backup_vocals_volume_change: 0,
      instrumental_volume_change: 0,
      pitch_change_all: 0,
      reverb_size: 0.15,
      reverb_wetness: 0.2,
      reverb_dryness: 0.8,
      reverb_damping: 0.7,
      output_format: 'mp3',
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  // Create placeholder artifact
  await prisma.artifact.create({
    data: {
      coverId: cover.id,
      type: 'vocals_full',
      url: '',
      replicateId: prediction.id,
    },
  });

  // Update progress
  await prisma.cover.update({
    where: { id: cover.id },
    data: {
      status: 'cloning_voice_full',
      progress: 50,
    },
  });
}

async function handleCloneVoiceIsolated(cover: {
  id: string;
  character: string;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
}) {
  const characterData = getCharacterById(cover.character);
  const audioArtifact = cover.artifacts.find((a) => a.type === 'audio');
  
  if (!audioArtifact) {
    throw new Error('Audio artifact not found');
  }

  const webhookUrl = getWebhookUrl();
  
  // Create voice cloning prediction (isolated vocals)
  const prediction = await replicate!.predictions.create({
    model: 'zsxkib/realistic-voice-cloning',
    version: '0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550',
    input: {
      input_audio: audioArtifact.url,
      rvc_model: characterData?.voiceModelUrl ? 'CUSTOM' : 'Squidward',
      custom_rvc_model_download_url: characterData?.voiceModelUrl,
      pitch_change: 'no-change',
      index_rate: 0.6,
      filter_radius: 3,
      rms_mix_rate: 0.25,
      pitch_detection_algorithm: 'rmvpe',
      crepe_hop_length: 128,
      protect: 0.33,
      main_vocals_volume_change: 0,
      backup_vocals_volume_change: -20,
      instrumental_volume_change: -50, // Significantly reduce instrumental
      pitch_change_all: 0,
      reverb_size: 0.15,
      reverb_wetness: 0.2,
      reverb_dryness: 0.8,
      reverb_damping: 0.7,
      output_format: 'mp3',
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  // Create placeholder artifact
  await prisma.artifact.create({
    data: {
      coverId: cover.id,
      type: 'vocals_isolated',
      url: '',
      replicateId: prediction.id,
    },
  });

  // Update progress
  await prisma.cover.update({
    where: { id: cover.id },
    data: {
      status: 'cloning_voice_isolated',
      progress: 70,
    },
  });
}

async function handleGenerateVideo(cover: {
  id: string;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
}) {
  const imageArtifact = cover.artifacts.find((a) => a.type === 'image');
  const vocalsArtifact = cover.artifacts.find((a) => a.type === 'vocals_isolated');
  
  if (!imageArtifact || !vocalsArtifact) {
    throw new Error('Required artifacts not found');
  }

  const webhookUrl = getWebhookUrl();
  
  // Generate video with Sonic
  const prediction = await replicate!.predictions.create({
    model: 'zsxkib/sonic',
    version: 'a2aad29ea95f19747a5ea22ab14fc6594654506e5815f7f5ba4293e888d3e20f',
    input: {
      image: imageArtifact.url,
      audio: vocalsArtifact.url,
      dynamic_scale: 1,
      min_resolution: 512,
      inference_steps: 25,
      keep_resolution: false,
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  // Create placeholder artifact
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

async function handleStitchFinal(cover: {
  id: string;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
}) {
  const videoArtifact = cover.artifacts.find((a) => a.type === 'video');
  const fullMixArtifact = cover.artifacts.find((a) => a.type === 'vocals_full');
  const imageArtifact = cover.artifacts.find((a) => a.type === 'image');
  
  if (!videoArtifact || !fullMixArtifact) {
    throw new Error('Required artifacts not found for stitching');
  }

  // Stitch video with full audio mix
  const finalVideoPath = await stitchVideoAudio(
    videoArtifact.url,
    fullMixArtifact.url,
    cover.id
  );
  
  const finalVideoUrl = await uploadFile(finalVideoPath, `${cover.id}/final.mp4`);
  
  // Update cover with final results
  await prisma.cover.update({
    where: { id: cover.id },
    data: {
      status: 'completed',
      progress: 100,
      videoUrl: finalVideoUrl,
      thumbnailUrl: imageArtifact?.url || null,
      completedAt: new Date(),
    },
  });
}

// Simulation for when Replicate API is not configured
async function simulatePipeline(coverId: string) {
  const steps = [
    { status: 'generating_image', progress: 30, delay: 2000 },
    { status: 'cloning_voice_full', progress: 50, delay: 2000 },
    { status: 'cloning_voice_isolated', progress: 70, delay: 2000 },
    { status: 'generating_video', progress: 85, delay: 2000 },
    { status: 'stitching', progress: 95, delay: 2000 },
  ];

  for (const step of steps) {
    await new Promise(resolve => setTimeout(resolve, step.delay));
    await prisma.cover.update({
      where: { id: coverId },
      data: {
        status: step.status,
        progress: step.progress,
      },
    });
  }

  // Complete with placeholder
  await prisma.cover.update({
    where: { id: coverId },
    data: {
      status: 'completed',
      progress: 100,
      videoUrl: '/placeholder.mp4',
      thumbnailUrl: '/placeholder.jpg',
      completedAt: new Date(),
    },
  });
}