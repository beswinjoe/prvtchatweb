# PRVTCHAT — Ephemeral Zero-Knowledge E2EE Messaging

> **Private conversations. Nothing left behind.**  
> Create an encrypted chat, share your link, and let it disappear when you're done.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/beswinjoe/prvtchatweb)
[![Tests](https://img.shields.io/badge/tests-13%20passing-brightgreen.svg)](https://github.com/beswinjoe/prvtchatweb)
[![Encryption](https://img.shields.io/badge/cipher-AES--256--GCM-indigo.svg)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🔒 Cryptographic Architecture & Guarantees

1. **Client CSPRNG 256-Bit Key Generation**:
   The browser generates cryptographically random 256-bit AES-GCM keys directly in volatile RAM using `window.crypto.subtle`.
2. **RFC 3986 Fragment Isolation (`#key=...`)**:
   The decryption secret is placed exclusively in the URL hash fragment (`#key=...`). Under RFC 3986 §3.5, browsers **never** transmit URL fragments to HTTP servers, web proxies, or database relays.
3. **96-Bit Initialization Vector + 128-Bit GCM Authentication Tag**:
   Every message, image, and emoji reaction is sealed with an individual 96-bit IV and authenticated with a 128-bit integrity tag before leaving your device.
4. **Authoritative Expiration & Instant Shredding**:
   - **4 Expiration Choices**: 2 hours, 24 hours (default), 3 days, or 7 days (maximum ceiling).
   - **Strict 7-Day Ceiling**: Clamped authoritatively to prevent frontend manipulation.
   - **Instant Destruction**: Any participant can click **Destroy Chat** at any moment to invalidate access, purge all message documents, encrypted attachments, and presence records from the database.
5. **Zero-Knowledge Cloud Relay & Dual-Mode Adaptability**:
   - **Live Production**: Connects to Firebase Firestore & Auth using security rules that block access to expired or revoked rooms.
   - **Local / Standalone**: Automatically switches to an in-memory cross-tab [`BroadcastChannel`](https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel) relay for instant offline multi-tab testing.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
```bash
npm test
```
Executes 13 unit tests verifying key generation, AES-256-GCM encryption/decryption roundtrip, 1-bit tamper rejection, foreign key rejection, SHA-256 commitments, and 7-day expiration calculations.

### 3. Start Development Server
```bash
npm run dev
```

Open [http://localhost:5174/](http://localhost:5174/) in your browser.

### 4. Build for Production
```bash
npm run build
```

---

## 📁 Project Structure

```text
prvtchatweb/
├── firestore.rules             # Firestore security rules enforcing 7-day lifetime
├── src/
│   ├── types/
│   │   └── index.ts            # Central TypeScript definitions
│   ├── lib/
│   │   ├── crypto.ts           # Web Crypto API layer (AES-256-GCM, SHA-256)
│   │   ├── crypto.test.ts      # Unit tests for Web Crypto primitives
│   │   ├── expiry.ts           # Expiration calculation & 7-day clamping logic
│   │   ├── expiry.test.ts      # Unit tests for TTL and revocation rules
│   │   ├── firebase.ts         # Dual-mode Firebase / BroadcastChannel relay
│   │   ├── image.ts            # Client-side canvas image compression
│   │   ├── constants.ts        # 2h, 24h, 3d, 7d presets and configuration
│   │   └── utils.ts            # Slug sanitization, validation, avatars
│   ├── components/
│   │   ├── Navbar.tsx          # Sticky top bar with countdown & Destroy action
│   │   ├── LandingView.tsx     # Clean, memorable homepage hero
│   │   ├── ChatView.tsx        # Focused encrypted conversation workspace
│   │   ├── ExpiredView.tsx     # Clean destruction / tombstone screen
│   │   ├── ErrorBoundary.tsx   # React error boundary for runtime resilience
│   │   └── modals/
│   │       ├── CreateChatModal.tsx # Compact room creation modal
│   │       ├── JoinModal.tsx       # Link / credential join modal
│   │       ├── ShareModal.tsx      # Share link & out-of-band fingerprint
│   │       ├── RevokeModal.tsx     # Destruction confirmation dialog
│   │       ├── SecurityModal.tsx   # Cryptographic specification & threat model
│   │       └── LightboxModal.tsx   # In-memory decrypted image viewer
│   ├── App.tsx                 # Core application coordinator & state
│   ├── main.tsx                # React root mount with ErrorBoundary
│   └── index.css               # Midnight gradient atmospheric design tokens
├── index.html                  # SEO metadata, Plus Jakarta Sans & JetBrains Mono
├── vite.config.ts              # Vite + Tailwind v4 build configuration
└── package.json
```

---

## ⚠️ Threat Model & Limitations

While PRVTCHAT provides zero-knowledge cryptographic privacy against servers, intermediaries, and database administrators, it is bound by the **analog hole**:
- Any participant who took screenshots, copied plaintext, or downloaded attachments while the room was active retains those copies locally.
- Server destruction guarantees that stored database records, encrypted payloads, and presence heartbeats are irrevocably purged.
