import { Shield, X } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 bg-zinc-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#111113] border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Cryptographic Specification, Threat Model & Privacy Boundaries
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
          <div className="space-y-1">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
              1. End-to-End Encryption Primitive (Web Crypto API)
            </h4>
            <p>
              Vesper uses the browser-native <code className="font-mono">window.crypto.subtle</code>{' '}
              implementation of <strong>AES-256-GCM</strong> (Galois/Counter Mode) with a
              256-bit key generated via <code className="font-mono">crypto.getRandomValues</code>.
              Every message, display alias, emoji reaction map, and compressed image binary is
              encrypted with a fresh, cryptographically random 96-bit Initialization Vector
              (IV) and authenticated with a 128-bit GCM integrity tag before leaving the
              browser.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
              2. Separation of Room Identifier & Decryption Secret
            </h4>
            <p>
              Shareable links follow the format{' '}
              <code className="font-mono">?room=slug#key=&lt;256-bit-base64url&gt;</code>. Per
              RFC 3986, URI fragments (<code className="font-mono">#...</code>) are processed
              exclusively by the local browser and are never transmitted in HTTP requests or
              stored in database records. The database only stores a double-iterated{' '}
              <code className="font-mono">SHA-256</code> commitment to verify key correctness.
            </p>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
              3. Honest Metadata Disclosure (What the Server Can Observe)
            </h4>
            <p>
              While message contents, sender aliases, and images are opaque ciphertexts, the
              underlying real-time transport and database infrastructure can still observe:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>The custom room URL slug, creation timestamp, and expiration policy.</li>
              <li>
                Ephemeral anonymous session UIDs, connection IP addresses (at the network
                transport layer), and the timestamps/approximate byte lengths of encrypted
                packets.
              </li>
            </ul>
          </div>

          <div className="space-y-1">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100">
              4. Revocation, Expiration & Deletion Limitations
            </h4>
            <p>
              When a conversation expires or is revoked, all stored ciphertext documents and
              presence heartbeats are deleted from Firestore and the room slug is marked as a
              revoked tombstone. However, no cryptographic system can revoke data from the
              analog hole: participants who took screenshots, downloaded decrypted images, or
              copied plaintext prior to revocation retain those local copies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
