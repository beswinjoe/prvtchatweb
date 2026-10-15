import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Lock,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import { EXPIRATION_OPTIONS } from '../../lib/constants';
import type { ExpirationOption, SlugStatus } from '../../types';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  slugInput: string;
  setSlugInput: (v: string) => void;
  slugStatus: SlugStatus;
  selectedTtl: string;
  setSelectedTtl: (v: string) => void;
  isCreatingRoom: boolean;
  createError: string;
  onCreateRoom: (e?: React.FormEvent) => Promise<boolean>;
  createdRoomResult: {
    slug: string;
    shareUrl: string;
    expiresAt: number;
  } | null;
  onEnterCreatedChat: () => void;
}

export const CreateChatModal: React.FC<CreateChatModalProps> = ({
  isOpen,
  onClose,
  slugInput,
  setSlugInput,
  slugStatus,
  selectedTtl,
  setSelectedTtl,
  isCreatingRoom,
  createError,
  onCreateRoom,
  createdRoomResult,
  onEnterCreatedChat,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!createdRoomResult?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(createdRoomResult.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = createdRoomResult.shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!createdRoomResult?.shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `PRVTCHAT — /${createdRoomResult.slug}`,
          text: 'Private end-to-end encrypted chat link. Disappears when expired.',
          url: createdRoomResult.shareUrl,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md p-6 sm:p-7 overflow-hidden rounded-2xl glass-panel shadow-2xl shadow-indigo-950/40 border border-white/10">
        {/* Soft atmospheric gradient glow behind modal */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {!createdRoomResult ? (
          /* ================= CREATE FORM ================= */
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await onCreateRoom(e);
            }}
            className="space-y-5"
          >
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-2.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero-Knowledge E2EE</span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Create Private Chat
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Keys remain in your browser. Nothing is stored unencrypted.
              </p>
            </div>

            {/* Custom Link Slug Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-slate-300">
                  Custom Link Slug <span className="text-slate-500">(Optional)</span>
                </label>
                {slugStatus.reason && (
                  <span
                    className={`text-[11px] font-mono ${
                      slugStatus.available
                        ? 'text-emerald-400'
                        : slugStatus.checking
                        ? 'text-slate-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {slugStatus.reason}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-mono text-slate-500 select-none">
                  /
                </span>
                <input
                  type="text"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="afterhours"
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                  maxLength={40}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                Letters, numbers, and dashes. Leave blank for auto-generated.
              </p>
            </div>

            {/* Expiration Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Expiration</span>
                <span className="text-slate-500 font-normal">(Max 7 days)</span>
              </label>
              <div className="grid grid-cols-4 gap-2">
                {EXPIRATION_OPTIONS.map((opt: ExpirationOption) => {
                  const isSelected = selectedTtl === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedTtl(opt.id)}
                      className={`py-2 px-2.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                        isSelected
                          ? 'bg-indigo-600/25 border-indigo-500/60 text-white shadow-xs shadow-indigo-500/20'
                          : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="text-xs font-semibold">{opt.shortLabel}</span>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400">
                        {opt.id === '2h'
                          ? '2 Hours'
                          : opt.id === '24h'
                          ? '1 Day'
                          : opt.id === '3d'
                          ? '3 Days'
                          : '7 Days'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {createError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
                {createError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCreatingRoom || Boolean(slugInput && !slugStatus.available && !slugStatus.checking)}
              className="w-full py-3 px-4 rounded-xl btn-primary-gradient text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingRoom ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Generating Secure Keys...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Chat</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* ================= CREATED SUCCESS SCREEN ================= */
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mb-3">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Private Chat Ready
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Share this link with your peer. Encryption key is in the link fragment.
              </p>
            </div>

            {/* Link Box */}
            <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                Encrypted Link
              </span>
              <div className="font-mono text-xs text-slate-200 break-all select-all leading-relaxed max-h-24 overflow-y-auto">
                {createdRoomResult.shareUrl}
              </div>
            </div>

            {/* Actions: Copy & Native Share */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-slate-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                  title="Share via device"
                >
                  <Share2 className="w-4 h-4 text-slate-400" />
                  <span>Share</span>
                </button>
              )}
            </div>

            {/* Enter Chat Button */}
            <button
              type="button"
              onClick={onEnterCreatedChat}
              className="w-full py-3 px-4 rounded-xl btn-primary-gradient text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Enter Chat Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
