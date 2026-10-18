import { AlertTriangle, Key, Lock, X } from 'lucide-react';
import React, { useEffect } from 'react';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  joinLinkInput: string;
  setJoinLinkInput: (v: string) => void;
  joinSlugManual: string;
  setJoinSlugManual: (v: string) => void;
  joinKeyManual: string;
  setJoinKeyManual: (v: string) => void;
  joinError: string;
}

export const JoinModal: React.FC<JoinModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  joinLinkInput,
  setJoinLinkInput,
  joinSlugManual,
  setJoinSlugManual,
  joinKeyManual,
  setJoinKeyManual,
  joinError,
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="join-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="join-modal-dialog"
        className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto p-6 sm:p-7 rounded-2xl bg-white border border-zinc-200/80 shadow-2xl space-y-5 text-left text-zinc-950 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shadow-xs">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 tracking-tight">
                Join Private Chat
              </h3>
              <p className="text-[11px] text-zinc-500">
                Paste your invitation link to unlock conversation
              </p>
            </div>
          </div>
          <button
            id="join-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close join modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form id="join-chat-form" onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="join-link-input" className="text-xs font-medium text-zinc-900">
              Paste Full Invitation Link
            </label>
            <input
              id="join-link-input"
              type="text"
              value={joinLinkInput}
              onChange={(e) => setJoinLinkInput(e.target.value)}
              placeholder="https://.../?room=afterhours#key=9xK2..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-950 text-xs font-mono placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-xs"
              autoFocus
            />
            <p className="text-[11px] text-zinc-500">
              Must include the <code className="font-mono text-zinc-900 bg-zinc-100 px-1 py-0.5 rounded">#key=</code> fragment for client-side decryption.
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-200" />
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider font-mono text-zinc-400">
              Or Manual Credentials
            </span>
            <div className="flex-grow border-t border-zinc-200" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label htmlFor="join-slug-manual" className="text-[11px] font-medium text-zinc-700">
                Room Slug
              </label>
              <input
                id="join-slug-manual"
                type="text"
                value={joinSlugManual}
                onChange={(e) => setJoinSlugManual(e.target.value)}
                placeholder="afterhours"
                className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-950 text-xs font-mono placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 transition-all shadow-xs"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="join-key-manual" className="text-[11px] font-medium text-zinc-700">
                256-Bit Key
              </label>
              <input
                id="join-key-manual"
                type="text"
                value={joinKeyManual}
                onChange={(e) => setJoinKeyManual(e.target.value)}
                placeholder="Base64URL key"
                className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-200 text-zinc-950 text-xs font-mono placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 transition-all shadow-xs"
              />
            </div>
          </div>

          {joinError && (
            <div
              id="join-error-banner"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2 animate-fade-in font-medium"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{joinError}</span>
            </div>
          )}

          <button
            id="join-submit-btn"
            type="submit"
            className="w-full py-3.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 btn-black text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Decrypt & Enter Room</span>
          </button>
        </form>
      </div>
    </div>
  );
};
