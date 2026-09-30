import { Heart, MessageCircle, MapPin, Sparkles, Layers } from 'lucide-react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';
import type { Memory } from '@workspace/api-client-react';
import { GoogleDriveMedia } from './google-drive-media';

interface MemoryCardProps {
  memory: Memory;
  onToggleFavorite?: (id: string) => void;
  onOpenLightbox?: (memory: Memory, initialIndex?: number) => void;
  index?: number;
}

export function MemoryCard({
  memory,
  onToggleFavorite,
  onOpenLightbox,
  index = 0,
}: MemoryCardProps) {
  const coverImage = memory.images?.find((img) => img.isCover) || memory.images?.[0];
  const hasMultipleImages = memory.images && memory.images.length > 1;

  // Alternate polaroid tilt rotations for realistic scrapbook look
  const rotations = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2'];
  const rotationClass = rotations[index % rotations.length];

  return (
    <article
      className={cn(
        'group relative polaroid-frame rounded-2xl transition-all duration-300 hover:-translate-y-1.5 hover:rotate-0 hover:shadow-xl rise-in',
        rotationClass,
      )}
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid={`card-memory-${memory.id}`}
    >
      {/* Washi Tape Strip */}
      <div className="washi-tape-top" />

      {/* Media Cover */}
      <div className="relative overflow-hidden rounded-xl bg-card border border-border/60">
        <GoogleDriveMedia
          propUrl={memory.imageUrl || coverImage?.url}
          driveFileId={coverImage?.driveFileId}
          alt={coverImage?.caption || memory.title}
          className="h-56 sm:h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onClick={() => onOpenLightbox && onOpenLightbox(memory, 0)}
        />

        {/* Custom Image Label Tag */}
        {(coverImage?.label || memory.customLabel) && (
          <span className="absolute bottom-3 left-3 font-handwritten text-xl text-foreground bg-card/90 backdrop-blur-md px-3 py-0.5 rounded-lg border border-border/70 shadow-sm">
            {coverImage?.label || memory.customLabel}
          </span>
        )}

        {/* Multiple Image Badge */}
        {hasMultipleImages && (
          <span className="absolute top-3 right-3 flex items-center gap-1 text-[11px] font-semibold bg-background/85 text-foreground backdrop-blur-md px-2.5 py-1 rounded-full shadow-sm">
            <Layers size={13} className="text-primary" /> {memory.images.length} photos
          </span>
        )}

        {/* Favorite Toggle Button */}
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onToggleFavorite(memory.id);
            }}
            className={cn(
              'absolute top-3 left-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur-md transition-colors focus-ring',
              memory.isFavorite
                ? 'bg-destructive text-destructive-foreground'
                : 'bg-background/80 text-muted-foreground hover:text-destructive',
            )}
            aria-label={memory.isFavorite ? 'REMOVE FROM FAVORITES' : 'ADD TO FAVORITES'}
            data-testid={`button-favorite-memory-${memory.id}`}
          >
            <Heart size={17} className={memory.isFavorite ? 'fill-current' : ''} />
          </button>
        )}
      </div>

      {/* Scrapbook Details */}
      <div className="pt-5 px-1 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="eyebrow">{memory.date}</span>
          {memory.location && (
            <span className="flex items-center gap-1">
              <MapPin size={12} className="text-primary" /> {memory.location}
            </span>
          )}
        </div>

        <Link
          href={`/memories/${memory.id}`}
          className="serif text-2xl group-hover:text-primary transition-colors focus-ring font-medium"
          data-testid={`link-view-memory-${memory.id}`}
        >
          {memory.title}
        </Link>

        {memory.caption && (
          <p className="font-handwritten text-2xl text-primary leading-tight mt-1">
            “{memory.caption}”
          </p>
        )}

        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {memory.story}
        </p>

        {/* Footer Badges & Actions */}
        <div className="mt-3 border-t border-border/50 pt-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {memory.allowComments && (
              <span className="flex items-center gap-1">
                <MessageCircle size={14} className="text-primary" /> {memory.commentCount || 0}
              </span>
            )}

            {memory.reactionCounts && Object.keys(memory.reactionCounts).length > 0 && (
              <div className="flex items-center gap-1 bg-accent/30 px-2 py-0.5 rounded-full text-[11px]">
                {Object.keys(memory.reactionCounts).slice(0, 3).map((emoji) => (
                  <span key={emoji}>{emoji}</span>
                ))}
              </div>
            )}
          </div>

          <Link
            href={`/memories/${memory.id}`}
            className="text-xs font-semibold text-primary hover:underline"
            data-testid={`button-open-detail-${memory.id}`}
          >
            VIEW MEMORY →
          </Link>
        </div>
      </div>
    </article>
  );
}
