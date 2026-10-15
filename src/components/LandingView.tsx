import {
  ArrowRight,
  Code2,
  ExternalLink,
  Flame,
  KeyRound,
  Lock,
  Shield,
  Sparkles,
} from 'lucide-react';
import React from 'react';

interface LandingViewProps {
  onOpenCreateModal: () => void;
  onOpenJoinModal: () => void;
  onOpenSecurityModal: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onOpenCreateModal,
  onOpenJoinModal,
  onOpenSecurityModal,
}) => {
  return (
    <div className="relative flex-1 flex flex-col justify-between overflow-hidden">
      {/* Soft atmospheric gradient lighting */}
      <div className="ambient-glow-top" />
      <div className="ambient-glow-bottom" />

      {/* Main Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center max-w-4xl mx-auto py-16 sm:py-24">
        {/* Subtle Lock Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-8 backdrop-blur-md shadow-xs shadow-indigo-500/10 hover:border-indigo-500/30 transition-colors">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Lock className="w-3.5 h-3.5 text-indigo-400" />
          <span>End-to-end encrypted</span>
        </div>

        {/* Memorable Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-3xl leading-[1.1] mb-6">
          Private conversations.{' '}
          <span className="text-gradient-accent block sm:inline">
            Nothing left behind.
          </span>
        </h1>

        {/* Short Supporting Sentence */}
        <p className="text-base sm:text-xl text-slate-400 max-w-xl font-normal leading-relaxed mb-10">
          Create an encrypted chat, share your link, and let it disappear when you&apos;re done.
        </p>

        {/* Primary Action Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md justify-center">
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl btn-primary-gradient text-white text-sm font-semibold flex items-center justify-center gap-2.5 shadow-lg shadow-indigo-500/25 cursor-pointer group"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>Create private chat</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={onOpenJoinModal}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white text-sm font-medium transition-colors cursor-pointer border border-white/10 backdrop-blur-md"
          >
            <span>Have a link? Join</span>
          </button>
        </div>

        {/* Micro-Features Strip */}
        <div className="mt-16 sm:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl text-left">
          <div className="p-4 rounded-xl glass-panel-subtle flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Client Keys Only</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Keys remain in your URL fragment. Never sent to any server.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl glass-panel-subtle flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 text-violet-400 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Authoritative Expiry</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Choose 2h, 24h, 3d, or 7d. Automatic server-side purge.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl glass-panel-subtle flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Instant Destruction</div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Destroy chat anytime to wipe message payloads instantly.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Clean Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-slate-400">PRVTCHAT</span>
            <span className="text-slate-600">·</span>
            <span>Zero-Knowledge Ephemeral Messaging</span>
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={onOpenSecurityModal}
              className="hover:text-slate-300 transition-colors cursor-pointer"
            >
              Security & Privacy
            </button>
            <a
              href="https://github.com/beswinjoe/prvtchatweb"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300 transition-colors flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Source</span>
              <ExternalLink className="w-3 h-3 text-slate-600" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
