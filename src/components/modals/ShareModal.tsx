import { Check, Copy, Fingerprint, Share2, X } from 'lucide-react';
import React, { useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullInvitationUri: string;
  activeSlug: string;
  fingerprint: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onNativeShare: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  fullInvitationUri,
  activeSlug,
  fingerprint,
  copiedId,
  onCopy,
  onNativeShare,
}) => {
  const [showFingerprint, setShowFingerprint] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg p-6 sm:p-7 rounded-2xl glass-panel shadow-2xl shadow-indigo-950/40 border border-white/10 space-y-5 text-left">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Share Encrypted Chat Link
              </h3>
              <p className="text-[11px] font-mono text-slate-400">
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

        {/* Link Box */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300">
            Shareable Invitation Link (Includes Decryption Key in Fragment)
          </label>
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 font-mono text-xs break-all text-slate-200 select-all max-h-28 overflow-y-auto leading-relaxed">
            {fullInvitationUri}
          </div>
          <p className="text-[11px] text-slate-500">
            Send this to your participant. The encryption key never touches any server.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onCopy(fullInvitationUri, 'share-modal-full-uri')}
            className="flex-1 py-2.5 px-4 rounded-xl btn-primary-gradient text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20"
          >
            {copiedId === 'share-modal-full-uri' ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Link Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Invitation Link</span>
              </>
            )}
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={onNativeShare}
              className="py-2.5 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          )}
        </div>

        {/* Out-of-band Verification Fingerprint */}
        <div className="pt-2 border-t border-white/5">
          <button
            type="button"
            onClick={() => setShowFingerprint((prev) => !prev)}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Fingerprint className="w-3.5 h-3.5" />
            <span>{showFingerprint ? 'Hide' : 'Verify'} SHA-256 Key Fingerprint</span>
          </button>

          {showFingerprint && (
            <div className="mt-2.5 p-3 rounded-xl bg-slate-900/70 border border-white/5 space-y-1 animate-in fade-in duration-150">
              <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 block">
                Session Key Safety Number
              </span>
              <div className="font-mono text-xs text-indigo-300 tracking-wider">
                {fingerprint || 'Computing fingerprint...'}
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Both participants can compare this number out-of-band to guarantee zero eavesdropping.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
