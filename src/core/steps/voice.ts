import { prisma } from '@/clients/prisma';
import { replicate, getWebhookUrl, isReplicateConfigured } from '@/clients/replicate';
// import { getCharacterById } from '@/data/characters'; // TODO: Use when custom voice models are available

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

  // Create voice cloning prediction (full mix)
  const prediction = await replicate!.predictions.create({
    model: 'zsxkib/realistic-voice-cloning',
    version: '0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550',
    input: {
      song_input: audioArtifact.url,
      rvc_model: 'Squidward',
      pitch_change: 'no-change',
      index_rate: 0.5,
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

  // Store prediction ID
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

  // Create voice cloning prediction (isolated vocals)
  const prediction = await replicate!.predictions.create({
    model: 'zsxkib/realistic-voice-cloning',
    version: '0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550',
    input: {
      song_input: audioArtifact.url,
      rvc_model: 'Squidward',
      pitch_change: 'no-change',
      index_rate: 0.5,
      filter_radius: 3,
      rms_mix_rate: 0.25,
      pitch_detection_algorithm: 'rmvpe',
      crepe_hop_length: 128,
      protect: 0.33,
      main_vocals_volume_change: 0,
      backup_vocals_volume_change: -20,
      instrumental_volume_change: -20,
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

  // Store prediction ID
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