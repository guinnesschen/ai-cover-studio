import { NextRequest, NextResponse } from 'next/server';
import { CoversService } from '@/services/covers';

// GET /api/covers/[id] - Get specific cover with artifacts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cover = await CoversService.findById(id);

    if (!cover) {
      return NextResponse.json(
        { error: 'Cover not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(cover);
  } catch (error) {
    console.error('Error fetching cover:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cover' },
      { status: 500 }
    );
  }
}