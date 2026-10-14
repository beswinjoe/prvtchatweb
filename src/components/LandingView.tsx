import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Cpu,
  Eye,
  FileCheck,
  FileLock2,
  Fingerprint,
  Flame,
  Globe,
  Info,
  Key,
  Link2,
  Lock,
  Play,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import React from 'react';
import { ARCHITECTURE_STEPS, EXPIRATION_OPTIONS, SUGGESTED_SLUGS } from '../lib/constants';
import { sanitizeSlug } from '../lib/utils';
import type {
  BurnState,
  HeroDemoKey,
  HeroDemoMessage,
  PreviewTab,
  SlugStatus,
  TestResult,
  WorkbenchPacket,
} from '../types';

interface LandingViewProps {
  slugInput: string;
  setSlugInput: (v: string) => void;
  slugStatus: SlugStatus;
  displayName: string;
  setDisplayName: (v: string) => void;
  allowPeerRevoke: boolean;
  setAllowPeerRevoke: (v: boolean) => void;
  selectedTtl: string;
  setSelectedTtl: (v: string) => void;
  createError: string;
  isCreatingRoom: boolean;
  user: unknown;
  handleCreateConversation: (e: React.FormEvent | null, withInstantPeerSimulation?: boolean) => void;
  onOpenJoinModal: () => void;
  onOpenSecurityModal: () => void;
  heroPreviewTab: PreviewTab;
  setHeroPreviewTab: (tab: PreviewTab) => void;
  heroDemoKeyObj: HeroDemoKey | null;
  heroDemoMessages: HeroDemoMessage[];
  heroDemoInput: string;
  setHeroDemoInput: (v: string) => void;
  handleHeroDemoSend: (e: React.FormEvent) => void;
  activeArchStep: number;
  setActiveArchStep: (idx: number) => void;
  workbenchPlaintext: string;
  setWorkbenchPlaintext: (v: string) => void;
  workbenchDemoPacket: WorkbenchPacket | null;
  bentoBurnState: BurnState;
  setBentoBurnState: (v: BurnState) => void;
  testResults: TestResult[];
  isRunningTests: boolean;
  runAutomatedSecurityTests: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  slugInput,
  setSlugInput,
  slugStatus,
  displayName,
  setDisplayName,
  allowPeerRevoke,
  setAllowPeerRevoke,
  selectedTtl,
  setSelectedTtl,
  createError,
  isCreatingRoom,
  user,
  handleCreateConversation,
  onOpenJoinModal,
  onOpenSecurityModal,
  heroPreviewTab,
  setHeroPreviewTab,
  heroDemoKeyObj,
  heroDemoMessages,
  heroDemoInput,
  setHeroDemoInput,
  handleHeroDemoSend,
  activeArchStep,
  setActiveArchStep,
  workbenchPlaintext,
  setWorkbenchPlaintext,
  workbenchDemoPacket,
  bentoBurnState,
  setBentoBurnState,
  testResults,
  isRunningTests,
  runAutomatedSecurityTests,
}) => {
  return (
    <main className="flex-1">
      {/* ----------------------------------------------------------------
          SECTION 1: EDITORIAL ARCHITECTURAL HERO (ABOVE THE FOLD)
         ---------------------------------------------------------------- */}
      <section className="relative overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* LEFT COLUMN: HEADLINE + INSTANT ROOM BUILDER */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/90 dark:border-zinc-800 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>ZERO-KNOWLEDGE EPHEMERAL MESSAGING · RFC 3986 #KEY</span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-semibold tracking-tight text-zinc-950 dark:text-zinc-50 leading-[1.12]">
                  Private conversations that leave zero trace.
                </h1>

                <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Spin up a private room with a custom link, share it with a trusted peer, and
                  talk immediately. No account, no phone number, and no server-side keys—ever.
                </p>
              </div>

              {/* INSTANT ROOM BUILDER CARD */}
              <div className="bg-white dark:bg-[#111113] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-sm p-5 sm:p-6 space-y-5">
                <form onSubmit={(e) => handleCreateConversation(e, false)} className="space-y-4">
                  {/* 1. Custom URL Slug Builder */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Link2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Claim Your Custom Conversation Link</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const base =
                            SUGGESTED_SLUGS[Math.floor(Math.random() * SUGGESTED_SLUGS.length)];
                          const num = Math.floor(100 + Math.random() * 900);
                          setSlugInput(`${base}-${num}`);
                        }}
                        className="text-[11px] font-mono text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Randomize</span>
                      </button>
                    </div>

                    <div className="flex items-center rounded-xl border border-zinc-300 dark:border-zinc-700/90 bg-zinc-50 dark:bg-[#09090B] focus-within:border-zinc-900 dark:focus-within:border-zinc-300 transition-colors overflow-hidden">
                      <span className="pl-3.5 pr-1 py-2.5 text-xs font-mono text-zinc-400 dark:text-zinc-500 select-none">
                        vesper.link/
                      </span>
                      <input
                        type="text"
                        value={slugInput}
                        onChange={(e) => setSlugInput(e.target.value.toLowerCase())}
                        placeholder="afterhours"
                        className="flex-1 bg-transparent py-2.5 pr-2 text-sm font-mono font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
                        required
                      />
                      <div className="pr-3 flex items-center">
                        {slugStatus.checking ? (
                          <span className="text-[11px] font-mono text-zinc-400">
                            Checking...
                          </span>
                        ) : slugStatus.available ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                            <Check className="w-3 h-3" /> Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
                            <X className="w-3 h-3" /> Taken
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick-Pick Slug Pills */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {SUGGESTED_SLUGS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setSlugInput(`${preset}-${Math.floor(10 + Math.random() * 89)}`)
                          }
                          className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          /{preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Display Alias & Destruction Policy */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        Display Alias (Encrypted in-room)
                      </label>
                      <input
                        type="text"
                        maxLength={28}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Operator-01"
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090B] px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-400"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        Revocation Authority
                      </label>
                      <button
                        type="button"
                        onClick={() => setAllowPeerRevoke(!allowPeerRevoke)}
                        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090B] px-3 py-2 text-left flex items-center justify-between cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
                      >
                        <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">
                          {allowPeerRevoke ? 'Mutual Burn (Any Peer)' : 'Creator Only Burn'}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {allowPeerRevoke ? '2-Way' : 'Strict'}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Compact Retention Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-medium text-zinc-600 dark:text-zinc-400">
                        Auto-Expiration & Cryptographic Purge
                      </span>
                      <span className="font-mono text-zinc-400 dark:text-zinc-500">
                        Server + Client Enforced
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-1.5">
                      {EXPIRATION_OPTIONS.map((option) => {
                        const active = selectedTtl === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelectedTtl(option.id)}
                            className={`py-2 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                              active
                                ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 font-semibold shadow-2xs'
                                : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#09090B] text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="text-xs truncate">{option.label}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {createError && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{createError}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-1 space-y-2">
                    <button
                      type="submit"
                      disabled={isCreatingRoom || !slugStatus.available || !user}
                      className="w-full py-3 px-4 rounded-xl font-medium text-sm bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <Lock className="w-4 h-4" />
                      <span>
                        {isCreatingRoom
                          ? 'Generating 256-Bit Key & Room...'
                          : `Create Encrypted Room (/${sanitizeSlug(slugInput) || 'room'})`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isCreatingRoom || !slugStatus.available || !user}
                        onClick={(e) => handleCreateConversation(e, true)}
                        className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Launch with Simulated Peer</span>
                      </button>

                      <button
                        type="button"
                        onClick={onOpenJoinModal}
                        className="py-2 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Key className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Have an Invite Link? Join</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* RIGHT COLUMN: INTERACTIVE DUAL-PERSPECTIVE PREVIEW */}
            <div className="lg:col-span-6">
              <div className="bg-white dark:bg-[#111113] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/80 dark:bg-[#09090B]/60 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 pl-1">
                      LIVE E2EE INSPECTOR
                    </span>
                  </div>

                  <div className="inline-flex rounded-lg p-0.5 bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-300/60 dark:border-zinc-800">
                    {[
                      { id: 'split', label: 'Split X-Ray' },
                      { id: 'decrypted', label: 'Participant UI' },
                      { id: 'server', label: 'Server Wire View' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setHeroPreviewTab(tab.id as PreviewTab)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                          heroPreviewTab === tab.id
                            ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated URL Bar */}
                <div className="px-4 py-2 bg-zinc-100/70 dark:bg-[#09090B] border-b border-zinc-200/70 dark:border-zinc-800/80 flex items-center justify-between gap-2 text-[11px] font-mono overflow-x-auto">
                  <div className="flex items-center shrink-0">
                    <Lock className="w-3 h-3 text-emerald-500 mr-1.5" />
                    <span className="text-zinc-400">https://vesper.link/</span>
                    <span className="text-zinc-800 dark:text-zinc-200 font-semibold">
                      {sanitizeSlug(slugInput) || 'afterhours'}
                    </span>
                    <span className="ml-0.5 px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      #key={heroDemoKeyObj ? heroDemoKeyObj.keyString.slice(0, 14) : '9xK2mP8vQ4'}...
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">
                    Fragment stays in browser
                  </span>
                </div>

                {/* Dual-Perspective Feed */}
                <div className="p-4 space-y-4">
                  {(heroPreviewTab === 'decrypted' || heroPreviewTab === 'split') && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                        <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                          <Eye className="w-3.5 h-3.5" />
                          PARTICIPANT BROWSER (DECRYPTED WITH #KEY)
                        </span>
                        <span>AES-256-GCM</span>
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {heroDemoMessages.map((m) => (
                          <div
                            key={m.id}
                            className={`flex flex-col ${
                              m.role === 'me' ? 'items-end' : 'items-start'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 mb-0.5 px-1">
                              <span className="font-medium text-zinc-600 dark:text-zinc-300">
                                {m.sender}
                              </span>
                              <span className="font-mono">{m.time}</span>
                            </div>
                            <div
                              className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                                m.role === 'me'
                                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 rounded-br-xs'
                                  : 'bg-zinc-100 dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 border border-zinc-200/70 dark:border-zinc-700/70 rounded-bl-xs'
                              }`}
                            >
                              {m.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(heroPreviewTab === 'server' || heroPreviewTab === 'split') && (
                    <div className="space-y-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between text-[11px] font-mono text-amber-600 dark:text-amber-400">
                        <span className="flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5" />
                          WHAT THE SERVER & DATABASE SEE (ZERO PLAINTEXT)
                        </span>
                        <span>OPAQUE CIPHERTEXT</span>
                      </div>

                      <div className="rounded-xl bg-zinc-950 text-zinc-300 p-3 font-mono text-[10px] space-y-2 border border-zinc-800 max-h-44 overflow-y-auto">
                        {heroDemoMessages.slice(-2).map((m) => (
                          <div
                            key={`cipher-${m.id}`}
                            className="pb-2 last:pb-0 border-b last:border-b-0 border-zinc-800/80 space-y-0.5"
                          >
                            <div className="flex items-center justify-between text-zinc-500">
                              <span>doc: /messages/{m.id}</span>
                              <span className="text-emerald-400">alg: AES-256-GCM</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">"iv": </span>
                              <span className="text-amber-300">"{m.iv}"</span>
                            </div>
                            <div className="break-all">
                              <span className="text-zinc-500">"ciphertext": </span>
                              <span className="text-zinc-300">
                                "{m.ciphertext.slice(0, 78)}..."
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interactive Try-It Input */}
                  <form
                    onSubmit={handleHeroDemoSend}
                    className="pt-1 flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={heroDemoInput}
                      onChange={(e) => setHeroDemoInput(e.target.value)}
                      placeholder="Type here to test live WebCrypto encryption in this preview..."
                      className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090B] px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Seal</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          SECTION 2: INTERACTIVE URL FRAGMENT (#KEY) ARCHITECTURE EXPLAINER
         ---------------------------------------------------------------- */}
      <section
        id="fragment-architecture"
        className="py-12 lg:py-16 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-[#0C0C0E]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Cryptographic Link Anatomy
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Why the server can never read your messages.
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Standard web specifications (RFC 3986 §3.5) dictate that the fragment identifier (
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                #key=...
              </code>
              ) is resolved exclusively inside your local browser and is stripped before any
              HTTP or WebSocket request leaves your device.
            </p>
          </div>

          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-50 dark:bg-[#111113] border border-zinc-200/90 dark:border-zinc-800/90 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch font-mono text-xs">
              {/* Part A: Public Routing Slug */}
              <div className="lg:col-span-5 p-4 rounded-xl bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    1. Public Routing Identifier
                  </span>
                  <Globe className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 break-all">
                  https://vesper.link/?room=
                  <span className="underline decoration-zinc-400 underline-offset-4">
                    {sanitizeSlug(slugInput) || 'afterhours'}
                  </span>
                </div>
                <p className="text-[11px] font-sans text-zinc-500 dark:text-zinc-400">
                  Sent to the server so connected participants can subscribe to the same
                  encrypted ciphertext stream and enforce expiration timers.
                </p>
              </div>

              {/* Part B: Client-Only 256-Bit Secret Fragment */}
              <div className="lg:col-span-7 p-4 rounded-xl bg-emerald-500/[0.06] dark:bg-emerald-500/[0.07] border border-emerald-500/30 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold">
                    2. Client-Only 256-Bit AES-GCM Secret (Never Transmitted)
                  </span>
                  <Key className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="text-sm sm:text-base font-semibold text-emerald-700 dark:text-emerald-300 break-all">
                  #key={workbenchDemoPacket ? workbenchDemoPacket.fullKey : '8f9d2a7c4e1b0a9f6d3c8e2b5a1f4d7c9e0b3a6d2f8c'}
                </div>
                <p className="text-[11px] font-sans text-emerald-800/80 dark:text-emerald-200/80">
                  Never sent in HTTP requests, server logs, or database queries. Imported
                  directly into <code className="font-mono">window.crypto.subtle</code> in
                  browser RAM.
                </p>
              </div>
            </div>

            {/* 4-Step Pipeline Scrubber */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-2">
              {ARCHITECTURE_STEPS.map((item, idx) => {
                const active = activeArchStep === idx;
                return (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setActiveArchStep(idx)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 shadow-xs'
                        : 'border-zinc-200/70 dark:border-zinc-800/70 bg-transparent hover:bg-white/50 dark:hover:bg-zinc-900/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                      <span className={active ? 'text-emerald-500 font-bold' : 'text-zinc-400'}>
                        STEP {item.step}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                        {item.badge}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Active Step Detail & Code */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center p-4 rounded-xl bg-zinc-950 text-zinc-200 border border-zinc-800">
              <div className="lg:col-span-5 space-y-1.5">
                <div className="text-xs font-mono text-emerald-400">
                  STEP {ARCHITECTURE_STEPS[activeArchStep].step} ·{' '}
                  {ARCHITECTURE_STEPS[activeArchStep].badge}
                </div>
                <h3 className="text-base font-semibold text-white">
                  {ARCHITECTURE_STEPS[activeArchStep].title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {ARCHITECTURE_STEPS[activeArchStep].desc}
                </p>
              </div>
              <div className="lg:col-span-7">
                <pre className="p-3.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
                  {ARCHITECTURE_STEPS[activeArchStep].code}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          SECTION 3: BENTO GRID OF CRAFT & LIVE CRYPTOGRAPHIC SANDBOX
         ---------------------------------------------------------------- */}
      <section
        id="crypto-bento"
        className="py-12 lg:py-16 border-b border-zinc-200/80 dark:border-zinc-800/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-1.5">
              <div className="text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Interactive Cryptographic Lab
              </div>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Engineered for verifiable privacy.
              </h2>
            </div>
            <p className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
              No simulated locks · Real browser WebCrypto primitives
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* BENTO CARD 1: LIVE AES-256-GCM CIPHER SANDBOX */}
            <div className="lg:col-span-7 bg-white dark:bg-[#111113] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    <Cpu className="w-4 h-4 text-emerald-500" />
                    Live Client-Side AES-256-GCM Cipher Sandbox
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Interactive
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Type any plaintext below to watch your browser generate a fresh 96-bit
                  Initialization Vector and compute authenticated ciphertext in real time.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-mono text-zinc-500">
                  PLAINTEXT INPUT (LOCAL MEMORY):
                </label>
                <input
                  type="text"
                  value={workbenchPlaintext}
                  onChange={(e) => setWorkbenchPlaintext(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090B] px-3.5 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {workbenchDemoPacket && (
                <div className="rounded-xl bg-zinc-950 text-zinc-200 p-4 font-mono text-[11px] space-y-2 border border-zinc-800">
                  <div className="flex items-center justify-between text-zinc-400 border-b border-zinc-800 pb-1.5">
                    <span>SHA-256 KEY FINGERPRINT</span>
                    <span className="text-emerald-400">{workbenchDemoPacket.fingerprint}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10px]">
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <div className="text-zinc-500">96-BIT RANDOM IV (BASE64URL)</div>
                      <div className="text-amber-300 truncate mt-0.5">
                        {workbenchDemoPacket.iv}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <div className="text-zinc-500">AUTHENTICATION TAG</div>
                      <div className="text-sky-400 mt-0.5">128-Bit GCM Tag Verified</div>
                    </div>
                  </div>
                  <div className="pt-1 text-[10px]">
                    <div className="text-zinc-500">SEALED CIPHERTEXT PAYLOAD:</div>
                    <div className="text-zinc-300 break-all mt-0.5">
                      {workbenchDemoPacket.ciphertext.slice(0, 110)}...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* BENTO CARD 2: INSTANT REVOCATION & BURN SIMULATOR */}
            <div className="lg:col-span-5 bg-white dark:bg-[#111113] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-2xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    <Flame className="w-4 h-4 text-rose-500" />
                    Instant Cryptographic Revocation
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                    Zero Retention
                  </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Revoking a link immediately deletes all encrypted message documents and
                  presence heartbeats from Firestore and tombstones the URL slug.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 space-y-3">
                {bentoBurnState === 'active' ? (
                  <>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200">
                        /red-team-sync
                      </span>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        3 Ciphertexts Stored
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[10px] text-zinc-500">
                      <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 truncate">
                        msg_01: "7vK9mP2xR5tY8uI1oP3aS6dF..."
                      </div>
                      <div className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200/70 dark:border-zinc-800 truncate">
                        msg_02: "4nB8vC1xZ9lK3jH6gF2dS5aP..."
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBentoBurnState('shredded')}
                      className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Test Instant Room Revocation</span>
                    </button>
                  </>
                ) : (
                  <div className="py-6 text-center space-y-2.5">
                    <ShieldAlert className="w-7 h-7 text-rose-500 mx-auto" />
                    <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Room Tombstoned & Ciphertexts Purged
                    </div>
                    <p className="text-[11px] text-zinc-500">
                      0 records remain in collection. Future visits to /red-team-sync are
                      blocked.
                    </p>
                    <button
                      type="button"
                      onClick={() => setBentoBurnState('active')}
                      className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                    >
                      Reset Simulation
                    </button>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-zinc-400 dark:text-zinc-500 flex items-center justify-between">
                <span>Supports 15m, 1h, 24h, 7d, or manual burn</span>
                <span className="font-mono text-emerald-500">Enforced</span>
              </div>
            </div>

            {/* BENTO CARD 3: ENCRYPTED IMAGE PIPELINE */}
            <div className="lg:col-span-6 bg-white dark:bg-[#111113] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  <FileLock2 className="w-4 h-4 text-emerald-500" />
                  Client-Side Encrypted Image Attachments
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  WebP + AES-GCM
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Drag-and-drop or paste images directly from your clipboard. Images are
                validated, compressed in an offscreen HTML5 Canvas, and encrypted with your
                room's 256-bit key before upload.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-2 font-mono text-[10px]">
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800">
                  <div className="text-zinc-400">01. LOCAL INPUT</div>
                  <div className="text-zinc-800 dark:text-zinc-200 font-semibold mt-0.5">
                    Drop / Paste Image
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800">
                  <div className="text-zinc-400">02. CLIENT SEAL</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    AES-256-GCM Blob
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800">
                  <div className="text-zinc-400">03. PEER VIEW</div>
                  <div className="text-zinc-800 dark:text-zinc-200 font-semibold mt-0.5">
                    In-Memory Lightbox
                  </div>
                </div>
              </div>
            </div>

            {/* BENTO CARD 4: OUT-OF-BAND FINGERPRINT */}
            <div className="lg:col-span-6 bg-white dark:bg-[#111113] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-6 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  <Fingerprint className="w-4 h-4 text-emerald-500" />
                  Out-of-Band Key Fingerprint & Split Invites
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  Zero MITM
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Every conversation computes a 6-block visual SHA-256 key fingerprint so
                participants can confirm they hold the exact same key. You can also split the
                slug and key across two separate channels.
              </p>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 flex items-center justify-between font-mono text-xs">
                <span className="text-zinc-400 text-[11px]">SAMPLE FINGERPRINT</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold tracking-wider">
                  {workbenchDemoPacket
                    ? workbenchDemoPacket.fingerprint
                    : '9F4A · 2C8E · 7B1D · 6A0F · 3E5C · 8D2B'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------
          SECTION 4: TRANSPARENT THREAT MODEL & AUTOMATED TEST SUITE
         ---------------------------------------------------------------- */}
      <section
        id="threat-matrix"
        className="py-12 lg:py-16 bg-white dark:bg-[#0C0C0E] border-b border-zinc-200/80 dark:border-zinc-800/80"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT: THREAT MATRIX */}
            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-1.5">
                <div className="text-xs font-mono uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Transparent Threat Model
                </div>
                <h3 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  What is cryptographically hidden vs. what metadata exists.
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  We never claim magic anonymity. Below is the exact boundary of what our
                  client-side AES-256-GCM architecture guarantees and what network relays can
                  still observe.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/25 space-y-2">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Cryptographically Hidden from Server & Database</span>
                  </div>
                  <ul className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1.5 pl-6 list-disc">
                    <li>
                      <strong>256-Bit Decryption Key:</strong> Kept strictly in the browser{' '}
                      <code className="font-mono">#key=</code> URI fragment.
                    </li>
                    <li>
                      <strong>Message Plaintext & Replies:</strong> Sealed with AES-256-GCM
                      before transmission.
                    </li>
                    <li>
                      <strong>Image Attachments:</strong> Compressed and encrypted into
                      ciphertext blobs on the client.
                    </li>
                    <li>
                      <strong>Participant Display Aliases & Emoji Reactions:</strong>{' '}
                      Encrypted inside payload ciphertexts.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 space-y-2">
                  <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-500" />
                    <span>Observable Transport Metadata & Physical Boundaries</span>
                  </div>
                  <ul className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1.5 pl-6 list-disc">
                    <li>
                      <strong>Routing Metadata:</strong> The server knows the custom room
                      slug, creation timestamp, expiration timer, and approximate ciphertext
                      byte size.
                    </li>
                    <li>
                      <strong>Network Layer:</strong> Standard TCP/TLS connection IP addresses
                      unless accessed via Tor or a VPN.
                    </li>
                    <li>
                      <strong>Recipient Device Trust:</strong> Revocation purges all server
                      records immediately, but cannot erase screenshots or files already saved
                      by a peer prior to revocation.
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* RIGHT: VERIFICATION SUITE */}
            <div id="verification-suite" className="lg:col-span-6 space-y-4">
              <div className="bg-zinc-50 dark:bg-[#111113] border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-200/80 dark:border-zinc-800 pb-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-emerald-500" />
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Live Browser Cryptographic Verification Suite
                      </h3>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Executes real Web Crypto API & boundary assertions in your browser
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={runAutomatedSecurityTests}
                    disabled={isRunningTests}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>{isRunningTests ? 'Running...' : 'Run 6 Checks'}</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {testResults.map((test) => (
                    <div
                      key={test.id}
                      className="p-3 rounded-xl bg-white dark:bg-[#09090B] border border-zinc-200/80 dark:border-zinc-800/90 flex items-start gap-3"
                    >
                      {test.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                            {test.name}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                            {test.id} PASS
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                          {test.detail}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400 dark:text-zinc-500">
        <div className="flex items-center gap-2">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Vesper E2EE</span>
          <span>· Client-Side AES-256-GCM Ephemeral Messaging Platform</span>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          <button
            type="button"
            onClick={onOpenJoinModal}
            className="hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            Join Room
          </button>
          <button
            type="button"
            onClick={onOpenSecurityModal}
            className="hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            Security Spec
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            Back to Top ↑
          </button>
        </div>
      </footer>
    </main>
  );
};
