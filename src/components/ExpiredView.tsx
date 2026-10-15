import { Flame, Info, Lock, ShieldAlert, Sparkles } from 'lucide-react';
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
    <main className="relative flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* Background glow blooms */}
      <div className="ambient-glow-top" />
      <div className="ambient-glow-bottom" />

      <div className="relative z-10 max-w-md w-full glass-panel border border-white/10 rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-2xl shadow-black/60 animate-in zoom-in-95 duration-200">
        {/* Status Icon */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto shadow-lg ${
            isRevoked
              ? 'bg-rose-500/15 border border-rose-500/30 text-rose-400 shadow-rose-950/40'
              : isKeyMismatch
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 shadow-amber-950/40'
              : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-indigo-950/40'
          }`}
        >
          {isRevoked ? (
            <Flame className="w-7 h-7 stroke-[2]" />
          ) : isKeyMismatch ? (
            <ShieldAlert className="w-7 h-7 stroke-[2]" />
          ) : (
            <Lock className="w-7 h-7 stroke-[2]" />
          )}
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <div
            className={`text-xs font-mono uppercase tracking-wider font-semibold ${
              isRevoked
                ? 'text-rose-400'
                : isKeyMismatch
                ? 'text-amber-400'
                : 'text-indigo-400'
            }`}
          >
            {isRevoked
              ? 'Manually Destroyed'
              : isExpired
              ? 'Retention Policy Expired'
              : isKeyMismatch
              ? 'Key Authorization Mismatch'
              : 'Room Unavailable'}
          </div>

          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isRevoked
              ? 'This conversation has been destroyed.'
              : isKeyMismatch
              ? 'Unauthorized Key'
              : isExpired
              ? 'This conversation has expired.'
              : `/${activeSlug || 'room'} is no longer available`}
          </h2>

          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
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
        <div className="p-3.5 rounded-xl bg-slate-900/80 border border-white/5 text-left space-y-1.5 text-[11px] text-slate-400">
          <div className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zero-Knowledge Shredding Guarantee</span>
          </div>
          <p className="leading-relaxed">
            Data wiped from the database cannot be retrieved. Content saved locally,
            copied, or screenshotted by participants while the session was active remains
            outside server revocation capability.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onStartNewChat || onReturnHome}
            className="w-full py-3 px-4 rounded-xl btn-primary-gradient text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-500/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start a New Private Chat</span>
          </button>

          <button
            type="button"
            onClick={onReturnHome}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium transition-colors cursor-pointer border border-white/5"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    </main>
  );
};
