import {
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Copy,
  Lock,
  QrCode,
  Share2,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';
import { EXPIRATION_OPTIONS } from '../../lib/constants';
import { formatTimeRemaining } from '../../lib/expiry';
import type { ExpirationOption, SlugStatus } from '../../types';

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  slugInput: string;
  setSlugInput: (v: string) => void;
  slugStatus: SlugStatus;
  selectedTtl: string;
  setSelectedTtl: (v: string) => void;
  customExpiresAt: number | null;
  setCustomExpiresAt: (v: number | null) => void;
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
  customExpiresAt,
  setCustomExpiresAt,
  isCreatingRoom,
  createError,
  onCreateRoom,
  createdRoomResult,
  onEnterCreatedChat,
}) => {
  const [copied, setCopied] = useState(false);
  const [now] = useState(() => Date.now());
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

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

  // Generate QR code for created room
  useEffect(() => {
    if (createdRoomResult?.shareUrl) {
      QRCode.toDataURL(createdRoomResult.shareUrl, {
        width: 280,
        margin: 2,
        color: { dark: '#09090b', light: '#ffffff' },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => {});
    }
  }, [createdRoomResult]);

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

  // Helper to format timestamp into YYYY-MM-DDTHH:mm for datetime-local input
  const toLocalIso = (ts: number): string => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const minTime = now + 5 * 60 * 1000; // minimum 5 mins in future
  const maxTime = now + 7 * 24 * 60 * 60 * 1000; // maximum 7 days

  const currentCustomVal = customExpiresAt || (now + 12 * 3600 * 1000);
  const dateTimeInputValue = toLocalIso(currentCustomVal);

  const handleCustomDateChange = (valStr: string) => {
    if (!valStr) return;
    const parsed = new Date(valStr).getTime();
    if (parsed > 0) {
      setCustomExpiresAt(parsed);
    }
  };

  const setRelativeDuration = (ms: number) => {
    const target = Date.now() + ms;
    setCustomExpiresAt(Math.min(target, maxTime));
  };

  const formatExpiryPreview = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div
      id="create-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="create-modal-dialog"
        className="relative w-full max-w-md max-h-[calc(100vh-2rem)] overflow-y-auto p-6 sm:p-7 rounded-2xl bg-white border border-zinc-200/80 shadow-2xl text-zinc-950 animate-scale-in"
      >
        {/* Close Button */}
        <button
          id="create-modal-close-btn"
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
            id="create-chat-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await onCreateRoom(e);
            }}
            className="space-y-5"
          >
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-medium mb-2.5 shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-zinc-700" />
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
                <label htmlFor="create-slug-input" className="font-medium text-zinc-900">
                  Custom Link Slug <span className="text-zinc-400 font-normal">(Optional)</span>
                </label>
                {slugStatus.reason && (
                  <span
                    id="slug-status-indicator"
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
                  id="create-slug-input"
                  type="text"
                  value={slugInput}
                  onChange={(e) => setSlugInput(e.target.value)}
                  placeholder="afterhours"
                  className="w-full pl-7 pr-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-950 text-xs font-mono placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all shadow-xs"
                  maxLength={40}
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Letters, numbers, and dashes. Leave blank for auto-generated slug.
              </p>
            </div>

            {/* Expiration Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-zinc-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Expiration Duration</span>
                </label>
                <span className="text-[11px] text-zinc-400">Max 7 days retention</span>
              </div>

              {/* 5 options grid: 2h, 24h, 3d, 7d, Custom */}
              <div className="grid grid-cols-5 gap-1.5">
                {EXPIRATION_OPTIONS.map((opt: ExpirationOption) => {
                  const isSelected = selectedTtl === opt.id;
                  return (
                    <button
                      key={opt.id}
                      id={`ttl-opt-${opt.id}`}
                      type="button"
                      onClick={() => setSelectedTtl(opt.id)}
                      className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                        isSelected
                          ? 'bg-zinc-950 border-zinc-950 text-white shadow-xs scale-102 font-medium'
                          : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
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

                {/* Custom Option Button */}
                <button
                  id="ttl-opt-custom"
                  type="button"
                  onClick={() => {
                    setSelectedTtl('custom');
                    if (!customExpiresAt) {
                      setCustomExpiresAt(Date.now() + 12 * 3600 * 1000);
                    }
                  }}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 border ${
                    selectedTtl === 'custom'
                      ? 'bg-zinc-950 border-zinc-950 text-white shadow-xs scale-102 font-medium'
                      : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300'
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Custom
                  </span>
                  <span className={`text-[9px] uppercase tracking-wider ${selectedTtl === 'custom' ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    Exact Date
                  </span>
                </button>
              </div>

              {/* Custom Date & Time Picker */}
              {selectedTtl === 'custom' && (
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-3 animate-fade-in shadow-inner">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                      Custom Expire Date & Time
                    </span>
                    {customExpiresAt && (
                      <span className="font-mono text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {formatTimeRemaining(customExpiresAt)}
                      </span>
                    )}
                  </div>

                  <input
                    id="create-custom-date-picker"
                    type="datetime-local"
                    value={dateTimeInputValue}
                    min={toLocalIso(minTime)}
                    max={toLocalIso(maxTime)}
                    onChange={(e) => handleCustomDateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-zinc-300 text-xs font-mono text-zinc-900 focus:outline-none focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 transition-all cursor-pointer shadow-xs"
                  />

                  {customExpiresAt && (
                    <p className="text-[11px] text-zinc-600">
                      Chat will burn permanently on <strong className="text-zinc-900">{formatExpiryPreview(customExpiresAt)}</strong>.
                    </p>
                  )}

                  {/* Quick duration presets */}
                  <div className="flex items-center flex-wrap gap-1.5 pt-1 border-t border-zinc-200 text-[10px]">
                    <span className="text-zinc-400 mr-0.5">Quick add:</span>
                    <button
                      type="button"
                      onClick={() => setRelativeDuration(30 * 60 * 1000)}
                      className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
                    >
                      +30m
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDuration(1 * 3600 * 1000)}
                      className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
                    >
                      +1h
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDuration(6 * 3600 * 1000)}
                      className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
                    >
                      +6h
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDuration(12 * 3600 * 1000)}
                      className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
                    >
                      +12h
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDuration(2 * 24 * 3600 * 1000)}
                      className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
                    >
                      +2d
                    </button>
                    <button
                      type="button"
                      onClick={() => setRelativeDuration(5 * 24 * 3600 * 1000)}
                      className="px-2 py-0.5 rounded-md bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition-colors cursor-pointer"
                    >
                      +5d
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {createError && (
              <div
                id="create-error-banner"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium"
              >
                {createError}
              </div>
            )}

            {/* Submit Button */}
            <button
              id="create-chat-submit-btn"
              type="submit"
              disabled={isCreatingRoom || Boolean(slugInput && !slugStatus.available && !slugStatus.checking)}
              className="w-full py-3.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 btn-black text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingRoom ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Generating Secure Keys & Link...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Create Chat & Generate Link</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* ================= CREATED SUCCESS SCREEN ================= */
          <div className="space-y-5 animate-scale-in">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mb-3 shadow-xs">
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
            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1.5 shadow-inner">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">
                Encrypted Link
              </span>
              <div
                id="created-room-url"
                className="font-mono text-xs text-zinc-900 break-all select-all leading-relaxed max-h-24 overflow-y-auto"
              >
                {createdRoomResult.shareUrl}
              </div>
            </div>

            {/* QR Code toggle section */}
            {showQr && qrDataUrl && (
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col items-center animate-fade-in">
                <img
                  src={qrDataUrl}
                  alt="QR Code"
                  className="w-44 h-44 rounded-lg object-contain bg-white p-2 border border-zinc-200 shadow-xs"
                />
                <span className="text-[11px] text-zinc-500 mt-2">
                  Scan to enter room instantly
                </span>
              </div>
            )}

            {/* Actions: Copy & Native Share & QR toggle */}
            <div className="flex gap-2">
              <button
                id="created-copy-link-btn"
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

              <button
                id="created-toggle-qr-btn"
                type="button"
                onClick={() => setShowQr((prev) => !prev)}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                  showQr
                    ? 'bg-zinc-900 text-white border-zinc-900'
                    : 'btn-outline text-zinc-700'
                }`}
                title="Toggle QR Code"
              >
                <QrCode className="w-4 h-4" />
                <span>{showQr ? 'Hide QR' : 'QR Code'}</span>
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  id="created-native-share-btn"
                  type="button"
                  onClick={handleNativeShare}
                  className="py-2.5 px-3 rounded-xl btn-outline text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Share via device"
                >
                  <Share2 className="w-4 h-4 text-zinc-600" />
                  <span>Share</span>
                </button>
              )}
            </div>

            {/* Enter Chat Button */}
            <button
              id="enter-created-chat-btn"
              type="button"
              onClick={onEnterCreatedChat}
              className="w-full py-3.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 btn-black text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md active:scale-98"
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
