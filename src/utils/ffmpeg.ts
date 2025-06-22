import { stitchVideoAudioWasm, simpleVideoAudioMerge } from './ffmpeg-wasm';

export async function stitchVideoAudio(
  videoUrl: string,
  audioUrl: string,
  jobId: string
): Promise<string> {
  try {
    return await stitchVideoAudioWasm(videoUrl, audioUrl, jobId);
  } catch (error) {
    console.error('FFmpeg.wasm failed, using fallback:', error);
    return await simpleVideoAudioMerge(videoUrl, audioUrl, jobId);
  }
}