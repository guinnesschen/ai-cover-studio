import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/artifacts/[id] - Get artifact details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const artifact = await prisma.artifact.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        url: true,
        metadata: true,
        createdAt: true,
      },
    });

    if (!artifact) {
      return NextResponse.json(
        { error: 'Artifact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: artifact.id,
      type: artifact.type,
      url: artifact.url,
      metadata: artifact.metadata,
      createdAt: artifact.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching artifact:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artifact' },
      { status: 500 }
    );
  }
}