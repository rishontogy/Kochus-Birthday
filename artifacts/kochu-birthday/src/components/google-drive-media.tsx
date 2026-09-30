import React, { useState } from 'react';
import { AlertCircle, Film, Image as ImageIcon, Play, RefreshCw, ExternalLink } from 'lucide-react';

export function parseGoogleDriveLink(
  input: string | null | undefined,
  defaultType: 'image' | 'video' = 'image'
) {
  if (!input || typeof input !== 'string') {
    return { driveFileId: null, originalUrl: '', mediaType: 'unsupported' as const };
  }
  const trimmed = input.trim();
  if (!trimmed) {
    return { driveFileId: null, originalUrl: '', mediaType: 'unsupported' as const };
  }
  let driveFileId: string | null = null;

  // Pattern 1: /file/d/FILE_ID/
  const fileDPattern = /\/file\/d\/([a-zA-Z0-9_-]+)/;
  const matchD = trimmed.match(fileDPattern);
  if (matchD && matchD[1]) {
    driveFileId = matchD[1];
  }

  // Pattern 2: id=FILE_ID
  if (!driveFileId) {
    const idPattern = /[?&]id=([a-zA-Z0-9_-]+)/;
    const matchId = trimmed.match(idPattern);
    if (matchId && matchId[1]) {
      driveFileId = matchId[1];
    }
  }

  // Pattern 3: googleusercontent.com/d/FILE_ID
  if (!driveFileId) {
    const lh3Pattern = /\/d\/([a-zA-Z0-9_-]+)/;
    const matchLh3 = trimmed.match(lh3Pattern);
    if (matchLh3 && matchLh3[1]) {
      driveFileId = matchLh3[1];
    }
  }

  // Pattern 4: Raw file ID
  if (!driveFileId && /^[a-zA-Z0-9_-]{15,70}$/.test(trimmed)) {
    driveFileId = trimmed;
  }

  let mediaType: 'image' | 'video' | 'unsupported' = 'unsupported';
  if (driveFileId || trimmed.startsWith('http')) {
    const lower = trimmed.toLowerCase();
    if (
      lower.includes('video') ||
      lower.endsWith('.mp4') ||
      lower.endsWith('.mov') ||
      lower.endsWith('.webm') ||
      defaultType === 'video'
    ) {
      mediaType = 'video';
    } else {
      mediaType = 'image';
    }
  }

  return {
    driveFileId,
    originalUrl: trimmed,
    mediaType,
  };
}

export function getGoogleDriveDisplayUrl(
  driveFileId: string | null,
  mediaType: 'image' | 'video' = 'image'
): string | null {
  if (!driveFileId) return null;
  if (driveFileId.startsWith('http://') || driveFileId.startsWith('https://')) {
    return driveFileId;
  }
  if (mediaType === 'video') {
    return `https://drive.google.com/file/d/${driveFileId}/preview`;
  }
  return `https://lh3.googleusercontent.com/d/${driveFileId}=w1200`;
}

interface GoogleDriveMediaProps {
  driveFileId?: string | null;
  url?: string | null;
  mediaType?: 'image' | 'video' | 'unsupported';
  alt?: string;
  caption?: string | null;
  label?: string | null;
  className?: string;
  aspectRatio?: 'square' | 'video' | 'auto';
  showControls?: boolean;
  onEditLink?: () => void;
  onClick?: () => void;
  'data-testid'?: string;
}

export const GoogleDriveMedia: React.FC<GoogleDriveMediaProps> = ({
  driveFileId: propFileId,
  url: propUrl,
  mediaType: propMediaType = 'image',
  alt = 'Scrapbook Media',
  caption,
  label,
  className = '',
  aspectRatio = 'auto',
  showControls = true,
  onEditLink,
  onClick,
  'data-testid': testId,
}) => {
  const parsed = parseGoogleDriveLink(propUrl || propFileId, propMediaType);
  const fileId = parsed.driveFileId || propFileId;
  const isVideo = parsed.mediaType === 'video' || propMediaType === 'video';

  const sources = React.useMemo(() => {
    const list: string[] = [];
    if (fileId && !fileId.startsWith('http')) {
      list.push(`https://lh3.googleusercontent.com/d/${fileId}=w1200`);
      list.push(`https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`);
      list.push(`https://drive.google.com/uc?export=view&id=${fileId}`);
    }
    if (propUrl && propUrl.startsWith('http')) {
      list.push(propUrl);
    }
    return list;
  }, [fileId, propUrl]);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    if (sourceIndex < sources.length - 1) {
      setSourceIndex((prev) => prev + 1);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const currentSource = sources[sourceIndex] || propUrl || (fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w1200` : '');

  // Render Video
  if (isVideo && fileId) {
    const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
    return (
      <div
        className={`relative overflow-hidden rounded-xl bg-slate-900 shadow-md ${className}`}
        data-testid={testId || 'google-drive-video'}
      >
        <div className="aspect-video w-full relative">
          <iframe
            src={embedUrl}
            className="w-full h-full border-0 rounded-xl"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            title={alt}
          />
        </div>
        {(label || caption) && (
          <div className="p-3 bg-stone-900/90 text-stone-100 backdrop-blur-sm border-t border-stone-800">
            {label && <span className="text-xs font-semibold uppercase tracking-wider text-rose-300 block">{label}</span>}
            {caption && <p className="text-sm font-handwriting italic text-stone-300">{caption}</p>}
          </div>
        )}
      </div>
    );
  }

  // Render Image Fallback if Error
  if (hasError || !currentSource) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center p-6 text-center rounded-xl bg-rose-50/80 border-2 border-dashed border-rose-300 text-stone-700 ${className}`}
        data-testid={testId || 'media-error'}
      >
        <AlertCircle className="w-10 h-10 text-rose-400 mb-2 animate-bounce" />
        <p className="font-semibold text-rose-900 text-sm">Unable to display this Google Drive media.</p>
        <p className="text-xs text-stone-600 max-w-xs mt-1">
          Check that the Google Drive file access is set to &ldquo;Anyone with the link can view&rdquo;.
        </p>
        {onEditLink && (
          <button
            onClick={onEditLink}
            className="mt-3 px-3 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            EDIT LINK
          </button>
        )}
        {parsed.originalUrl && (
          <a
            href={parsed.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 text-xs text-rose-700 underline flex items-center gap-1 hover:text-rose-900"
          >
            Open in Google Drive <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative group overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      data-testid={testId || 'google-drive-image'}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-amber-50/50 backdrop-blur-xs z-10">
          <div className="w-6 h-6 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      <img
        src={currentSource}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        loading="lazy"
      />
      {label && (
        <div className="absolute top-2 left-2 z-10 px-2.5 py-1 bg-stone-900/80 backdrop-blur-md text-amber-100 text-xs font-serif rounded-md shadow-sm border border-stone-700/50">
          {label}
        </div>
      )}
    </div>
  );
};
