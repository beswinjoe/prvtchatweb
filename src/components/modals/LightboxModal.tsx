import { Lock } from 'lucide-react';
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
      className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="max-w-4xl max-h-[85vh] relative" onClick={(e) => e.stopPropagation()}>
        <img
          src={image.dataUrl}
          alt={image.originalName}
          className="max-h-[80vh] w-auto rounded-xl border border-zinc-800 shadow-2xl"
        />
        <div className="mt-3 flex items-center justify-between text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Decrypted in client memory · {image.originalName}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700 cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
