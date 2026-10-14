# prvtchatweb — Ephemeral Zero-Knowledge E2EE Messaging

> **High-Assurance, Client-Side End-to-End Encrypted Private Communications Platform**  
> Powered by the native Web Crypto API (AES-256-GCM + SHA-256) and RFC 3986 `#key=` URI fragments.

---

## 🔒 Security Architecture & Guarantees

1. **Client CSPRNG 256-Bit Key Generation**:
   The browser generates cryptographically random 256-bit AES-GCM keys directly in volatile RAM via `window.crypto.subtle`.
2. **RFC 3986 Client-Only Fragment (`#key=...`)**:
   The decryption secret is placed exclusively in the URL hash fragment (`#key=...`). Under RFC 3986 §3.5, browsers **never** send URL fragments to HTTP servers, web proxies, or database relays.
3. **96-Bit Initialization Vector + 128-Bit GCM Authentication Tag**:
   Every message, image, alias, and emoji reaction is sealed with a fresh, cryptographically random 96-bit IV and authenticated with a 128-bit integrity tag before leaving your device.
4. **Zero-Knowledge Cloud Relay & Dual-Mode Adaptability**:
   - **Production / Canvas**: Connects seamlessly to Firebase Firestore & Auth.
   - **Local / Standalone**: Automatically switches to an in-memory cross-tab [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) relay with zero configuration.
5. **Enforced Ephemerality & Instant Purge**:
   When a room expires or any participant clicks **Revoke**, all message documents and heartbeats are permanently purged and the room is tombstoned.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

Open your browser to:
```
http://localhost:5174/
```

### 3. Build for Production
```bash
npm run build
```

---

## 📁 Project Structure

```text
prvtchatweb/
├── src/
│   ├── types/
│   │   └── index.ts            # Central TypeScript definitions
│   ├── lib/
│   │   ├── crypto.ts           # Web Crypto API layer (AES-256-GCM, SHA-256)
│   │   ├── firebase.ts         # Dual-mode Firebase / BroadcastChannel relay
│   │   ├── image.ts            # Client-side canvas image compression
│   │   ├── constants.ts        # Retention presets, emoji sets, architecture
│   │   └── utils.ts            # Slug sanitization, validation, avatars
│   ├── components/
│   │   ├── Navbar.tsx          # Sticky top bar with status & controls
│   │   ├── LandingView.tsx     # Hero, Bento sandbox, threat model, test suite
│   │   ├── ChatView.tsx        # Encrypted chat workspace & message feed
│   │   ├── ExpiredView.tsx     # Tombstone screen for revoked conversations
│   │   ├── ErrorBoundary.tsx   # React error boundary for runtime resilience
│   │   └── modals/
│   │       ├── JoinModal.tsx   # Manual slug/key credential entry
│   │       ├── ShareModal.tsx  # Shareable link & split-channel export
│   │       ├── RevokeModal.tsx # Instant destruction confirmation
│   │       ├── SecurityModal.tsx # Full cryptographic specifications
│   │       └── LightboxModal.tsx # In-memory encrypted image viewer
│   ├── App.tsx                 # Core application coordinator & state
│   ├── main.tsx                # React root mount with ErrorBoundary
│   └── index.css               # Tailwind CSS v4 styling & typography
├── index.html                  # SEO metadata, Inter & JetBrains Mono fonts
├── vite.config.ts              # Vite + Tailwind v4 build configuration
└── package.json
```

---

## 🧪 Verification & Testing

Vesper includes a built-in automated 6-test cryptographic verification suite:
- **T01**: 256-bit CSPRNG key generation & URL-safe Base64 encoding.
- **T02**: Client AES-256-GCM authenticated encryption/decryption roundtrip.
- **T03**: 96-bit IV uniqueness and semantic indistinguishability.
- **T04**: 128-bit authentication tag tamper rejection & foreign key lockout.
- **T05**: Double-iterated SHA-256 key commitment & visual fingerprint.
- **T06**: Custom URL slug boundary validation & RFC sanitization.
