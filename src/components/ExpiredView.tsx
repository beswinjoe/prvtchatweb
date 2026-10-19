import { Flame, Info, Lock, ShieldAlert } from 'lucide-react';
import React from 'react';
import type { ExpiredReason } from '../types';

interface ExpiredViewProps {
  expiredReason: ExpiredReason | null;
  activeSlug: string;
  onReturnHome: () => void;
  onStartNewChat?: () => void;
}

export const ExpiredView: React.FC<ExpiredViewProps> = ({
  expiredReason,
  activeSlug,
  onReturnHome,
  onStartNewChat,
}) => {
  const isRevoked = expiredReason === 'revoked';
  const isExpired = expiredReason === 'expired';
  const isKeyMismatch = expiredReason === 'invalid_key';

  return (
    <main className="relative flex-1 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-white to-zinc-50 text-zinc-950">
      <div className="max-w-md w-full card-clean rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-md animate-scale-in">
        {/* Status Icon */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto transition-colors ${
            isRevoked
              ? 'bg-rose-50 border border-rose-200 text-rose-600'
              : isKeyMismatch
              ? 'bg-amber-50 border border-amber-200 text-amber-600'
              : 'bg-zinc-50 border border-zinc-200 text-zinc-700'
          }`}
        >
          {isRevoked ? (
            <Flame className="w-7 h-7 stroke-[1.8]" />
          ) : isKeyMismatch ? (
            <ShieldAlert className="w-7 h-7 stroke-[1.8]" />
          ) : (
            <Lock className="w-7 h-7 stroke-[1.8]" />
          )}
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <div
            className={`text-xs font-mono uppercase tracking-wider font-semibold ${
              isRevoked
                ? 'text-rose-600'
                : isKeyMismatch
                ? 'text-amber-600'
                : 'text-zinc-500'
            }`}
          >
            {isRevoked
              ? 'Destroyed'
              : isExpired
              ? 'Expired'
              : isKeyMismatch
              ? 'Key Mismatch'
              : 'Room Unavailable'}
          </div>

          <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">
            {isRevoked
              ? 'This conversation has been destroyed.'
              : isKeyMismatch
              ? 'Unauthorized Key'
              : isExpired
              ? 'This conversation has expired.'
              : `/${activeSlug || 'room'} is no longer available`}
          </h2>

          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed max-w-sm mx-auto">
            {isRevoked
              ? 'A participant initiated instant destruction. All stored ciphertexts, presence records, and attachments have been permanently deleted.'
              : isExpired
              ? 'This chat reached its configured expiration limit. The message records and attachments were automatically purged.'
              : isKeyMismatch
              ? 'The 256-bit encryption key in your link fragment does not match the zero-knowledge commitment for this conversation.'
              : 'This conversation does not exist or has already been wiped.'}
          </p>
        </div>

        {/* Ephemerality Disclosure Box */}
        <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 text-left space-y-1.5 text-[11px] text-zinc-600">
          <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-zinc-700" />
            <span>Deletion Guarantee</span>
          </div>
          <p className="leading-relaxed">
            Data wiped from the database cannot be retrieved. Content saved locally,
            copied, or screenshotted by participants while the session was active remains
            outside server revocation capability.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            id="expired-new-chat"
            onClick={onStartNewChat || onReturnHome}
            className="w-full py-3 px-4 rounded-xl btn-black text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Start a New Private Chat</span>
          </button>

          <button
            type="button"
            id="expired-return-home"
            onClick={() => {
              try {
                window.history.replaceState(null, '', '/');
              } catch {
                // Ignore
              }
              if (onReturnHome) {
                try {
                  onReturnHome();
                  return;
                } catch (err) {
                  console.error('onReturnHome error:', err);
                }
              }
              window.location.replace('/');
            }}
            className="w-full py-2.5 px-4 rounded-xl btn-outline text-xs font-medium cursor-pointer flex items-center justify-center text-zinc-900 transition-all duration-200"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    </main>
  );
};
