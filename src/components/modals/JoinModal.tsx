import { AlertTriangle, Key, Lock, X } from 'lucide-react';
import React from 'react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 sm:p-7 rounded-2xl glass-panel shadow-2xl shadow-indigo-950/40 border border-white/10 space-y-5 text-left">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Join Private Chat
              </h3>
              <p className="text-[11px] text-slate-400">
                Paste your invitation link to unlock conversation
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

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Paste Full Invitation Link
            </label>
            <input
              type="text"
              value={joinLinkInput}
              onChange={(e) => setJoinLinkInput(e.target.value)}
              placeholder="https://.../?room=afterhours#key=9xK2..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/50 transition-all"
            />
            <p className="text-[11px] text-slate-500">
              Must include the <code className="font-mono text-indigo-300">#key=</code> fragment for client decryption.
            </p>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-white/5" />
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider font-mono text-slate-500">
              Or Manual Credentials
            </span>
            <div className="flex-grow border-t border-white/5" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">
                Room Slug
              </label>
              <input
                type="text"
                value={joinSlugManual}
                onChange={(e) => setJoinSlugManual(e.target.value)}
                placeholder="afterhours"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-400">
                256-Bit Key
              </label>
              <input
                type="text"
                value={joinKeyManual}
                onChange={(e) => setJoinKeyManual(e.target.value)}
                placeholder="Base64URL key"
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 transition-all"
              />
            </div>
          </div>

          {joinError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl btn-primary-gradient text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Decrypt & Enter Room</span>
          </button>
        </form>
      </div>
    </div>
  );
};
