import { NextRequest, NextResponse } from 'next/server';
import { CoversService } from '@/services/covers';
import { uploadFile } from '@/clients/storage';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// POST /api/covers - Create a new cover
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let coverId: string | null = null;
  let tempFilePath: string | null = null;
  
  try {
    console.log('[API] POST /api/covers - Cover creation started');
    
    const formData = await request.formData();
    const audioFile = formData.get('audioFile') as File;
    const character = formData.get('character') as string;
    const imagePrompt = formData.get('imagePrompt') as string;
    
    console.log('[API] Request data:', { 
      fileName: audioFile?.name, 
      fileSize: audioFile?.size, 
      character, 
      hasImagePrompt: !!imagePrompt 
    });

    // Basic validation
    if (!audioFile || !character) {
      console.warn('[API] Missing required fields:', { audioFile: !!audioFile, character: !!character });
      return NextResponse.json(
        { error: 'Missing required fields: audioFile and character' },
        { status: 400 }
      );
    }

    // Validate file size (max 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (audioFile.size > MAX_FILE_SIZE) {
      console.warn('[API] File too large:', audioFile.size);
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      );
    }

    // Validate file type - require both valid MIME type AND extension
    const validAudioTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/x-m4a'];
    const validExtensions = /\.(mp3|wav|webm|m4a|mp4)$/i;
    
    if (!validAudioTypes.includes(audioFile.type) || !audioFile.name.match(validExtensions)) {
      console.warn('[API] Invalid audio file type:', { type: audioFile.type, name: audioFile.name });
      return NextResponse.json(
        { error: 'Invalid audio file type. Please upload MP3, WAV, WebM, or M4A files.' },
        { status: 400 }
      );
    }

    // Save file temporarily
    const bytes = await audioFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create a unique temporary filename
    const timestamp = Date.now();
    const fileNameParts = audioFile.name.split('.');
    const originalExtension = fileNameParts.length > 1 ? fileNameParts.pop() : 'mp3';
    tempFilePath = join(tmpdir(), `audio_${timestamp}.${originalExtension}`);
    
    console.log('[API] Saving temporary file:', tempFilePath);
    await writeFile(tempFilePath, buffer);
    
    // Upload to blob storage
    console.log('[API] Uploading to blob storage...');
    const audioUrl = await uploadFile(tempFilePath, `uploads/${timestamp}/audio.${originalExtension}`);
    console.log('[API] File uploaded to:', audioUrl);
    
    // Create cover and start processing
    console.log('[API] Creating cover...');
    const cover = await CoversService.create({
      audioUrl,
      character,
      imagePrompt,
      title: audioFile.name.replace(/\.[^/.]+$/, ''), // Remove file extension for title
      artist: 'Uploaded Audio',
    });
    
    coverId = cover.id;
    const duration = Date.now() - startTime;
    console.log(`[API] Cover created successfully: ${cover.id} (took ${duration}ms)`);

    return NextResponse.json({ coverId: cover.id });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[API] Error creating cover:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      coverId,
      duration,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to create cover',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    // Always clean up temp file if it exists
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
        console.log('[API] Cleaned up temporary file');
      } catch (cleanupError) {
        console.warn('[API] Failed to clean up temp file:', cleanupError);
      }
    }
  }
}

// GET /api/covers - Get gallery of completed covers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');

    const response = await CoversService.findAll(limit, offset);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching covers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch covers' },
      { status: 500 }
    );
  }
}