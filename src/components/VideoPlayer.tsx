'use client';

import { Cover } from '@/types';
import { getCharacterById } from '@/lib/characters';

interface VideoPlayerProps {
  cover: Cover;
}

export default function VideoPlayer({ cover }: VideoPlayerProps) {
  const character = getCharacterById(cover.character);

  const handleDownload = async () => {
    try {
      const response = await fetch(cover.videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cover.title.replace(/[^a-z0-9]/gi, '_')}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Video */}
      <div className="relative rounded-lg overflow-hidden bg-black">
        <video
          src={cover.videoUrl}
          controls
          autoPlay
          className="w-full"
          style={{ maxHeight: '500px' }}
        />
      </div>

      {/* Info */}
      <div className="space-y-2">
        <p className="text-sm text-muted">
          {character?.name || cover.character} interpreting &ldquo;{cover.title}&rdquo; {character?.emoji}
        </p>
        
        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-accent hover:text-accent-light transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}