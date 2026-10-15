import { Lock, X } from 'lucide-react';
import React from 'react';
import type { ImageAttachment } from '../../types';

interface LightboxModalProps {
  image: ImageAttachment | null;
  onClose: () => void;
}

export const LightboxModal: React.FC<LightboxModalProps> = ({
  image,
  onClose,
}) => {
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="max-w-4xl max-h-[90vh] relative flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <img
          src={image.dataUrl}
          alt={image.originalName}
          className="max-h-[80vh] w-auto rounded-2xl border border-white/10 shadow-2xl shadow-indigo-950/40 object-contain"
        />

        <div className="mt-3.5 flex items-center justify-between w-full text-xs font-mono text-slate-400 px-2">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span className="truncate max-w-xs">{image.originalName}</span>
          </div>
          <span className="text-slate-500">
            {Math.round(image.approxBytes / 1024)} KB · Decrypted
          </span>
        </div>
      </div>
    </div>
  );
};
