import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/clients/prisma';
import { processNextStep } from '@/core/pipeline';
import { ReplicatePrediction, ArtifactType } from '@/types';

// POST /api/webhooks/replicate - Handle Replicate webhook callbacks
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[WEBHOOK] 🎣 Webhook received - START', {
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method
  });

  try {
    // Log headers for debugging
    const headers = Object.fromEntries(request.headers.entries());
    console.log('[WEBHOOK] 📋 Request headers', {
      contentType: headers['content-type'],
      userAgent: headers['user-agent'],
      hasWebhookSecret: !!headers['x-webhook-secret'],
      secretPreview: headers['x-webhook-secret'] ? headers['x-webhook-secret'].substring(0, 8) + '...' : 'none'
    });

    // Verify webhook secret
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const providedSecret = request.headers.get('x-webhook-secret');
    
    console.log('[WEBHOOK] 🔐 Webhook secret verification', {
      hasEnvSecret: !!webhookSecret,
      hasProvidedSecret: !!providedSecret,
      secretsMatch: webhookSecret && providedSecret === webhookSecret
    });
    
    if (webhookSecret && providedSecret !== webhookSecret) {
      console.error('[WEBHOOK] ❌ WEBHOOK SECRET MISMATCH', {
        expected: webhookSecret ? webhookSecret.substring(0, 8) + '...' : 'none',
        provided: providedSecret ? providedSecret.substring(0, 8) + '...' : 'none'
      });
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    console.log('[WEBHOOK] 📦 Parsing webhook payload...');
    const prediction: ReplicatePrediction = await request.json();
    
    const parseTime = Date.now() - startTime;
    console.log('[WEBHOOK] ✅ Webhook payload parsed successfully', {
      predictionId: prediction.id,
      status: prediction.status,
      model: prediction.model,
      hasOutput: !!prediction.output,
      hasError: !!prediction.error,
      parseTime: `${parseTime}ms`,
      completedAt: prediction.completed_at,
      startedAt: prediction.started_at,
      createdAt: prediction.created_at
    });

    console.log('[WEBHOOK] 🔍 Looking up artifact by prediction ID...');
    const artifact = await prisma.artifact.findFirst({
      where: { replicateId: prediction.id },
      include: { cover: true },
    });

    if (!artifact) {
      console.error('[WEBHOOK] ❌ UNKNOWN PREDICTION ID', {
        predictionId: prediction.id,
        status: prediction.status,
        model: prediction.model,
        searchTime: `${Date.now() - startTime}ms`
      });
      return NextResponse.json(
        { error: 'Unknown prediction' },
        { status: 404 }
      );
    }

    console.log('[WEBHOOK] ✅ Artifact found', {
      artifactId: artifact.id,
      artifactType: artifact.type,
      coverId: artifact.coverId,
      coverStatus: artifact.cover.status,
      coverProgress: artifact.cover.progress,
      predictionId: prediction.id
    });

    // Handle based on prediction status
    if (prediction.status === 'succeeded') {
      console.log('[WEBHOOK] 🎉 Processing successful prediction...');
      
      const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      console.log('[WEBHOOK] 📸 Extracting output', {
        outputType: typeof prediction.output,
        isArray: Array.isArray(prediction.output),
        outputUrl: outputUrl,
        processingTime: prediction.metrics?.predict_time
      });

      console.log('[WEBHOOK] 💾 Updating artifact with output URL...');
      await prisma.artifact.update({
        where: { id: artifact.id },
        data: {
          url: outputUrl,
          metadata: {
            processingTime: prediction.metrics?.predict_time,
            completedAt: new Date().toISOString(),
          },
        },
      });

      console.log('[WEBHOOK] ✅ Artifact updated successfully', {
        artifactId: artifact.id,
        outputUrl,
        processingTime: prediction.metrics?.predict_time
      });

      console.log('[WEBHOOK] 🔄 Checking dependencies and triggering next steps...');
      await checkDependenciesAndProceed(artifact.coverId, artifact.type);
      
    } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
      console.error('[WEBHOOK] ❌ PREDICTION FAILED/CANCELED', {
        predictionId: prediction.id,
        status: prediction.status,
        error: prediction.error,
        artifactType: artifact.type,
        coverId: artifact.coverId
      });

      console.log('[WEBHOOK] 🔄 Marking cover as failed...');
      await prisma.cover.update({
        where: { id: artifact.coverId },
        data: {
          status: 'failed',
          errorMessage: prediction.error || `Processing failed at ${artifact.type} stage`,
        },
      });

      console.log('[WEBHOOK] ✅ Cover marked as failed');
    } else {
      console.log('[WEBHOOK] ⏳ Prediction still in progress', {
        predictionId: prediction.id,
        status: prediction.status,
        artifactType: artifact.type
      });
    }

    const totalTime = Date.now() - startTime;
    console.log('[WEBHOOK] ✅ Webhook processed successfully', {
      predictionId: prediction.id,
      status: prediction.status,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('[WEBHOOK] ❌ WEBHOOK PROCESSING FAILED', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      totalTime: `${totalTime}ms`,
      timestamp: new Date().toISOString()
    });
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Check if dependencies are met and trigger next steps
async function checkDependenciesAndProceed(coverId: string, completedType: string) {
  console.log('[WEBHOOK DEPS] 🔄 Checking dependencies and next steps', {
    coverId,
    completedType,
    timestamp: new Date().toISOString()
  });

  const cover = await prisma.cover.findUnique({
    where: { id: coverId },
    include: { artifacts: true },
  });

  if (!cover) {
    console.error('[WEBHOOK DEPS] ❌ Cover not found', { coverId });
    return;
  }

  console.log('[WEBHOOK DEPS] ✅ Cover found', {
    coverId,
    currentStatus: cover.status,
    currentProgress: cover.progress,
    artifactsCount: cover.artifacts.length
  });

  // Group artifacts by type
  const artifactTypes = new Set(cover.artifacts.filter(a => a.url).map(a => a.type));
  const allArtifacts = cover.artifacts.map(a => ({
    type: a.type,
    hasUrl: !!a.url,
    replicateId: a.replicateId
  }));
  
  console.log('[WEBHOOK DEPS] 📊 Artifact analysis', {
    allArtifacts,
    completedTypes: Array.from(artifactTypes),
    completedCount: artifactTypes.size
  });
  
  // Update progress based on completed artifacts
  const progress = calculateProgress(artifactTypes);
  console.log('[WEBHOOK DEPS] 📈 Updating progress', {
    oldProgress: cover.progress,
    newProgress: progress,
    completedArtifacts: Array.from(artifactTypes)
  });

  await prisma.cover.update({
    where: { id: coverId },
    data: { progress },
  });
  
  console.log('[WEBHOOK DEPS] 🚀 Checking for next steps to trigger', {
    completedType,
    availableArtifacts: Array.from(artifactTypes)
  });

  // Check what we can start based on completed dependencies
  switch (completedType as ArtifactType) {
    case 'image':
    case 'vocals_isolated':
      console.log('[WEBHOOK DEPS] 🎬 Checking video generation prerequisites...');
      // If both image and vocals_isolated are ready, start video generation
      if (artifactTypes.has('image') && artifactTypes.has('vocals_isolated')) {
        console.log('[WEBHOOK DEPS] ✅ Prerequisites met for video generation - triggering step');
        await processNextStep(coverId, 'generating_video');
      } else {
        console.log('[WEBHOOK DEPS] ⏳ Video generation prerequisites not yet met', {
          hasImage: artifactTypes.has('image'),
          hasVocalsIsolated: artifactTypes.has('vocals_isolated'),
          needed: ['image', 'vocals_isolated']
        });
      }
      break;
      
    case 'video':
    case 'vocals_full':
      console.log('[WEBHOOK DEPS] 🔗 Checking stitching prerequisites...');
      // If both video and vocals_full are ready, start stitching
      if (artifactTypes.has('video') && artifactTypes.has('vocals_full')) {
        console.log('[WEBHOOK DEPS] ✅ Prerequisites met for stitching - triggering step');
        await processNextStep(coverId, 'stitching');
      } else {
        console.log('[WEBHOOK DEPS] ⏳ Stitching prerequisites not yet met', {
          hasVideo: artifactTypes.has('video'),
          hasVocalsFull: artifactTypes.has('vocals_full'),
          needed: ['video', 'vocals_full']
        });
      }
      break;

    default:
      console.log('[WEBHOOK DEPS] ℹ️ No next steps defined for artifact type', { completedType });
  }

  console.log('[WEBHOOK DEPS] ✅ Dependency check completed', {
    coverId,
    completedType,
    finalProgress: progress
  });
}

// Calculate progress based on completed artifacts
function calculateProgress(completedArtifacts: Set<string>): number {
  let progress = 0;
  
  // Each step contributes to overall progress
  if (completedArtifacts.has('audio')) progress += 20;
  if (completedArtifacts.has('image')) progress += 15;
  if (completedArtifacts.has('vocals_full')) progress += 20;
  if (completedArtifacts.has('vocals_isolated')) progress += 15;
  if (completedArtifacts.has('video')) progress += 20;
  // Note: Final 10% is added when status changes to 'completed' in stitch.ts
  
  return progress;
}