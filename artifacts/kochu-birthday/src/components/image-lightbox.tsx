import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut, MessageCircle, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GoogleDriveMedia } from './google-drive-media';

export interface LightboxImage {
  url: string;
  driveFileId?: string;
  caption?: string | null;
  label?: string | null;
  date?: string | null;
}

interface ImageLightboxProps {
  images: LightboxImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  commentCount?: number;
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  commentCount,
}: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const active = images[currentIndex];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) onNavigate(currentIndex + 1);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onNavigate]);

  if (!isOpen || !active) return null;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    if (diff > 50 && currentIndex < images.length - 1) {
      onNavigate(currentIndex + 1);
    } else if (diff < -50 && currentIndex > 0) {
      onNavigate(currentIndex - 1);
    }
    setTouchStart(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-2xl text-foreground rise-in"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border/60">
        <div className="flex items-center gap-3">
          <span className="eyebrow">
            {currentIndex + 1} of {images.length}
          </span>
          {active.label && (
            <span className="font-handwritten text-xl text-primary bg-primary/10 px-3 py-0.5 rounded-full">
              {active.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoomed(!zoomed)}
            className="rounded-full gap-2 focus-ring text-muted-foreground hover:text-foreground"
            data-testid="button-lightbox-zoom"
          >
            {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}
            <span className="hidden sm:inline">ZOOM</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full gap-2 focus-ring text-muted-foreground hover:text-foreground"
            data-testid="button-lightbox-close"
          >
            <X size={20} />
            <span className="hidden sm:inline">CLOSE</span>
          </Button>
        </div>
      </div>

      {/* Main Image Container */}
      <div className="relative flex-1 grid place-items-center p-4 sm:p-8 overflow-auto">
        {currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-card/80 border border-border text-foreground hover:bg-card shadow-lg transition-all focus-ring"
            aria-label="Previous image"
            data-testid="button-lightbox-prev"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <div className="max-w-5xl max-h-full flex flex-col items-center justify-center">
          <GoogleDriveMedia
            propUrl={active.url}
            driveFileId={active.driveFileId}
            alt={active.caption || 'Scrapbook photo'}
            className={`max-h-[70vh] w-auto rounded-2xl shadow-2xl transition-transform duration-300 ${
              zoomed ? 'scale-125 cursor-zoom-out' : 'cursor-zoom-in'
            }`}
            onClick={() => setZoomed(!zoomed)}
          />

          {/* Caption & Metadata Footer */}
          {(active.caption || active.date || commentCount !== undefined) && (
            <div className="mt-6 max-w-2xl text-center bg-card/90 border border-border p-5 rounded-2xl shadow-lg rise-in">
              {active.caption && (
                <p className="font-handwritten text-2xl text-foreground/90 leading-snug">
                  “{active.caption}”
                </p>
              )}

              <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
                {active.date && <span>{active.date}</span>}
                {commentCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <MessageCircle size={14} className="text-primary" /> {commentCount} comments
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {currentIndex < images.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-card/80 border border-border text-foreground hover:bg-card shadow-lg transition-all focus-ring"
            aria-label="Next image"
            data-testid="button-lightbox-next"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
