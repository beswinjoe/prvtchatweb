import { Trash2 } from 'lucide-react';
import React from 'react';

interface RevokeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  activeSlug: string;
}

export const RevokeModal: React.FC<RevokeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  activeSlug,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
          <Trash2 className="w-5 h-5" />
          <h3 className="text-base font-semibold">Destroy & Revoke Conversation?</h3>
        </div>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
          This action immediately invalidates <code className="font-mono">/{activeSlug}</code>,
          disconnects all active participants, and permanently deletes every encrypted message
          and image attachment from the database.
        </p>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Permanently Revoke Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
