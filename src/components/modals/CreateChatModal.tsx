import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  Lock,
  Share2,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-6 sm:p-7 overflow-hidden rounded-2xl bg-white border border-zinc-200 shadow-2xl text-zinc-950">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
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
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-medium mb-2.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Zero-Knowledge E2EE</span>
              </div>
              <h3 className="text-xl font-bold text-zinc-950 tracking-tight">
                Create Private Chat
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Keys remain in your browser. Nothing is stored unencrypted.
              </p>
            </div>

            {/* Custom Link Slug Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-zinc-900">
                  Custom Link Slug <span className="text-zinc-400">(Optional)</span>
                </label>
                {slugStatus.reason && (
                  <span
                    className={`text-[11px] font-mono ${
                      slugStatus.available
                        ? 'text-emerald-700 font-medium'
                        : slugStatus.checking
                        ? 'text-zinc-500'
                        : 'text-rose-600'
                    }`}
                  >
                    {slugStatus.reason}
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-mono text-zinc-400 select-none">
                  /
                </span>
                <input
                  type="text"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="afterhours"
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-950 text-xs font-mono placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all"
                  maxLength={40}
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Letters, numbers, and dashes. Leave blank for auto-generated.
              </p>
            </div>

            {/* Expiration Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-600" />
                <span>Expiration</span>
                <span className="text-zinc-400 font-normal">(Max 7 days)</span>
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
                          ? 'bg-zinc-950 border-zinc-950 text-white shadow-xs'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <span className="text-xs font-semibold">{opt.shortLabel}</span>
                      <span className={`text-[9px] uppercase tracking-wider ${isSelected ? 'text-zinc-300' : 'text-zinc-400'}`}>
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
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {createError}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCreatingRoom || Boolean(slugInput && !slugStatus.available && !slugStatus.checking)}
              className="w-full py-3 px-4 rounded-xl btn-black text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingRoom ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Generating Secure Keys...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Create Chat</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* ================= CREATED SUCCESS SCREEN ================= */
          <div className="space-y-5 animate-in zoom-in-95 duration-200">
            <div>
              <div className="w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-950 flex items-center justify-center mb-3">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h3 className="text-xl font-bold text-zinc-950 tracking-tight">
                Private Chat Ready
              </h3>
              <p className="text-xs text-zinc-500 mt-1">
                Share this link with your peer. Encryption key is in the link fragment.
              </p>
            </div>

            {/* Link Box */}
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Encrypted Link
              </span>
              <div className="font-mono text-xs text-zinc-900 break-all select-all leading-relaxed max-h-24 overflow-y-auto">
                {createdRoomResult.shareUrl}
              </div>
            </div>

            {/* Actions: Copy & Native Share */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 px-3 rounded-xl btn-outline text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-zinc-600" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="py-2.5 px-3.5 rounded-xl btn-outline text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Share via device"
                >
                  <Share2 className="w-4 h-4 text-zinc-600" />
                  <span>Share</span>
                </button>
              )}
            </div>

            {/* Enter Chat Button */}
            <button
              type="button"
              onClick={onEnterCreatedChat}
              className="w-full py-3 px-4 rounded-xl btn-black text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
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
