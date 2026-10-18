import { Download, Lock, X } from 'lucide-react';
import React, { useEffect } from 'react';
import type { ImageAttachment } from '../../types';

interface LightboxModalProps {
  image: ImageAttachment | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  image,
  onClose,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && image) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [image, onClose]);

  if (!image) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = image.dataUrl;
    a.download = image.originalName || 'prvtchat-image.jpg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      id="lightbox-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="lightbox-modal-dialog"
        className="max-w-4xl max-h-[90vh] relative flex flex-col items-center animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Controls */}
        <div className="absolute -top-12 right-0 flex items-center gap-2">
          <button
            id="lightbox-download-btn"
            type="button"
            onClick={handleDownload}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            title="Download image"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Save Image</span>
          </button>
          <button
            id="lightbox-close-btn"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <img
          id="lightbox-preview-image"
          src={image.dataUrl}
          alt={image.originalName}
          className="max-h-[80vh] w-auto rounded-2xl border border-white/20 shadow-2xl object-contain"
        />

        <div className="mt-3.5 flex items-center justify-between w-full text-xs font-mono text-zinc-300 px-2">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="truncate max-w-xs">{image.originalName}</span>
          </div>
          <span className="text-zinc-400">
            {Math.round(image.approxBytes / 1024)} KB · Decrypted
          </span>
        </div>
      </div>
    </div>
  );
};
