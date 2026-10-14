import { Info, ShieldAlert } from 'lucide-react';
import React from 'react';
import type { ExpiredReason } from '../types';

interface ExpiredViewProps {
  expiredReason: ExpiredReason | null;
  activeSlug: string;
  onReturnHome: () => void;
}

export const ExpiredView: React.FC<ExpiredViewProps> = ({
  expiredReason,
  activeSlug,
  onReturnHome,
}) => {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-rose-500">
            {expiredReason === 'revoked' && 'Conversation Revoked & Purged'}
            {expiredReason === 'expired' && 'Retention Policy Expired'}
            {expiredReason === 'invalid_key' && 'Cryptographic Key Mismatch'}
            {expiredReason === 'not_found' && 'Room Unavailable'}
          </div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {expiredReason === 'invalid_key'
              ? 'Decryption Key Unauthorized'
              : `/${activeSlug || 'conversation'} is no longer available`}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {expiredReason === 'revoked' &&
              'A participant revoked this invitation link. All encrypted message records and attachments stored in the database have been permanently deleted.'}
            {expiredReason === 'expired' &&
              'This conversation reached its configured expiration time. Its encrypted timeline and presence records have been automatically purged.'}
            {expiredReason === 'invalid_key' &&
              'The 256-bit key in your URL fragment does not match the zero-knowledge commitment for this conversation. Without the exact key, ciphertexts cannot be decrypted.'}
            {expiredReason === 'not_found' &&
              'No active conversation exists at this URL slug, or it was previously destroyed.'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 text-left space-y-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
          <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-emerald-500" />
            <span>Deletion & Ephemerality Guarantee</span>
          </div>
          <p>
            Server records are unrecoverable once purged. Note that any content previously
            copied, screenshotted, or saved locally by a participant while the session was
            active remains outside server revocation control.
          </p>
        </div>

        <button
          type="button"
          onClick={onReturnHome}
          className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium transition-colors cursor-pointer"
        >
          Return to Vesper Homepage
        </button>
      </div>
    </main>
  );
};
