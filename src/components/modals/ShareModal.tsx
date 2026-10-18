import {
  Check,
  Copy,
  Download,
  Fingerprint,
  Link,
  QrCode,
  Share2,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import React, { useEffect, useState } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  fullInvitationUri: string;
  activeSlug: string;
  fingerprint: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onNativeShare: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  fullInvitationUri,
  activeSlug,
  fingerprint,
  copiedId,
  onCopy,
  onNativeShare,
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'qr'>('link');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showFingerprint, setShowFingerprint] = useState(false);

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

  // Generate QR Code when invitation URI changes or modal opens
  useEffect(() => {
    if (!isOpen || !fullInvitationUri) return;

    QRCode.toDataURL(fullInvitationUri, {
      width: 320,
      margin: 2,
      color: {
        dark: '#09090b',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => {
        console.error('Failed to generate QR code', err);
      });
  }, [isOpen, fullInvitationUri]);

  if (!isOpen) return null;

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `prvtchat-${activeSlug}-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      id="share-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="share-modal-dialog"
        className="relative w-full max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-6 sm:p-7 rounded-2xl bg-white border border-zinc-200/80 shadow-2xl space-y-5 text-left text-zinc-950 animate-scale-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center shadow-xs">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-950 tracking-tight">
                Share Encrypted Chat Link
              </h3>
              <p className="text-[11px] font-mono text-zinc-500">
                /{activeSlug}
              </p>
            </div>
          </div>
          <button
            id="share-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
            aria-label="Close share modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Link vs QR Code */}
        <div className="flex p-1 rounded-xl bg-zinc-100/90 border border-zinc-200/70 text-xs">
          <button
            id="share-tab-link-btn"
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'link'
                ? 'bg-white text-zinc-950 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Invitation Link</span>
          </button>
          <button
            id="share-tab-qr-btn"
            type="button"
            onClick={() => setActiveTab('qr')}
            className={`flex-1 py-1.5 px-3 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-white text-zinc-950 shadow-xs font-semibold'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Scan QR Code</span>
          </button>
        </div>

        {/* Tab 1: Link */}
        {activeTab === 'link' && (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-900">
                Invitation URL (includes decryption key in fragment)
              </label>
              <div
                id="share-modal-url-display"
                className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200 font-mono text-xs break-all text-zinc-900 select-all max-h-28 overflow-y-auto leading-relaxed shadow-inner"
              >
                {fullInvitationUri}
              </div>
              <p className="text-[11px] text-zinc-500">
                The encryption key lives solely after the <code className="text-zinc-800 bg-zinc-100 px-1 py-0.2 rounded font-mono">#key=</code> hash and is never transmitted to any server.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                id="share-modal-copy-link-btn"
                type="button"
                onClick={() => onCopy(fullInvitationUri, 'share-modal-full-uri')}
                className="flex-1 py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 btn-black text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md active:scale-98"
              >
                {copiedId === 'share-modal-full-uri' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Invitation Link</span>
                  </>
                )}
              </button>

              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  id="share-modal-native-share-btn"
                  type="button"
                  onClick={onNativeShare}
                  className="py-2.5 px-3.5 rounded-xl btn-outline text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-zinc-600" />
                  <span>Share</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: QR Code */}
        {activeTab === 'qr' && (
          <div className="space-y-4 flex flex-col items-center animate-fade-in text-center">
            <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-md flex items-center justify-center">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code for /${activeSlug}`}
                  className="w-56 h-56 rounded-lg object-contain"
                />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-600 max-w-xs">
              Scan with your phone's camera to join this end-to-end encrypted room instantly.
            </p>
            <div className="flex gap-2 w-full pt-1">
              <button
                id="share-modal-download-qr-btn"
                type="button"
                onClick={handleDownloadQr}
                disabled={!qrDataUrl}
                className="flex-1 py-2.5 px-4 rounded-xl btn-outline text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Download className="w-4 h-4 text-zinc-700" />
                <span>Save QR Code Image</span>
              </button>
              <button
                id="share-modal-qr-copy-btn"
                type="button"
                onClick={() => onCopy(fullInvitationUri, 'share-modal-full-uri')}
                className="py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
              >
                {copiedId === 'share-modal-full-uri' ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Out-of-band Verification Fingerprint */}
        <div className="pt-3 border-t border-zinc-100">
          <button
            id="share-modal-toggle-fingerprint-btn"
            type="button"
            onClick={() => setShowFingerprint((prev) => !prev)}
            className="text-[11px] text-zinc-600 hover:text-zinc-950 flex items-center gap-1.5 cursor-pointer font-medium"
          >
            <Fingerprint className="w-3.5 h-3.5 text-zinc-500" />
            <span>{showFingerprint ? 'Hide' : 'Verify'} SHA-256 Key Fingerprint</span>
          </button>

          {showFingerprint && (
            <div className="mt-2.5 p-3 rounded-xl bg-zinc-50 border border-zinc-200 space-y-1 animate-fade-in">
              <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-500 block">
                Session Key Safety Number
              </span>
              <div className="font-mono text-xs text-zinc-900 tracking-wider">
                {fingerprint || 'Computing fingerprint...'}
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Both participants can compare this number out-of-band to verify zero eavesdropping or MITM.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
