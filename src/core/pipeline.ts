import { prisma } from '@/clients/prisma';
import { generateImage } from './steps/image';
import { cloneVoiceFull, cloneVoiceIsolated } from './steps/voice';
import { generateVideo } from './steps/video';
import { stitchFinal } from './steps/stitch';

// Pipeline action types (internal use only)
type PipelineAction = 
  | 'generating_image'
  | 'cloning_voice_full'
  | 'cloning_voice_isolated'
  | 'generating_video'
  | 'stitching';

// Main pipeline orchestrator
export async function processNextStep(coverId: string, action: PipelineAction) {
  const startTime = Date.now();
  console.log(`[PIPELINE] 🎯 Processing step - START`, {
    coverId,
    action,
    timestamp: new Date().toISOString()
  });

  try {
    console.log(`[PIPELINE] 🔍 Fetching cover from database...`, { coverId });
    const cover = await prisma.cover.findUnique({
      where: { id: coverId },
      include: { artifacts: true },
    });

    if (!cover) {
      console.error(`[PIPELINE] ❌ CRITICAL: Cover not found in database`, { 
        coverId, 
        action,
        searchTime: `${Date.now() - startTime}ms`
      });
      return;
    }

    const fetchTime = Date.now() - startTime;
    console.log(`[PIPELINE] ✅ Cover fetched successfully`, {
      coverId,
      action,
      fetchTime: `${fetchTime}ms`,
      coverData: {
        id: cover.id,
        status: cover.status,
        progress: cover.progress,
        character: cover.character,
        artifactsCount: cover.artifacts.length,
        existingArtifacts: cover.artifacts.map(a => ({ type: a.type, hasUrl: !!a.url, replicateId: a.replicateId }))
      }
    });

    console.log(`[PIPELINE] 🚀 Routing to step handler: ${action}`);

    // Route to the appropriate handler based on action
    switch (action) {
      case 'generating_image':
        console.log(`[PIPELINE] 🖼️ Executing generateImage step...`);
        await generateImage(cover);
        break;
      
      case 'cloning_voice_full':
        console.log(`[PIPELINE] 🎤 Executing cloneVoiceFull step...`);
        await cloneVoiceFull(cover);
        break;
      
      case 'cloning_voice_isolated':
        console.log(`[PIPELINE] 🎵 Executing cloneVoiceIsolated step...`);
        await cloneVoiceIsolated(cover);
        break;
      
      case 'generating_video':
        console.log(`[PIPELINE] 🎬 Executing generateVideo step...`);
        await generateVideo(cover);
        break;
      
      case 'stitching':
        console.log(`[PIPELINE] 🔗 Executing stitchFinal step...`);
        await stitchFinal(cover);
        break;
      
      default:
        console.warn(`[PIPELINE] ⚠️ Unknown pipeline action`, { action, coverId });
    }

    const totalTime = Date.now() - startTime;
    console.log(`[PIPELINE] ✅ Step completed successfully`, {
      coverId,
      action,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[PIPELINE] ❌ STEP FAILED`, {
      coverId,
      action,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log(`[PIPELINE] 🔄 Updating cover status to failed...`, { coverId });
      await prisma.cover.update({
        where: { id: coverId },
        data: {
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Processing failed',
        },
      });
      console.log(`[PIPELINE] ✅ Cover status updated to failed`, { coverId });
    } catch (updateError) {
      console.error(`[PIPELINE] ❌ CRITICAL: Failed to update cover status`, {
        coverId,
        originalError: error instanceof Error ? error.message : error,
        updateError: updateError instanceof Error ? updateError.message : updateError
      });
    }
  }
}