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
    <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Join Encrypted Conversation
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Paste Full Invitation Link (with <code className="font-mono">#key=</code>)
            </label>
            <input
              type="text"
              value={joinLinkInput}
              onChange={(e) => setJoinLinkInput(e.target.value)}
              placeholder="https://vesper.link/?room=afterhours#key=8f9d2a..."
              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#09090B] px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300"
            />
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
            <span className="flex-shrink mx-3 text-[10px] uppercase tracking-wider font-mono text-zinc-400">
              Or enter Split Credentials
            </span>
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-800" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Room Slug
              </label>
              <input
                type="text"
                value={joinSlugManual}
                onChange={(e) => setJoinSlugManual(e.target.value)}
                placeholder="afterhours"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#09090B] px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                256-Bit Key
              </label>
              <input
                type="text"
                value={joinKeyManual}
                onChange={(e) => setJoinKeyManual(e.target.value)}
                placeholder="Base64URL secret"
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#09090B] px-3 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 focus:outline-none"
              />
            </div>
          </div>

          {joinError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{joinError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl font-medium text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Verify Commitment & Enter Room</span>
          </button>
        </form>
      </div>
    </div>
  );
};
