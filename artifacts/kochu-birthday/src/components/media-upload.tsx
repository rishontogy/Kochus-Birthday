import { useState } from 'react';
import { Plus, X, ArrowUp, ArrowDown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GoogleDriveMedia, getGoogleDriveDisplayUrl } from './google-drive-media';
import { GoogleDriveInputForm } from './google-drive-input-form';

export interface UploadedImageItem {
  id?: string | null;
  driveFileId: string;
  filename: string;
  caption?: string | null;
  label?: string | null;
  date?: string | null;
  displayOrder: number;
  isCover: boolean;
  url: string;
}

interface MediaUploadProps {
  images: UploadedImageItem[];
  onChange: (images: UploadedImageItem[]) => void;
  allowMultiple?: boolean;
}

export function MediaUpload({
  images,
  onChange,
  allowMultiple = true,
}: MediaUploadProps) {
  const [showForm, setShowForm] = useState(false);

  const handleAddMedia = (media: { driveFileId: string; originalUrl: string; label?: string; caption?: string }) => {
    const displayUrl = getGoogleDriveDisplayUrl(media.driveFileId, 'image') || media.originalUrl;
    const newItem: UploadedImageItem = {
      driveFileId: media.driveFileId,
      filename: `drive-${media.driveFileId}.jpg`,
      url: displayUrl,
      caption: media.caption || '',
      label: media.label || '',
      date: new Date().toISOString().slice(0, 10),
      displayOrder: images.length + 1,
      isCover: images.length === 0,
    };

    if (allowMultiple) {
      onChange([...images, newItem]);
    } else {
      onChange([newItem]);
    }
    setShowForm(false);
  };

  const removeImage = (index: number) => {
    const next = images.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((img) => img.isCover)) {
      next[0].isCover = true;
    }
    onChange(next);
  };

  const setCover = (index: number) => {
    const next = images.map((img, i) => ({
      ...img,
      isCover: i === index,
    }));
    onChange(next);
  };

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const temp = next[index];
    next[index] = next[target];
    next[target] = temp;

    next.forEach((img, i) => {
      img.displayOrder = i + 1;
    });
    onChange(next);
  };

  const updateItem = (index: number, key: keyof UploadedImageItem, val: string) => {
    const next = [...images];
    next[index] = { ...next[index], [key]: val };
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {/* Header & Add Button */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-stone-800 uppercase tracking-wider">
          MEMORY PHOTOS ({images.length})
        </h4>
        {!showForm && (
          <Button
            type="button"
            onClick={() => setShowForm(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
            data-testid="button-add-drive-image"
          >
            <Plus className="w-4 h-4" /> ADD GOOGLE DRIVE IMAGE
          </Button>
        )}
      </div>

      {/* Link Input Form */}
      {showForm && (
        <GoogleDriveInputForm
          mediaType="image"
          onAddMedia={handleAddMedia}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Image Preview & Editor Cards */}
      {images.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {images.map((img, idx) => (
            <div
              key={(img.driveFileId || 'img') + idx}
              className="bg-amber-50/70 border border-stone-300 rounded-2xl p-4 flex flex-col gap-3 relative shadow-sm"
              data-testid={`media-item-${idx}`}
            >
              <div className="relative h-44 w-full overflow-hidden rounded-xl bg-stone-200">
                <GoogleDriveMedia
                  propUrl={img.url}
                  driveFileId={img.driveFileId}
                  alt={img.caption || img.filename}
                  className="h-full w-full object-cover"
                />
                {img.isCover && (
                  <span className="absolute top-2 left-2 rounded-md bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-md uppercase tracking-wider">
                    COVER PHOTO
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-stone-900/80 text-rose-300 hover:bg-rose-600 hover:text-white transition-colors"
                  aria-label="Remove image"
                  data-testid={`button-remove-image-${idx}`}
                >
                  <X size={15} />
                </button>
              </div>

              <div className="space-y-2 text-stone-800">
                <label className="block text-xs">
                  <span className="font-bold uppercase tracking-wider text-stone-600">Label</span>
                  <Input
                    value={img.label || ''}
                    onChange={(e) => updateItem(idx, 'label', e.target.value)}
                    placeholder='e.g. "First trip", "That smile ❤️"'
                    className="mt-1 h-8 text-xs bg-white border-stone-300"
                    data-testid={`input-image-label-${idx}`}
                  />
                </label>

                <label className="block text-xs">
                  <span className="font-bold uppercase tracking-wider text-stone-600">Caption</span>
                  <Input
                    value={img.caption || ''}
                    onChange={(e) => updateItem(idx, 'caption', e.target.value)}
                    placeholder='e.g. "I still remember how happy we were that day."'
                    className="mt-1 h-8 text-xs bg-white border-stone-300"
                    data-testid={`input-image-caption-${idx}`}
                  />
                </label>
              </div>

              <div className="mt-auto border-t border-stone-200 pt-3 flex items-center justify-between gap-2">
                {!img.isCover && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCover(idx)}
                    className="h-7 px-2.5 text-[11px] font-bold gap-1 rounded-lg text-rose-700 border-rose-300 hover:bg-rose-50"
                    data-testid={`button-set-cover-${idx}`}
                  >
                    <Star size={12} /> SET COVER
                  </Button>
                )}

                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveImage(idx, 'up')}
                    className="p-1 rounded bg-stone-200 text-stone-700 hover:bg-stone-300 disabled:opacity-30"
                    aria-label="Move image up"
                    data-testid={`button-move-up-${idx}`}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={idx === images.length - 1}
                    onClick={() => moveImage(idx, 'down')}
                    className="p-1 rounded bg-stone-200 text-stone-700 hover:bg-stone-300 disabled:opacity-30"
                    aria-label="Move image down"
                    data-testid={`button-move-down-${idx}`}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(idx)}
                    className="h-7 px-2 text-[11px] font-bold text-rose-600 hover:bg-rose-100 rounded-lg"
                    data-testid={`button-remove-image-btn-${idx}`}
                  >
                    REMOVE
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !showForm && (
          <div className="p-8 text-center rounded-2xl border-2 border-dashed border-stone-300 bg-amber-50/50">
            <p className="text-sm font-semibold text-stone-600">No images added yet.</p>
            <p className="text-xs text-stone-500 mt-1">Paste a Google Drive link to add images to this entry.</p>
          </div>
        )
      )}
    </div>
  );
}
