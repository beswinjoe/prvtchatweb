import {
  ArrowRight,
  Check,
  Code2,
  ExternalLink,
  Shield,
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
    <div className="relative flex-1 flex flex-col justify-between bg-[#5B9EEA] text-[#0B132B]">
      {/* Main Hero Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center max-w-4xl mx-auto pt-8 pb-14 sm:pt-12 sm:pb-20">
        {/* Top Centered Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#0B132B] text-xs font-medium mb-8 shadow-xs border border-white/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Local-First Private Workspace</span>
        </div>

        {/* Big Bold Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-[5rem] font-bold tracking-tight text-[#0B132B] max-w-4xl leading-[1.04] mb-6">
          Your words. Your privacy.<br />
          One clear picture.
        </h1>

        {/* Calm Supporting Paragraph */}
        <p className="text-base sm:text-lg md:text-xl text-[#142347] max-w-2xl font-normal leading-relaxed mb-10">
          PRVTCHAT brings your conversations, encrypted notes, and temporary rooms into a calm, private workspace.
          Built for absolute precision with zero server logs or bank credentials required.
        </p>

        {/* Two Large Pill Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md justify-center mb-6">
          <button
            type="button"
            onClick={onOpenCreateModal}
            className="w-full sm:w-auto px-7 py-3.5 btn-pill-black text-sm font-semibold flex items-center justify-center gap-3 cursor-pointer group shadow-sm"
          >
            <span>Open Workspace</span>
            <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <ArrowRight className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenSecurityModal}
            className="w-full sm:w-auto px-7 py-3.5 btn-pill-white text-sm font-semibold cursor-pointer shadow-sm"
          >
            <span>See how it works</span>
          </button>
        </div>

        {/* Subtle join link */}
        <p className="text-xs text-[#142347]/75 mb-12">
          Already received an invitation?{' '}
          <button
            type="button"
            onClick={onOpenJoinModal}
            className="underline font-semibold text-[#0B132B] hover:opacity-80 cursor-pointer"
          >
            Join room directly
          </button>
        </p>

        {/* Bottom Three White Pill Chips */}
        <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-3xl">
          <div className="pill-chip">
            <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>No bank connection required</span>
          </div>

          <div className="pill-chip">
            <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>Local storage on your device</span>
          </div>

          <div className="pill-chip">
            <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>Zero-Knowledge Web Crypto ready</span>
          </div>
        </div>
      </main>

      {/* Seamless Minimal Bottom Bar */}
      <footer className="py-5 px-6 bg-[#5B9EEA]">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#142347]/75">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0B132B]/60" />
            <span className="font-semibold text-[#0B132B]">PRVTCHAT</span>
            <span className="opacity-40">·</span>
            <span>Zero-Knowledge Workspace</span>
          </div>

          <div className="flex items-center gap-5 font-medium">
            <button
              type="button"
              onClick={onOpenSecurityModal}
              className="hover:text-[#0B132B] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Security & Privacy</span>
            </button>
            <a
              href="https://github.com/beswinjoe/prvtchatweb"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0B132B] transition-colors flex items-center gap-1.5"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Source</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};
