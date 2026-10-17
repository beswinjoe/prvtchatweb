import { AlertTriangle, Flame, Loader2, Trash2, X } from 'lucide-react';
import React, { useState } from 'react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md p-6 sm:p-7 rounded-2xl bg-white border border-zinc-200 shadow-2xl space-y-5 text-left text-zinc-950">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
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
            type="button"
            disabled={isRevoking}
            onClick={() => {
              setRevokeError('');
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Warning Body */}
        <div className="space-y-2 text-xs text-zinc-600 leading-relaxed">
          <p>
            This action immediately marks <code className="font-mono text-zinc-900 font-medium">/{activeSlug}</code> as
            revoked and permanently deletes all stored encrypted messages, images, and participant data.
          </p>
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span>
              This cannot be undone. Active participants will be disconnected immediately.
            </span>
          </div>

          {revokeError && (
            <div className="p-3 rounded-xl bg-red-100 border border-red-200 text-red-900 text-xs font-medium">
              {revokeError}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            disabled={isRevoking}
            onClick={() => {
              setRevokeError('');
              onClose();
            }}
            className="px-4 py-2.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isRevoking}
            onClick={handleConfirm}
            className="px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors disabled:opacity-60"
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
