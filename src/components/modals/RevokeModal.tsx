import { AlertTriangle, Flame, Trash2, X } from 'lucide-react';
import React from 'react';

interface RevokeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  activeSlug: string;
}

export const RevokeModal: React.FC<RevokeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  activeSlug,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 sm:p-7 rounded-2xl glass-panel shadow-2xl shadow-rose-950/40 border border-rose-500/20 space-y-5 text-left">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <Flame className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Destroy Conversation?
              </h3>
              <p className="text-[11px] font-mono text-rose-400">
                /{activeSlug}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Body */}
        <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
          <p>
            This action immediately marks <code className="font-mono text-indigo-300">/{activeSlug}</code> as
            revoked and permanently deletes all stored encrypted messages, images, and participant data.
          </p>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>
              This cannot be undone. Active participants will be disconnected immediately.
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors cursor-pointer border border-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Destroy Chat Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
