'use client';

import { Cover } from '@/types';
import { getCharacterById } from '@/data/characters';

interface GalleryProps {
  covers?: Cover[];
  onSelect: (cover: Cover) => void;
}

export default function Gallery({ covers, onSelect }: GalleryProps) {
  if (!covers || covers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted text-sm">No covers yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {covers.map((cover) => {
        const character = getCharacterById(cover.character);
        
        return (
          <div
            key={cover.id}
            className="group relative cursor-pointer overflow-hidden rounded-lg border border-border bg-background transition-all hover:scale-[1.02] hover:shadow-lg"
            onClick={() => onSelect(cover)}
          >
            {/* Video Thumbnail */}
            <div className="aspect-square relative overflow-hidden bg-gradient-to-br from-accent/10 to-accent/5">
              <video
                src={cover.videoUrl || undefined}
                className="w-full h-full object-cover"
                muted
                playsInline
                onMouseEnter={(e) => e.currentTarget.play()}
                onMouseLeave={(e) => {
                  e.currentTarget.pause();
                  e.currentTarget.currentTime = 0;
                }}
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            {/* Info */}
            <div className="p-3">
              <p className="text-sm font-medium truncate">{cover.title}</p>
              <p className="text-xs text-muted mt-1">
                {character?.emoji} {character?.name || cover.character}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}