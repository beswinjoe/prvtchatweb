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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-6 sm:p-7 rounded-2xl bg-white border border-zinc-200 shadow-xl space-y-5 text-left text-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 tracking-tight">
                Share Encrypted Chat Link
              </h3>
              <p className="text-[11px] font-mono text-zinc-500">
                /{activeSlug}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Link Box */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-900">
            Shareable Invitation Link (Includes Decryption Key in Fragment)
          </label>
          <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 font-mono text-xs break-all text-zinc-900 select-all max-h-28 overflow-y-auto leading-relaxed">
            {fullInvitationUri}
          </div>
          <p className="text-[11px] text-zinc-500">
            Send this to your participant. The encryption key never touches any server.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => onCopy(fullInvitationUri, 'share-modal-full-uri')}
            className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 btn-black text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md"
          >
            {copiedId === 'share-modal-full-uri' ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Link Copied</span>
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
              className="py-2.5 px-3.5 rounded-xl btn-outline text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-zinc-600" />
              <span>Share</span>
            </button>
          )}
        </div>

        {/* Out-of-band Verification Fingerprint */}
        <div className="pt-2 border-t border-zinc-100">
          <button
            type="button"
            onClick={() => setShowFingerprint((prev) => !prev)}
            className="text-[11px] text-zinc-600 hover:text-zinc-950 flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Fingerprint className="w-3.5 h-3.5 text-zinc-500" />
            <span>{showFingerprint ? 'Hide' : 'Verify'} SHA-256 Key Fingerprint</span>
          </button>

          {showFingerprint && (
            <div className="mt-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1 animate-in fade-in duration-150">
              <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 block">
                Session Key Safety Number
              </span>
              <div className="font-mono text-xs text-zinc-900 tracking-wider">
                {fingerprint || 'Computing fingerprint...'}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Both participants can compare this number out-of-band to verify zero eavesdropping.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
