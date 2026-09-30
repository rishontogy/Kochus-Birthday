import React, { useState } from 'react';
import { GoogleDriveMedia, parseGoogleDriveLink } from './google-drive-media';
import { HelpCircle, CheckCircle2, AlertTriangle, Eye, Plus, X, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';

interface GoogleDriveMediaInput {
  driveFileId: string;
  originalUrl: string;
  mediaType: 'image' | 'video';
  label?: string;
  caption?: string;
  isCover?: boolean;
}

interface GoogleDriveInputFormProps {
  mediaType?: 'image' | 'video';
  onAddMedia: (media: GoogleDriveMediaInput) => void;
  onCancel?: () => void;
  title?: string;
  isOpen?: boolean;
}

export const GoogleDriveInputForm: React.FC<GoogleDriveInputFormProps> = ({
  mediaType = 'image',
  onAddMedia,
  onCancel,
  title = mediaType === 'video' ? 'ADD GOOGLE DRIVE VIDEO' : 'ADD GOOGLE DRIVE IMAGE',
}) => {
  const [linkInput, setLinkInput] = useState('');
  const [labelInput, setLabelInput] = useState('');
  const [captionInput, setCaptionInput] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [isPreviewActive, setIsPreviewActive] = useState(false);
  const [previewError, setPreviewError] = useState(false);

  const parsed = parseGoogleDriveLink(linkInput, mediaType);
  const isValidLink = Boolean(parsed.driveFileId);

  const handlePreview = () => {
    if (!linkInput.trim()) return;
    setIsPreviewActive(true);
    setPreviewError(!isValidLink);
  };

  const handleAdd = () => {
    if (!isValidLink || !parsed.driveFileId) {
      setPreviewError(true);
      return;
    }
    onAddMedia({
      driveFileId: parsed.driveFileId,
      originalUrl: linkInput.trim(),
      mediaType: parsed.mediaType === 'video' ? 'video' : 'image',
      label: labelInput.trim() || undefined,
      caption: captionInput.trim() || undefined,
    });
    setLinkInput('');
    setLabelInput('');
    setCaptionInput('');
    setIsPreviewActive(false);
  };

  return (
    <div className="bg-amber-50/90 border-2 border-amber-200/80 rounded-2xl p-5 shadow-lg space-y-4 font-serif">
      <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
        <h3 className="text-lg font-bold text-stone-800 flex items-center gap-2">
          {mediaType === 'video' ? <VideoIcon className="w-5 h-5 text-rose-600" /> : <ImageIcon className="w-5 h-5 text-rose-600" />}
          {title}
        </h3>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="text-xs font-medium text-amber-800 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
          How to add Google Drive photo?
        </button>
      </div>

      {/* Help Section */}
      {showHelp && (
        <div className="bg-amber-100/90 border border-amber-300/80 rounded-xl p-4 text-xs text-stone-800 space-y-2 animate-fadeIn">
          <p className="font-bold text-amber-950">How to add a Google Drive photo / video:</p>
          <ol className="list-decimal list-inside space-y-1 text-stone-700">
            <li>Open your Google Drive.</li>
            <li>Select the photo or video file.</li>
            <li>Click <strong>Share</strong> and change General access to <strong>&ldquo;Anyone with the link can view&rdquo;</strong>.</li>
            <li>Click <strong>Copy link</strong>.</li>
            <li>Paste the link in the input box below.</li>
          </ol>
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="bg-amber-800 hover:bg-amber-900 text-amber-50 font-bold px-3 py-1 rounded-md text-xs shadow-xs"
            >
              GOT IT
            </button>
          </div>
        </div>
      )}

      {/* Inputs */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
            Google Drive {mediaType === 'video' ? 'Video' : 'Image'} Link *
          </label>
          <input
            type="text"
            value={linkInput}
            onChange={(e) => {
              setLinkInput(e.target.value);
              setIsPreviewActive(false);
              setPreviewError(false);
            }}
            placeholder="Paste Google Drive sharing link here (e.g. https://drive.google.com/file/d/FILE_ID/view)"
            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 focus:border-rose-400 shadow-xs"
            data-testid="drive-link-input"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Label (Optional)
            </label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder='e.g. "That beautiful day ❤️"'
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 shadow-xs"
              data-testid="drive-label-input"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1">
              Caption (Optional)
            </label>
            <input
              type="text"
              value={captionInput}
              onChange={(e) => setCaptionInput(e.target.value)}
              placeholder='e.g. "I still remember this moment."'
              className="w-full px-3 py-2 bg-white border border-stone-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/40 shadow-xs"
              data-testid="drive-caption-input"
            />
          </div>
        </div>
      </div>

      {/* Live Preview Box */}
      {isPreviewActive && (
        <div className="mt-3 p-3 bg-white border border-stone-200 rounded-xl shadow-inner space-y-2">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-rose-500" /> Real-time Preview
            </span>
            {isValidLink ? (
              <span className="text-emerald-700 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Google Drive Link Recognized
              </span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> Unable to parse file ID
              </span>
            )}
          </div>
          <div className="max-w-md mx-auto overflow-hidden rounded-lg">
            <GoogleDriveMedia
              propUrl={linkInput}
              driveFileId={parsed.driveFileId}
              mediaType={mediaType}
              label={labelInput}
              caption={captionInput}
              className="max-h-64"
            />
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-amber-200/50">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
          >
            CANCEL
          </button>
        )}
        <button
          type="button"
          onClick={handlePreview}
          disabled={!linkInput.trim()}
          className="px-4 py-2 text-xs font-semibold text-amber-900 bg-amber-200 hover:bg-amber-300 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
          data-testid="preview-media-button"
        >
          <Eye className="w-3.5 h-3.5" />
          PREVIEW
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!linkInput.trim()}
          className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          data-testid="add-media-button"
        >
          <Plus className="w-3.5 h-3.5" />
          ADD {mediaType === 'video' ? 'VIDEO' : 'IMAGE'}
        </button>
      </div>
    </div>
  );
};
