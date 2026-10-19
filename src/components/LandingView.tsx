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
    <div className="relative flex-1 flex flex-col justify-between bg-transparent text-[#0B132B] overflow-hidden">
      {/* Live Morning Cloud Formations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {/* Soft morning cloud puff top-right */}
        <div
          className="absolute -top-16 right-[-5%] w-[38rem] h-[22rem] rounded-full opacity-45 blur-3xl animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.4) 45%, transparent 70%)',
          }}
        />
        {/* Soft morning cloud puff mid-left */}
        <div
          className="absolute top-1/3 -left-20 w-[42rem] h-[26rem] rounded-full opacity-40 blur-3xl animate-float-slow"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.35) 45%, transparent 70%)',
          }}
        />
        {/* Puffy morning cloud horizon layer along bottom (slightly white down) */}
        <div
          className="absolute -bottom-24 inset-x-0 h-[28rem] opacity-75 pointer-events-none blur-2xl"
          style={{
            background: 'radial-gradient(ellipse 90% 65% at 50% 100%, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0.8) 40%, transparent 80%)',
          }}
        />
      </div>

      {/* Main Hero Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 text-center max-w-4xl mx-auto pt-8 pb-14 sm:pt-12 sm:pb-20">
        <div className="stagger-children">
          {/* Top Centered Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-surface text-[#0B132B] text-xs font-medium mb-8 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
            <span>End-to-End Encrypted Workspace</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500 opacity-70" />
          </div>

          {/* Big Bold Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-[5rem] font-bold tracking-tight text-[#0B132B] max-w-4xl leading-[1.04] mb-6">
            Your words. Your privacy.
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#0B132B] via-[#1a2844] to-[#0B132B]">
              One clear picture.
            </span>
          </h1>

          {/* Calm Supporting Paragraph */}
          <p className="text-base sm:text-lg md:text-xl text-[#142347]/85 max-w-2xl font-normal leading-relaxed mb-10 mx-auto">
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
          <p className="text-xs text-[#142347]/75 mb-12">
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

      {/* Seamless Minimal Bottom Bar & Disclaimer */}
      <footer className="relative z-10 pt-4 pb-8 px-6">
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

        {/* Pharmaceutical Disclaimer */}
        <div className="max-w-2xl mx-auto text-center px-4 pt-6">
          <p className="text-[8px] sm:text-[9px] leading-relaxed text-[#0B132B]/45 tracking-wide hover:text-[#0B132B]/75 transition-colors italic">
            ⚠️ CAUTION: PRVTCHAT® may cause excessive feelings of privacy, sudden distrust of unencrypted messaging apps, and compulsive link-sharing behavior. Side effects include: whispering while typing, paranoia about plaintext, and an overwhelming urge to say &quot;it&apos;s encrypted&quot; in every conversation. If your conversation persists beyond 7 days, please create a new room. Not responsible for secrets you accidentally reveal by hitting send too early. We don&apos;t store, read, or judge your messages — we literally can&apos;t. Use responsibly. Keep out of reach of hackers. Individual encryption results may vary. No animals were harmed in the making of this chat. If you experience a sudden loss of plaintext, do not panic — this is working as intended.
          </p>
        </div>
      </footer>
    </div>
  );
};
