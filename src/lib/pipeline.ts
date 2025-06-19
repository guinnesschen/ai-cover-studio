import Replicate from 'replicate';
import { jobStore } from './jobs';
import { downloadYouTubeAudio } from './youtube';
import { stitchVideoAudio } from './ffmpeg';
import { uploadFile } from './storage';
import { getCharacterById } from './characters';

const replicate = process.env.REPLICATE_API_TOKEN 
  ? new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })
  : null;

export async function processJob(jobId: string) {
  const job = jobStore.get(jobId);
  if (!job || !job.data) throw new Error('Job not found');

  const { youtubeUrl, character, imagePrompt } = job.data;
  const characterData = getCharacterById(character);

  // Check if Replicate is configured
  if (!replicate) {
    // For demo purposes, simulate the pipeline
    await simulatePipeline(jobId, { youtubeUrl, character, imagePrompt: imagePrompt || '' });
    return;
  }

  try {
    // Update status
    jobStore.update(jobId, { status: 'processing', progress: 5, message: 'Starting...' });

    // Step 1: Download YouTube audio
    jobStore.update(jobId, { progress: 10, message: 'Downloading audio...' });
    const audioPath = await downloadYouTubeAudio(youtubeUrl, jobId);
    const audioUrl = await uploadFile(audioPath, `${jobId}_input.mp3`);

    // Step 2: Run voice cloning (full mix)
    jobStore.update(jobId, { progress: 20, message: 'Fine-tuning vocals...' });
    const fullMixOutput = await replicate.run(
      "zsxkib/realistic-voice-cloning:668a4fec05a887143e5fe8d45df25ec4c794dd43169b9a11562309b2d45873b0",
      {
        input: {
          song_input: audioUrl,
          rvc_model: characterData?.voiceModelUrl ? "CUSTOM" : "Squidward",
          custom_rvc_model_download_url: characterData?.voiceModelUrl,
          pitch_change: "no-change",
          index_rate: 0.6,
          filter_radius: 3,
          rms_mix_rate: 0.25,
          pitch_detection_algorithm: "rmvpe",
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
          output_format: "mp3",
        }
      }
    ) as unknown as string;

    // Step 3: Run voice cloning (isolated vocals)
    jobStore.update(jobId, { progress: 40, message: 'Isolating vocals...' });
    const isolatedVoxOutput = await replicate.run(
      "zsxkib/realistic-voice-cloning:668a4fec05a887143e5fe8d45df25ec4c794dd43169b9a11562309b2d45873b0",
      {
        input: {
          song_input: audioUrl,
          rvc_model: characterData?.voiceModelUrl ? "CUSTOM" : "Squidward",
          custom_rvc_model_download_url: characterData?.voiceModelUrl,
          pitch_change: "no-change",
          index_rate: 0.6,
          filter_radius: 3,
          rms_mix_rate: 0.25,
          pitch_detection_algorithm: "rmvpe",
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
          output_format: "mp3",
        }
      }
    ) as unknown as string;

    // Step 4: Generate still image
    jobStore.update(jobId, { progress: 60, message: 'Sketching the perfect frame...' });
    
    // For MVP, using a default prompt since we don't have fine-tuned models
    const defaultPrompt = imagePrompt || `${characterData?.name || character} performing on stage`;
    const fullPrompt = `close-up portrait of ${defaultPrompt}, professional lighting, high quality`;
    
    const stillOutput = await replicate.run(
      "black-forest-labs/flux-schnell:bf53bdb9790c8a042a21c9fe0e88f0496a67f69f7a8b260b48ec25d2e005e04f",
      {
        input: {
          prompt: fullPrompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "jpg",
          output_quality: 90,
        }
      }
    ) as unknown as string[];

    // Step 5: Generate video with Sonic
    jobStore.update(jobId, { progress: 80, message: 'Bringing your vision to life...' });
    const videoOutput = await replicate.run(
      "zsxkib/sonic:97851dcaeee2b52e5e0bda1c913fabb32cb1c8c07b7966fc77e5bd83e8e2c30e",
      {
        input: {
          image: stillOutput[0],
          audio: isolatedVoxOutput,
          dynamic_scale: 1,
          min_resolution: 512,
          inference_steps: 25,
          keep_resolution: false,
        }
      }
    ) as unknown as string;

    // Step 6: Stitch video with full audio
    jobStore.update(jobId, { progress: 90, message: 'Almost ready—just a moment...' });
    const finalVideoPath = await stitchVideoAudio(videoOutput, fullMixOutput, jobId);
    const finalVideoUrl = await uploadFile(finalVideoPath, `${jobId}_final.mp4`);

    // Extract title from YouTube (for MVP, using a simple title)
    const title = `Cover ${new Date().toLocaleDateString()}`;

    // Complete job
    jobStore.update(jobId, {
      status: 'completed',
      progress: 100,
      outputUrl: finalVideoUrl,
      title,
      character,
      message: 'Your cover is ready!',
    });

  } catch (error) {
    console.error('Pipeline error:', error);
    jobStore.update(jobId, {
      status: 'error',
      error: error instanceof Error ? error.message : 'Processing failed',
    });
    throw error;
  }
}

// Simulation function for demo when Replicate API is not configured
async function simulatePipeline(
  jobId: string,
  data: { youtubeUrl: string; character: string; imagePrompt: string }
) {
  const messages = [
    { progress: 10, message: 'Downloading audio...' },
    { progress: 25, message: 'Fine-tuning vocals...' },
    { progress: 40, message: 'Isolating vocals...' },
    { progress: 60, message: 'Sketching the perfect frame...' },
    { progress: 80, message: 'Bringing your vision to life...' },
    { progress: 90, message: 'Almost ready—just a moment...' },
  ];

  // Simulate progress
  for (const { progress, message } of messages) {
    jobStore.update(jobId, { status: 'processing', progress, message });
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  }

  // Complete with placeholder
  jobStore.update(jobId, {
    status: 'completed',
    progress: 100,
    outputUrl: '/placeholder.mp4',
    title: `${data.character} Cover (Demo)`,
    character: data.character,
    message: 'Your cover is ready!',
  });
}