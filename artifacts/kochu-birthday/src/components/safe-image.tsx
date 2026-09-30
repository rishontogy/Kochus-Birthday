import { useState } from 'react';
import { Heart, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SafeImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackText?: string;
  onClick?: () => void;
}

export function SafeImage({
  src,
  alt = 'Memory photo',
  className,
  fallbackText = 'Memory photo unavailable',
  onClick,
}: SafeImageProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div
        onClick={onClick}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/20 bg-secondary/30 p-6 text-center transition-colors hover:bg-secondary/40',
          onClick && 'cursor-pointer',
          className,
        )}
      >
        <div className="grid h-10 w-10 place-items-center rounded-full bg-background/80 text-primary shadow-xs">
          <ImageOff size={18} />
        </div>
        <p className="font-handwritten text-lg text-foreground/80 mt-2">{fallbackText}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Kept with love ❤️</p>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => {
        console.warn(`[SafeImage] Technical error loading image: ${src}`);
        setError(true);
      }}
      onClick={onClick}
      className={cn(onClick && 'cursor-pointer', className)}
    />
  );
}
