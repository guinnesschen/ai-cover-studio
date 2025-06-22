import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/clients/prisma';
import { processNextStep } from '@/core/pipeline';
import { ReplicatePrediction, ArtifactType } from '@/types';

// POST /api/webhooks/replicate - Handle Replicate webhook callbacks
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const providedSecret = request.headers.get('x-webhook-secret');
    
    if (webhookSecret && providedSecret !== webhookSecret) {
      return NextResponse.json(
        { error: 'Invalid webhook secret' },
        { status: 401 }
      );
    }

    const prediction: ReplicatePrediction = await request.json();
    
    console.log('Received webhook for prediction:', prediction.id, 'status:', prediction.status);

    // Find the artifact this prediction belongs to
    const artifact = await prisma.artifact.findFirst({
      where: { replicateId: prediction.id },
      include: { cover: true },
    });

    if (!artifact) {
      console.error('Unknown prediction ID:', prediction.id);
      return NextResponse.json(
        { error: 'Unknown prediction' },
        { status: 404 }
      );
    }

    // Handle based on prediction status
    if (prediction.status === 'succeeded') {
      // Update artifact with the output URL
      await prisma.artifact.update({
        where: { id: artifact.id },
        data: {
          url: Array.isArray(prediction.output) ? prediction.output[0] : prediction.output,
          metadata: {
            processingTime: prediction.metrics?.predict_time,
            completedAt: new Date().toISOString(),
          },
        },
      });

      // Check dependencies and process next steps
      await checkDependenciesAndProceed(artifact.coverId, artifact.type);
      
    } else if (prediction.status === 'failed' || prediction.status === 'canceled') {
      // Mark cover as failed
      await prisma.cover.update({
        where: { id: artifact.coverId },
        data: {
          status: 'failed',
          errorMessage: prediction.error || `Processing failed at ${artifact.type} stage`,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

// Check if dependencies are met and trigger next steps
async function checkDependenciesAndProceed(coverId: string, completedType: string) {
  const cover = await prisma.cover.findUnique({
    where: { id: coverId },
    include: { artifacts: true },
  });

  if (!cover) return;

  // Group artifacts by type
  const artifactTypes = new Set(cover.artifacts.filter(a => a.url).map(a => a.type));
  
  // Update progress based on completed artifacts
  const progress = calculateProgress(artifactTypes);
  await prisma.cover.update({
    where: { id: coverId },
    data: { progress },
  });
  
  // Check what we can start based on completed dependencies
  switch (completedType as ArtifactType) {
    case 'image':
    case 'vocals_isolated':
      // If both image and vocals_isolated are ready, start video generation
      if (artifactTypes.has('image') && artifactTypes.has('vocals_isolated')) {
        await processNextStep(coverId, 'generating_video');
      }
      break;
      
    case 'video':
    case 'vocals_full':
      // If both video and vocals_full are ready, start stitching
      if (artifactTypes.has('video') && artifactTypes.has('vocals_full')) {
        await processNextStep(coverId, 'stitching');
      }
      break;
  }
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