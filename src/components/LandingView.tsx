import {
  ArrowRight,
  Check,
  Code2,
  ExternalLink,
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
    <div className="relative flex-1 flex flex-col justify-between bg-hero-mesh text-[#0B132B] overflow-hidden">
      {/* Ambient Morning Radiance Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Soft early sunrise warmth */}
        <div
          className="absolute -top-28 right-[10%] w-[32rem] h-[32rem] rounded-full opacity-60 animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(254, 243, 199, 0.6) 0%, rgba(254, 249, 235, 0.15) 50%, transparent 70%)',
          }}
        />
        {/* Fresh morning sky luminescence */}
        <div
          className="absolute -bottom-32 -left-20 w-[30rem] h-[30rem] rounded-full opacity-50"
          style={{
            background: 'radial-gradient(circle, rgba(219, 234, 254, 0.55) 0%, rgba(239, 246, 255, 0.15) 50%, transparent 70%)',
          }}
        />
        {/* Gentle morning mist radiance */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[42rem] rounded-full opacity-35"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.75) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* Main Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center max-w-4xl mx-auto pt-8 pb-14 sm:pt-12 sm:pb-20">
        <div className="stagger-children">
          {/* Top Centered Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-surface text-[#0B132B] text-xs font-medium mb-8 shadow-xs border border-white/90">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
            <span>End-to-End Encrypted Workspace</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 opacity-80" />
          </div>

          {/* Big Bold Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-[5rem] font-bold tracking-tight text-[#0B132B] max-w-4xl leading-[1.04] mb-6">
            Your words. Your privacy.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0F172A] via-[#1E3A8A] to-[#0F172A]">
              One clear picture.
            </span>
          </h1>

          {/* Calm Supporting Paragraph */}
          <p className="text-base sm:text-lg md:text-xl text-[#1E293B]/80 max-w-2xl font-normal leading-relaxed mb-10 mx-auto">
            PRVTCHAT brings your conversations, encrypted notes, and temporary rooms into a calm, private workspace.
            Built for absolute precision with zero server logs or bank credentials required.
          </p>

          {/* Two Large Pill Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full max-w-md justify-center mb-6 mx-auto">
            <button
              type="button"
              id="hero-open-workspace"
              onClick={onOpenCreateModal}
              className="w-full sm:w-auto px-7 py-3.5 btn-pill-black text-sm font-semibold flex items-center justify-center gap-3 cursor-pointer group shadow-sm"
            >
              <span>Open Workspace</span>
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <ArrowRight className="w-3.5 h-3.5 text-white stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            <button
              type="button"
              id="hero-how-it-works"
              onClick={onOpenSecurityModal}
              className="w-full sm:w-auto px-7 py-3.5 btn-pill-white text-sm font-semibold cursor-pointer shadow-sm"
            >
              <span>See how it works</span>
            </button>
          </div>

          {/* Subtle join link */}
          <p className="text-xs text-[#1E293B]/70 mb-12">
            Already received an invitation?{' '}
            <button
              type="button"
              id="hero-join-link"
              onClick={onOpenJoinModal}
              className="underline font-semibold text-[#0B132B] hover:opacity-80 cursor-pointer transition-opacity"
            >
              Join room directly
            </button>
          </p>

          {/* Bottom Three White Pill Chips */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-3xl mx-auto">
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
        </div>
      </main>

      {/* Seamless Minimal Bottom Bar */}
      <footer className="relative z-10 py-5 px-6">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#1E293B]/70">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0B132B]/60" />
            <span className="font-semibold text-[#0B132B]">PRVTCHAT</span>
            <span className="opacity-40">·</span>
            <span>Zero-Knowledge Workspace</span>
          </div>

          <div className="flex items-center gap-5 font-medium">
            <button
              type="button"
              id="footer-security-link"
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
