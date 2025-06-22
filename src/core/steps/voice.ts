import { prisma } from '@/clients/prisma';
import { replicate, getWebhookUrl, isReplicateConfigured } from '@/clients/replicate';
import { getCharacterById } from '@/data/characters';

type CoverWithArtifacts = {
  id: string;
  character: string;
  artifacts: Array<{ id: string; type: string; url: string; metadata?: unknown }>;
};

export async function cloneVoiceFull(cover: CoverWithArtifacts) {
  console.log(`Cloning voice (full mix) for cover ${cover.id}`);
  
  if (!isReplicateConfigured()) {
    throw new Error('Replicate is not configured');
  }

  // const character = getCharacterById(cover.character); // TODO: Use custom voice model when available
  const audioArtifact = cover.artifacts.find(a => a.type === 'audio');
  
  if (!audioArtifact) {
    throw new Error('Audio artifact not found');
  }

  const webhookUrl = getWebhookUrl();

  // Get character data for voice model configuration
  const character = getCharacterById(cover.character);
  const useCustomVoiceModel = character?.voiceModelUrl && character.voiceModelUrl.trim() !== '';
  
  // Create voice cloning prediction (full mix)
  const prediction = await replicate!.predictions.create({
    model: 'zsxkib/realistic-voice-cloning',
    input: {
      song_input: audioArtifact.url,
      rvc_model: useCustomVoiceModel ? 'CUSTOM' : 'Squidward',
      ...(useCustomVoiceModel && { custom_rvc_model_download_url: character!.voiceModelUrl! }),
      pitch_change: 'no-change',
      index_rate: 1, // Per docs example, use 1 for full accent retention
      filter_radius: 3,
      rms_mix_rate: 0.8, // Per docs example, 0.8 is recommended
      pitch_detection_algorithm: 'rmvpe', // Docs recommend 'rmvpe' for clarity
      crepe_hop_length: 128,
      protect: 0.5, // Per docs, 0.5 is default/recommended
      main_vocals_volume_change: 0,
      backup_vocals_volume_change: 0,
      instrumental_volume_change: 0,
      pitch_change_all: 0,
      reverb_size: 0.6, // Per docs example
      reverb_wetness: 0.3, // Per docs example
      reverb_dryness: 0.8, // Per docs example
      reverb_damping: 0.7, // Per docs example
      output_format: 'mp3',
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  // Store prediction ID
  await prisma.artifact.create({
    data: {
      coverId: cover.id,
      type: 'vocals_full',
      url: '',
      replicateId: prediction.id,
    },
  });

  console.log('Voice cloning (full) started');
}

export async function cloneVoiceIsolated(cover: CoverWithArtifacts) {
  console.log(`Cloning voice (isolated) for cover ${cover.id}`);
  
  if (!isReplicateConfigured()) {
    throw new Error('Replicate is not configured');
  }

  // const character = getCharacterById(cover.character); // TODO: Use custom voice model when available
  const audioArtifact = cover.artifacts.find(a => a.type === 'audio');
  
  if (!audioArtifact) {
    throw new Error('Audio artifact not found');
  }

  const webhookUrl = getWebhookUrl();

  // Get character data for voice model configuration
  const character = getCharacterById(cover.character);
  const useCustomVoiceModel = character?.voiceModelUrl && character.voiceModelUrl.trim() !== '';
  
  // Create voice cloning prediction (isolated vocals)
  const prediction = await replicate!.predictions.create({
    model: 'zsxkib/realistic-voice-cloning',
    input: {
      song_input: audioArtifact.url,
      rvc_model: useCustomVoiceModel ? 'CUSTOM' : 'Squidward',
      ...(useCustomVoiceModel && { custom_rvc_model_download_url: character!.voiceModelUrl! }),
      pitch_change: 'no-change',
      index_rate: 1, // Per docs example, use 1 for full accent retention
      filter_radius: 3,
      rms_mix_rate: 0.8, // Per docs example, 0.8 is recommended
      pitch_detection_algorithm: 'rmvpe', // Docs recommend 'rmvpe' for clarity
      crepe_hop_length: 128,
      protect: 0.5, // Per docs, 0.5 is default/recommended
      main_vocals_volume_change: 0,
      backup_vocals_volume_change: -10, // Per docs example, reduce backup vocals
      instrumental_volume_change: -20, // Heavily reduce instrumentals for isolation
      pitch_change_all: 0,
      reverb_size: 0.6, // Per docs example
      reverb_wetness: 0.3, // Per docs example
      reverb_dryness: 0.8, // Per docs example
      reverb_damping: 0.7, // Per docs example
      output_format: 'mp3',
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  // Store prediction ID
  await prisma.artifact.create({
    data: {
      coverId: cover.id,
      type: 'vocals_isolated',
      url: '',
      replicateId: prediction.id,
    },
  });

  console.log('Voice cloning (isolated) started');
}