import Replicate from 'replicate';
import { jobStore } from './jobs';
import { downloadYouTubeAudio } from './youtube';
import { stitchVideoAudio } from './ffmpeg';
import { uploadFile } from './storage';
import { getCharacterById } from './characters';
import fs from 'fs/promises';
import path from 'path';

const replicate = process.env.REPLICATE_API_TOKEN 
  ? new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })
  : null;

// Validation helpers
function validateYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return (urlObj.hostname === 'www.youtube.com' || urlObj.hostname === 'youtube.com' || urlObj.hostname === 'youtu.be') &&
           (urlObj.pathname.includes('/watch') || urlObj.hostname === 'youtu.be');
  } catch {
    return false;
  }
}

function sanitizeJobId(jobId: string): string {
  // Remove any path traversal attempts and special characters
  return jobId.replace(/[^a-zA-Z0-9-_]/g, '');
}

// Audit logging for production monitoring
interface PipelineAudit {
  jobId: string;
  stage: string;
  timestamp: Date;
  duration?: number;
  input?: unknown;
  output?: unknown;
  error?: string;
}

async function logAudit(audit: PipelineAudit): Promise<void> {
  if (process.env.NODE_ENV === 'test' || process.env.ENABLE_AUDIT_LOGGING) {
    const auditDir = path.join(process.cwd(), 'audit-logs');
    await fs.mkdir(auditDir, { recursive: true }).catch(() => {});
    
    const filename = `pipeline-${audit.jobId}-${Date.now()}.json`;
    const filepath = path.join(auditDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(audit, null, 2)).catch(console.error);
  }
}

export async function processJob(jobId: string) {
  const sanitizedJobId = sanitizeJobId(jobId);
  
  const job = jobStore.get(sanitizedJobId);
  if (!job || !job.data) {
    await logAudit({
      jobId: sanitizedJobId,
      stage: 'validation',
      timestamp: new Date(),
      error: 'Job not found',
    });
    throw new Error('Job not found');
  }

  const { youtubeUrl, character, imagePrompt } = job.data;
  
  // Validate YouTube URL
  if (!validateYouTubeUrl(youtubeUrl)) {
    await logAudit({
      jobId: sanitizedJobId,
      stage: 'validation',
      timestamp: new Date(),
      input: { youtubeUrl },
      error: 'Invalid YouTube URL',
    });
    jobStore.update(sanitizedJobId, { 
      status: 'error', 
      error: 'Invalid YouTube URL format' 
    });
    throw new Error('Invalid YouTube URL format');
  }
  
  const characterData = getCharacterById(character);
  if (!characterData) {
    await logAudit({
      jobId: sanitizedJobId,
      stage: 'validation',
      timestamp: new Date(),
      input: { character },
      error: 'Character not found',
    });
  }

  // Check if Replicate is configured
  if (!process.env.REPLICATE_API_TOKEN) {
    // For demo purposes, simulate the pipeline
    await simulatePipeline(sanitizedJobId, { youtubeUrl, character, imagePrompt: imagePrompt || '' });
    return;
  }

  try {
    // Update status
    jobStore.update(sanitizedJobId, { status: 'processing', progress: 5, message: 'Starting...' });

    // Step 1: Download YouTube audio
    const downloadStart = Date.now();
    jobStore.update(sanitizedJobId, { progress: 10, message: 'Downloading audio...' });
    const audioPath = await downloadYouTubeAudio(youtubeUrl, sanitizedJobId);
    const audioUrl = await uploadFile(audioPath, `${sanitizedJobId}_input.mp3`);
    
    await logAudit({
      jobId: sanitizedJobId,
      stage: 'youtube-download',
      timestamp: new Date(),
      duration: Date.now() - downloadStart,
      input: { youtubeUrl },
      output: { audioPath, audioUrl },
    });

    // Step 2: Run voice cloning (full mix)
    const voiceCloneFullStart = Date.now();
    jobStore.update(sanitizedJobId, { progress: 20, message: 'Fine-tuning vocals...' });
    
    const voiceCloneParams = {
      input_audio: audioUrl,
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
    };
    
    const fullMixOutput = await replicate.run(
      "zsxkib/realistic-voice-cloning:0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550",
      { input: voiceCloneParams }
    ) as unknown as string;
    
    await logAudit({
      jobId: sanitizedJobId,
      stage: 'voice-clone-full',
      timestamp: new Date(),
      duration: Date.now() - voiceCloneFullStart,
      input: { model: characterData?.name || character, mixType: 'full' },
      output: { fullMixUrl: fullMixOutput },
    });

    // Step 3: Run voice cloning (isolated vocals)
    jobStore.update(sanitizedJobId, { progress: 40, message: 'Isolating vocals...' });
    const isolatedVoxOutput = await replicate.run(
      "zsxkib/realistic-voice-cloning:0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550",
      {
        input: {
          input_audio: audioUrl,
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
    jobStore.update(sanitizedJobId, { progress: 60, message: 'Sketching the perfect frame...' });
    
    // For MVP, using a default prompt since we don't have fine-tuned models
    const defaultPrompt = imagePrompt || `${characterData?.name || character} performing on stage`;
    const fullPrompt = `close-up portrait of ${defaultPrompt}, professional lighting, high quality`;
    
    const stillOutput = await replicate.run(
      "black-forest-labs/flux-schnell:131d9e185621b4b4d349fd262e363420a6f74081d8c27966c9c5bcf120fa3985",
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
    jobStore.update(sanitizedJobId, { progress: 80, message: 'Bringing your vision to life...' });
    const videoOutput = await replicate.run(
      "zsxkib/sonic:a2aad29ea95f19747a5ea22ab14fc6594654506e5815f7f5ba4293e888d3e20f",
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
    jobStore.update(sanitizedJobId, { progress: 90, message: 'Almost ready—just a moment...' });
    const finalVideoPath = await stitchVideoAudio(videoOutput, fullMixOutput, sanitizedJobId);
    const finalVideoUrl = await uploadFile(finalVideoPath, `${sanitizedJobId}_final.mp4`);

    // Extract title from YouTube (for MVP, using a simple title)
    const title = `Cover ${new Date().toLocaleDateString()}`;

    // Complete job
    jobStore.update(sanitizedJobId, {
      status: 'completed',
      progress: 100,
      outputUrl: finalVideoUrl,
      title,
      character,
      message: 'Your cover is ready!',
    });

  } catch (error) {
    console.error('Pipeline error:', error);
    jobStore.update(sanitizedJobId, {
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