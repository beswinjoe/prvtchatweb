import { Check, Copy, Hash, Key, Share2, X } from 'lucide-react';
import React from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullInvitationUri: string;
  activeSlug: string;
  activeKeyString: string;
  fingerprint: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onNativeShare: () => void;
  onSimulatePeer: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  fullInvitationUri,
  activeSlug,
  activeKeyString,
  fingerprint,
  copiedId,
  onCopy,
  onNativeShare,
  onSimulatePeer,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Share Encrypted Invitation Link
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

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Complete Invitation Link (Includes <code className="font-mono">#key=</code> Fragment)
            </label>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 font-mono text-xs break-all text-zinc-800 dark:text-zinc-200">
              {fullInvitationUri}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => onCopy(fullInvitationUri, 'modal-full-uri')}
                className="flex-1 py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedId === 'modal-full-uri' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Invitation Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Complete Invitation Link</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={onNativeShare}
                className="py-2 px-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-medium cursor-pointer flex items-center gap-1.5"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Native Share</span>
              </button>
            </div>
          </div>

          {/* Out-of-Band Split Option */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#09090B]/60 border border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
            <div className="text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-between">
              <span>Split-Channel Security (Optional)</span>
              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                Out-of-Band Key
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Send the room slug over one channel and the 256-bit secret key over another.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => onCopy(activeSlug, 'copy-slug-only')}
                className="py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-mono flex items-center justify-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                {copiedId === 'copy-slug-only' ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Hash className="w-3 h-3" />
                )}
                <span>Copy Slug (/{activeSlug})</span>
              </button>
              <button
                type="button"
                onClick={() => onCopy(activeKeyString, 'copy-key-only')}
                className="py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-mono flex items-center justify-center gap-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
              >
                {copiedId === 'copy-key-only' ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Key className="w-3 h-3 text-emerald-500" />
                )}
                <span>Copy 256-Bit Key</span>
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-mono text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
            <span>Key Fingerprint: {fingerprint}</span>
            <button
              type="button"
              onClick={onSimulatePeer}
              className="underline hover:text-emerald-400 cursor-pointer"
            >
              Simulate Peer Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
