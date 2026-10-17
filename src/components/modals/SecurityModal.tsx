import {
  Briefcase,
  CheckCircle2,
  Clock,
  EyeOff,
  Heart,
  HelpCircle,
  Lock,
  Scale,
  Shield,
  Sparkles,
  Terminal,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export type InfoModalTab = 'features' | 'how-it-works' | 'who-its-for' | 'privacy' | 'faq';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: InfoModalTab;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
}) => {
  const [activeTab, setActiveTab] = useState<InfoModalTab>(initialTab);
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);

  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const tabs: { id: InfoModalTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'who-its-for', label: "Who it's for", icon: Users },
    { id: 'features', label: 'Features', icon: Sparkles },
    { id: 'how-it-works', label: 'How it works', icon: HelpCircle },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-white border border-zinc-200 shadow-2xl text-left text-zinc-950 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shrink-0">
              {activeTab === 'who-its-for' && <Users className="w-4 h-4 stroke-[2.2]" />}
              {activeTab === 'features' && <Zap className="w-4 h-4 stroke-[2.2]" />}
              {activeTab === 'how-it-works' && <HelpCircle className="w-4 h-4 stroke-[2.2]" />}
              {activeTab === 'privacy' && <Shield className="w-4 h-4 stroke-[2.2]" />}
              {activeTab === 'faq' && <HelpCircle className="w-4 h-4 stroke-[2.2]" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 tracking-tight">
                {activeTab === 'who-its-for' && "Who PRVTCHAT is For"}
                {activeTab === 'features' && "Core Features"}
                {activeTab === 'how-it-works' && "How It Works"}
                {activeTab === 'privacy' && "Security & Cryptography Architecture"}
                {activeTab === 'faq' && "Frequently Asked Questions"}
              </h3>
              <p className="text-[11px] text-zinc-500">
                {activeTab === 'who-its-for' && "Real-world privacy use cases for everyday individuals & teams"}
                {activeTab === 'features' && "Zero-knowledge, local-first ephemeral messaging architecture"}
                {activeTab === 'how-it-works' && "Four simple steps to instant, confidential communication"}
                {activeTab === 'privacy' && "PRVTCHAT Zero-Knowledge End-to-End Encryption Spec"}
                {activeTab === 'faq' && "Answers regarding privacy, data retention, and key security"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation Bar */}
        <div className="px-6 py-2.5 bg-zinc-50 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-white text-zinc-950 font-semibold shadow-xs border border-zinc-200/80'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Body Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3.5 text-xs text-zinc-600 leading-relaxed">
          {/* TAB 1: WHO IT'S FOR */}
          {activeTab === 'who-its-for' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <Heart className="w-3 h-3 stroke-[2.4]" />
                  </div>
                  <span>Friends & Personal Confidants</span>
                </div>
                <p className="text-zinc-600 pl-7">
                  Share Wi-Fi passwords, payment details, sensitive photos, or private thoughts with friends or family without leaving a permanent record in cloud backups, iMessage, or WhatsApp servers.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Briefcase className="w-3 h-3 stroke-[2.4]" />
                  </div>
                  <span>Founders, Executives & Dealmakers</span>
                </div>
                <p className="text-zinc-600 pl-7">
                  Negotiate acquisitions, review confidential term sheets, discuss compensation, or hold sensitive board votes without exposing trade secrets to enterprise-wide Slack or Microsoft Teams audit logs.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <EyeOff className="w-3 h-3 stroke-[2.4]" />
                  </div>
                  <span>Journalists & Sources</span>
                </div>
                <p className="text-zinc-600 pl-7">
                  Conduct sensitive off-the-record interviews with complete deniability. Zero user registration, zero phone number linkage, and immediate data shredding when the conversation concludes.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Terminal className="w-3 h-3 stroke-[2.4]" />
                  </div>
                  <span>Developers & DevOps Engineers</span>
                </div>
                <p className="text-zinc-600 pl-7">
                  Pass temporary API tokens, staging credentials, SSH keys, and <code className="font-mono text-zinc-900 bg-zinc-100 px-1 py-0.5 rounded">.env</code> configurations securely without committing secrets to issue trackers or shared chat threads.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                    <Scale className="w-3 h-3 stroke-[2.4]" />
                  </div>
                  <span>Legal, Health & Advisory Clients</span>
                </div>
                <p className="text-zinc-600 pl-7">
                  Share attorney-client privileged summaries, medical notes, or confidential financial briefings backed by mathematical zero-knowledge privacy and strict automatic shredding.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: FEATURES */}
          {activeTab === 'features' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Client-Side AES-256-GCM</span>
                </div>
                <p className="text-zinc-600">
                  Every message, reaction, and image is encrypted locally using the browser&apos;s native Web Crypto API before transmission. Plaintext never leaves your machine.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Instant Remote Shredding</span>
                </div>
                <p className="text-zinc-600">
                  Click <strong className="text-zinc-900">Destroy Chat</strong> at any time to instantly revoke the room and wipe every message and attachment across all connected participants.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>RFC 3986 Fragment Isolation</span>
                </div>
                <p className="text-zinc-600">
                  The secret 256-bit key lives strictly after <code className="font-mono text-zinc-900">#key=</code>. Browsers never transmit hash fragments over the network to any server.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Authoritative Auto-Expiration</span>
                </div>
                <p className="text-zinc-600">
                  Rooms feature customizable time-to-live expiration (up to a 7-day hard ceiling). When the timer expires, the entire room is automatically shredded.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-600" />
                  <span>Zero Accounts or Passwords</span>
                </div>
                <p className="text-zinc-600">
                  No email addresses, no phone numbers, no KYC, and no tracking cookies. Simply create a room or click an invitation link to start chatting immediately.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span>Encrypted Media Sharing</span>
                </div>
                <p className="text-zinc-600">
                  Drop or attach images directly into the chat. Files are encrypted client-side with random 96-bit IVs before upload and purged when the chat ends.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: HOW IT WORKS */}
          {activeTab === 'how-it-works' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-zinc-900">Create Workspace & Generate Key</h4>
                  <p className="text-zinc-600">
                    Click <strong className="text-zinc-900">Enter Workspace</strong>. Your browser invokes the native <code className="font-mono text-zinc-900 font-medium">window.crypto.subtle</code> engine to generate a high-entropy 256-bit AES-GCM symmetric key locally on your device.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-zinc-900">Key Isolation in URL Fragment</h4>
                  <p className="text-zinc-600">
                    The secret key is placed after the <code className="font-mono text-zinc-900 font-medium">#key=</code> hash fragment. In compliance with RFC 3986 web standards, browsers never transmit URI fragments in HTTP request headers, keeping the key inaccessible to servers.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-zinc-900">Share Invitation Link</h4>
                  <p className="text-zinc-600">
                    Send the link to your peer. When they open it, their browser extracts the key locally from the URL fragment and establishes a real-time encrypted connection. No sign-up or waiting required.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-zinc-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  4
                </div>
                <div className="space-y-1">
                  <h4 className="font-semibold text-zinc-900">Communicate & Instant Shredding</h4>
                  <p className="text-zinc-600">
                    Chat in real-time with zero plaintext server records. When done, click <strong className="text-zinc-900">Destroy Chat</strong> or wait for the timer to expire: all messages, attachments, and encryption keys are permanently and irreversibly purged.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: PRIVACY & SECURITY SPEC */}
          {activeTab === 'privacy' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>1. Client-Side Web Crypto AES-256-GCM</span>
                </div>
                <p className="text-zinc-600">
                  PRVTCHAT uses the browser-native <code className="font-mono text-zinc-900 font-medium">window.crypto.subtle</code>{' '}
                  API to generate a 256-bit symmetric key locally. Every message, image, and reaction
                  is encrypted with an individual 96-bit Initialization Vector (IV) and a 128-bit
                  integrity tag. Plaintext never touches the network.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Fragment-Based Key Isolation (RFC 3986)</span>
                </div>
                <p className="text-zinc-600">
                  The 256-bit secret is placed strictly in the URL hash fragment (<code className="font-mono text-zinc-900 font-medium">#key=...</code>).
                  Per RFC 3986 web standards, browsers never transmit URI fragments in HTTP request headers.
                  Firebase and network proxies only observe the room routing slug and opaque Base64 ciphertexts.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>3. Authoritative 7-Day Hard Limit & Shredding</span>
                </div>
                <p className="text-zinc-600">
                  No conversation can exist longer than 7 days from creation. When the timer expires
                  or a participant clicks <strong className="text-zinc-900">Destroy Chat</strong>, the room
                  status is immediately revoked and all stored message records, attachments, and presence
                  documents are permanently deleted from the database.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>4. Honest Threat Model & Limitations</span>
                </div>
                <p className="text-zinc-600">
                  Zero-knowledge E2EE protects against server eavesdropping and database interception.
                  However, it cannot prevent participants from taking screenshots, saving decrypted
                  images, or copying text prior to conversation destruction.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: FAQ */}
          {activeTab === 'faq' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <h4 className="font-semibold text-zinc-900">Does PRVTCHAT store my messages or logs?</h4>
                <p className="text-zinc-600">
                  No. All messages are encrypted directly inside your device before transmission. The database only sees opaque ciphertexts, and all records are deleted when the room is destroyed or expires.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <h4 className="font-semibold text-zinc-900">Can the server admin or database read my chat?</h4>
                <p className="text-zinc-600">
                  No. Decryption requires the 256-bit symmetric key, which is kept exclusively in your browser memory and the URL hash fragment (<code className="font-mono text-zinc-900">#key=...</code>). Because browsers never send hash fragments to servers (RFC 3986), the server never possesses the key.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <h4 className="font-semibold text-zinc-900">Do I need to sign up or provide an email or phone number?</h4>
                <p className="text-zinc-600">
                  No. PRVTCHAT requires zero registration. We do not ask for, collect, or store any personal data or credentials.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <h4 className="font-semibold text-zinc-900">What happens when someone clicks &quot;Destroy Chat&quot;?</h4>
                <p className="text-zinc-600">
                  The room is instantly marked as revoked, and all stored messages, media attachments, and participant records are wiped from the database. All connected peers are disconnected immediately.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <h4 className="font-semibold text-zinc-900">Can deleted or expired messages be recovered?</h4>
                <p className="text-zinc-600">
                  No. Data shredding is permanent and unrecoverable. Once a room is destroyed, neither we nor anyone else can restore the conversation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <h4 className="font-semibold text-zinc-900">How long can a room remain active?</h4>
                <p className="text-zinc-600">
                  You can set a timer between 1 hour and 7 days. By architectural design, no room can exceed the hard 7-day ceiling.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-400">
            PRVTCHAT Zero-Knowledge E2EE Architecture
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
