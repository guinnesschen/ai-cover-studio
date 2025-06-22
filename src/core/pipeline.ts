import { prisma } from '@/clients/prisma';
import { downloadAudio } from './steps/download';
import { generateImage } from './steps/image';
import { cloneVoiceFull, cloneVoiceIsolated } from './steps/voice';
import { generateVideo } from './steps/video';
import { stitchFinal } from './steps/stitch';

// Pipeline action types (internal use only)
type PipelineAction = 
  | 'downloading'
  | 'generating_image'
  | 'cloning_voice_full'
  | 'cloning_voice_isolated'
  | 'generating_video'
  | 'stitching';

// Main pipeline orchestrator
export async function processNextStep(coverId: string, action: PipelineAction) {
  try {
    const cover = await prisma.cover.findUnique({
      where: { id: coverId },
      include: { artifacts: true },
    });

    if (!cover) {
      console.error('Cover not found:', coverId);
      return;
    }

    console.log(`Processing cover ${coverId} - Action: ${action}`);

    // Route to the appropriate handler based on action
    switch (action) {
      case 'downloading':
        await downloadAudio(cover);
        break;
      
      case 'generating_image':
        await generateImage(cover);
        break;
      
      case 'cloning_voice_full':
        await cloneVoiceFull(cover);
        break;
      
      case 'cloning_voice_isolated':
        await cloneVoiceIsolated(cover);
        break;
      
      case 'generating_video':
        await generateVideo(cover);
        break;
      
      case 'stitching':
        await stitchFinal(cover);
        break;
      
      default:
        console.warn(`Unknown pipeline action: ${action}`);
    }
  } catch (error) {
    console.error(`Pipeline error for cover ${coverId}:`, error);
    
    // Mark as failed
    await prisma.cover.update({
      where: { id: coverId },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Processing failed',
      },
    });
  }
}