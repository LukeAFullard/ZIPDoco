import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Eye, Grid } from 'lucide-react';
import { isImageFile, generateThumbnail } from '../lib/viewer/thumbnailGenerator';

export interface ThumbnailGridItem {
  name: string;
  uncompressedSize?: number;
  content?: string | Uint8Array;
}

interface ThumbnailGridProps {
  entries: ThumbnailGridItem[];
  onPreviewImage: (path: string) => void;
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  entries,
  onPreviewImage,
}) => {
  const imageEntries = entries.filter(e => isImageFile(e.name));
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;

    async function loadThumbnails() {
      const newThumbs: Record<string, string> = {};
      const targetImages = entries.filter(e => isImageFile(e.name));
      for (const entry of targetImages) {
        if (entry.content) {
          const thumbUrl = await generateThumbnail(entry.content, {
            maxWidth: 160,
            maxHeight: 160,
          });
          if (isMounted) {
            newThumbs[entry.name] = thumbUrl;
          }
        }
      }
      if (isMounted) {
        setThumbnails(newThumbs);
      }
    }

    loadThumbnails();

    return () => {
      isMounted = false;
    };
  }, [entries]);

  if (imageEntries.length === 0) {
    return null;
  }

  return (
    <div className="bg-stone dark:bg-graphite rounded-panel border border-graphite/20 dark:border-white/15 p-4 space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-graphite dark:text-stone">
        <div className="flex items-center gap-2">
          <Grid size={16} className="text-signal-dim dark:text-signal" />
          <span>Image Gallery ({imageEntries.length} Images)</span>
        </div>
        <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
          Canvas Lazy Thumbnails
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {imageEntries.map(entry => {
          const thumb = thumbnails[entry.name];
          const fileNameOnly = entry.name.split('/').pop() || entry.name;

          return (
            <div
              key={entry.name}
              onClick={() => onPreviewImage(entry.name)}
              className="group relative bg-stone dark:bg-ink rounded-panel border border-graphite/20 dark:border-white/15 overflow-hidden cursor-pointer hover:border-signal/50 transition-all flex flex-col"
            >
              <div className="aspect-square bg-gray-200/50 dark:bg-graphite flex items-center justify-center overflow-hidden relative">
                {thumb ? (
                  <img
                    src={thumb}
                    alt={fileNameOnly}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-gray-400 p-2">
                    <ImageIcon size={24} />
                    <span className="text-[10px] mt-1 truncate max-w-[80px]">
                      {fileNameOnly}
                    </span>
                  </div>
                )}

                <div className="absolute inset-0 bg-ink/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="bg-graphite/90 text-stone text-xs font-medium px-2.5 py-1 rounded-panel inline-flex items-center gap-1 shadow-sm">
                    <Eye size={12} /> Preview
                  </span>
                </div>
              </div>

              <div className="p-2 text-[11px] font-mono truncate text-graphite dark:text-stone border-t border-graphite/10 dark:border-white/10">
                {fileNameOnly}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
