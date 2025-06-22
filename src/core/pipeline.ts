import { prisma } from '@/clients/prisma';
import { CoverStatus } from '@/types';
import { downloadAudio } from './steps/download';
import { generateImage } from './steps/image';
import { cloneVoiceFull, cloneVoiceIsolated } from './steps/voice';
import { generateVideo } from './steps/video';
import { stitchFinal } from './steps/stitch';

// Main pipeline orchestrator - much simpler!
export async function processNextStep(coverId: string, action?: CoverStatus) {
  try {
    const cover = await prisma.cover.findUnique({
      where: { id: coverId },
      include: { artifacts: true },
    });

    if (!cover) {
      console.error('Cover not found:', coverId);
      return;
    }

    // Use provided action or fall back to cover status
    const currentAction = action || cover.status;
    console.log(`Processing cover ${coverId} - Action: ${currentAction}`);

    // Route to the appropriate handler based on action
    switch (currentAction as CoverStatus) {
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
      
      case 'completed':
      case 'failed':
        // Nothing to do
        break;
      
      default:
        console.warn(`Unknown status: ${cover.status}`);
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