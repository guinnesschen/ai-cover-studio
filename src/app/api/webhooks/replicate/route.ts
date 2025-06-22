import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/clients/prisma';
import { processNextStep } from '@/core/pipeline';
import { ReplicatePrediction } from '@/types';

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

      // Process next step in the pipeline
      await processNextStep(artifact.coverId);
      
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