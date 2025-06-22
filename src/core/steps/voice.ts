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
  
  // Create voice cloning prediction (full mix) - using version parameter that works
  const prediction = await replicate!.predictions.create({
    version: '0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550',
    input: {
      protect: 0.33,
      rvc_model: useCustomVoiceModel ? 'CUSTOM' : 'Squidward',
      ...(useCustomVoiceModel && { custom_rvc_model_download_url: character!.voiceModelUrl! }),
      index_rate: 0.5,
      song_input: audioArtifact.url,
      reverb_size: 0.15,
      pitch_change: 'no-change',
      rms_mix_rate: 0.25,
      filter_radius: 3,
      output_format: 'mp3',
      reverb_damping: 0.7,
      reverb_dryness: 0.8,
      reverb_wetness: 0.2,
      crepe_hop_length: 128,
      pitch_change_all: 0,
      main_vocals_volume_change: 0,
      pitch_detection_algorithm: 'rmvpe',
      instrumental_volume_change: 0,
      backup_vocals_volume_change: 0,
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
  
  // Create voice cloning prediction (isolated vocals) - using version parameter that works
  const prediction = await replicate!.predictions.create({
    version: '0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550',
    input: {
      protect: 0.33,
      rvc_model: useCustomVoiceModel ? 'CUSTOM' : 'Squidward',
      ...(useCustomVoiceModel && { custom_rvc_model_download_url: character!.voiceModelUrl! }),
      index_rate: 0.5,
      song_input: audioArtifact.url,
      reverb_size: 0.15,
      pitch_change: 'no-change',
      rms_mix_rate: 0.25,
      filter_radius: 3,
      output_format: 'mp3',
      reverb_damping: 0.7,
      reverb_dryness: 0.8,
      reverb_wetness: 0.2,
      crepe_hop_length: 128,
      pitch_change_all: 0,
      main_vocals_volume_change: 0,
      pitch_detection_algorithm: 'rmvpe',
      instrumental_volume_change: -20, // Heavily reduce instrumentals for isolation
      backup_vocals_volume_change: -10, // Reduce backup vocals for isolation
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