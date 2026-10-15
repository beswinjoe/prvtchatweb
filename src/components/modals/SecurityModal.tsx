import { CheckCircle2, Shield, X } from 'lucide-react';
import React from 'react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[85vh] overflow-y-auto p-6 sm:p-7 rounded-2xl glass-panel shadow-2xl shadow-indigo-950/40 border border-white/10 space-y-5 text-left">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Security & Cryptography Architecture
              </h3>
              <p className="text-[11px] text-slate-400">
                PRVTCHAT Zero-Knowledge End-to-End Encryption Spec
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Sections */}
        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
          {/* Section 1 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>1. Client-Side Web Crypto AES-256-GCM</span>
            </div>
            <p className="text-slate-400">
              PRVTCHAT uses the browser-native <code className="font-mono text-indigo-300">window.crypto.subtle</code>{' '}
              API to generate a 256-bit symmetric key locally. Every message, image, and reaction
              is encrypted with an individual 96-bit Initialization Vector (IV) and a 128-bit
              integrity tag. Plaintext never touches the network.
            </p>
          </div>

          {/* Section 2 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>2. Fragment-Based Key Isolation (RFC 3986)</span>
            </div>
            <p className="text-slate-400">
              The 256-bit secret is placed strictly in the URL hash fragment (<code className="font-mono text-indigo-300">#key=...</code>).
              Per RFC 3986 web standards, browsers never transmit URI fragments in HTTP request headers.
              Firebase and network proxies only observe the room routing slug and opaque Base64 ciphertexts.
            </p>
          </div>

          {/* Section 3 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>3. Authoritative 7-Day Hard Limit & Shredding</span>
            </div>
            <p className="text-slate-400">
              No conversation can exist longer than 7 days from creation. When the timer expires
              or a participant clicks <strong className="text-white">Destroy Chat</strong>, the room
              status is immediately revoked and all stored message records, attachments, and presence
              documents are permanently deleted from the database.
            </p>
          </div>

          {/* Section 4 */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>4. Honest Threat Model & Limitations</span>
            </div>
            <p className="text-slate-400">
              Zero-knowledge E2EE protects against server eavesdropping and database interception.
              However, it cannot prevent participants from taking screenshots, saving decrypted
              images, or copying text prior to conversation destruction.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors cursor-pointer border border-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
