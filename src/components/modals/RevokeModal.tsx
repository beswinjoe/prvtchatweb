import { AlertTriangle, Flame, Loader2, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface RevokeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<{ success: boolean; error?: string } | void>;
  activeSlug: string;
}

export const RevokeModal: React.FC<RevokeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  activeSlug,
}) => {
  const [isRevoking, setIsRevoking] = useState(false);
  const [revokeError, setRevokeError] = useState('');

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isRevoking) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isRevoking]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsRevoking(true);
    setRevokeError('');
    try {
      const res = await onConfirm();
      if (res && !res.success) {
        setRevokeError(res.error || 'Failed to destroy conversation on server.');
        setIsRevoking(false);
      }
    } catch (err: unknown) {
      setRevokeError(err instanceof Error ? err.message : 'Failed to destroy conversation.');
      setIsRevoking(false);
    }
  };

  return (
    <div
      id="revoke-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isRevoking) onClose();
      }}
    >
      <div
        id="revoke-modal-dialog"
        className="relative w-full max-w-md p-6 sm:p-7 rounded-2xl bg-white border border-zinc-200/80 shadow-2xl space-y-5 text-left text-zinc-950 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-xs">
              <Flame className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 tracking-tight">
                Destroy Conversation?
              </h3>
              <p className="text-[11px] font-mono text-zinc-500">
                /{activeSlug}
              </p>
            </div>
          </div>
          <button
            id="revoke-modal-close-btn"
            type="button"
            disabled={isRevoking}
            onClick={() => {
              setRevokeError('');
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close revoke modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Body */}
        <div className="space-y-2 text-xs text-zinc-600 leading-relaxed">
          <p>
            This action immediately marks <code className="font-mono text-zinc-900 font-medium bg-zinc-100 px-1 py-0.5 rounded">/{activeSlug}</code> as
            revoked and permanently wipes all encrypted messages, images, and participant data.
          </p>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] flex items-start gap-2 shadow-inner">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>
              This cannot be undone. All active participants will be disconnected immediately and the room will cease to exist.
            </span>
          </div>

          {revokeError && (
            <div
              id="revoke-error-banner"
              className="p-3 rounded-xl bg-red-100 border border-red-200 text-red-900 text-xs font-medium animate-fade-in"
            >
              {revokeError}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            id="revoke-cancel-btn"
            type="button"
            disabled={isRevoking}
            onClick={() => {
              setRevokeError('');
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            id="revoke-confirm-btn"
            type="button"
            disabled={isRevoking}
            onClick={handleConfirm}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-colors disabled:opacity-60 active:scale-98"
          >
            {isRevoking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Destroying...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Destroy Chat Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
