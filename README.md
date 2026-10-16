# PRVTCHAT — Ephemeral Zero-Knowledge E2EE Messaging

> **Your words. Your privacy. One clear picture.**  
> Zero-knowledge end-to-end encrypted messaging with strict ephemeral lifecycles and automatic shredding.

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/beswinjoe/prvtchatweb)
[![Security Audit](https://img.shields.io/badge/audit-passed-brightgreen.svg)](docs/SECURITY_AUDIT.md)
[![Encryption](https://img.shields.io/badge/cipher-AES--256--GCM-indigo.svg)](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🔒 Security Architecture & Guarantees

1. **Client CSPRNG 256-Bit Key Generation**:
   The browser generates cryptographically random 256-bit AES-GCM keys directly in volatile RAM using native `window.crypto.subtle`. Keys never touch disk unencrypted.
2. **RFC 3986 Hash Fragment Isolation (`#key=...`)**:
   The decryption secret is placed exclusively in the URL hash fragment (`#key=...`). Under RFC 3986 §3.5, browsers **never** transmit hash fragments in HTTP request headers. Firebase servers and network intermediaries never observe keys.
3. **Unique 96-Bit IV + 128-Bit GCM Authentication Tag**:
   Every message, encrypted image, and reaction is sealed with a fresh, unique 96-bit random IV and verified with a 128-bit integrity tag. Modified or replayed ciphertexts are rejected.
4. **Authoritative 7-Day Ceilings & Trusted Backend Shredding**:
   - **4 Lifetime Options:** 2 hours, 24 hours (default), 3 days, or 7 days (maximum ceiling).
   - **Server-Side Enforcement:** Firestore security rules verify server time (`request.time.toMillis() < room.expiresAt`) and reject operations on expired/revoked rooms.
   - **Firebase Cloud Functions:** A scheduled background job (`scheduledRoomCleanup`) sweeps the database every 15 minutes, permanently deleting expired documents even if all clients close their browsers.
5. **Scoped Database Queries**:
   Client listeners and purge routines query documents filtered strictly by `where('roomSlug', '==', activeSlug)`, preventing any cross-conversation data exposure.
6. **MIME Integrity & XSS Defense**:
   Image attachments undergo client-side magic byte inspection (JPEG, PNG, WebP, GIF) before compression and encryption. SVG, HTML, and XML payloads are strictly rejected.
7. **Authoritative Single-Owner Role Model & Atomic Transfer**:
   Every active room has exactly one authoritative owner (`ownerUid`). The creator is the initial owner. Only the owner can destroy/revoke the room. The owner can transfer ownership to any active room member atomically.
8. **Server-Enforced 12-Participant Capacity**:
   Concurrency-safe server transactions and Firestore rules enforce a strict limit of 12 active participants per room. The authoritative `members` subcollection tracks active vs. departed status. Non-members and departed members are denied message read/write privileges.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Automated Test Suite
```bash
# Unit & cryptography tests
npm test

# Firestore Emulator security rules tests (requires Java)
npm run test:rules

# Run full suite (unit + rules)
npm run test:all
```
Executes comprehensive tests verifying AES-256-GCM encryption/decryption, tamper resistance, foreign key rejection, SHA-256 commitments, image magic byte validation, collision-resistant slug generation, 7-day expiration calculations, authoritative room roles, and Firestore security rules.

### 3. Start RAM-Only Relay Server (No Database / Zero Disk Writes)
```bash
npm run relay
```
Launches the standalone volatile-memory relay on `http://localhost:4040` (WebSocket + HTTP).
- Stores rooms, encrypted packets, and presence in **server RAM only**.
- Zero disk writes, zero database, zero log persistence of message payloads.
- Bounded ring buffers (max 50 messages/room, 1MB max payload) and active 5-second memory sweep.

### 4. Start Development Web Client
```bash
npm run dev
```
Open [http://localhost:5174/](http://localhost:5174/) in your browser.

### 5. Build for Production
```bash
npm run build
```

---

## 📁 Repository Layout

```text
prvtchatweb/
├── server/                      # RAM-Only Zero-Persistence Network Relay
│   ├── index.ts                 # CLI entrypoint for standalone relay (npm run relay)
│   ├── relay.ts                 # In-memory WebSocket/HTTP room relay & shredder
│   └── relay.test.ts            # Unit tests for RAM-only relay quotas & eviction
├── firestore.rules              # Restrictive Firestore security rules (Firebase mode)
├── firestore.indexes.json       # Composite query index definitions
├── firebase.json                # Firebase hosting, rules, and emulators config
├── functions/                   # Backend Cloud Functions (Node.js 20 + TypeScript)
│   ├── src/index.ts             # Scheduled cleanup job and callable shred endpoint
│   ├── src/cleanup.ts           # Resilient paginated batch document shredding
│   └── package.json
├── docs/
│   ├── SECURITY_AUDIT.md        # Complete vulnerability register & threat model
│   └── DEPLOYMENT.md            # Production deployment instructions (Relay & Firebase)
├── src/
│   ├── types/index.ts           # Central TypeScript definitions
│   ├── lib/
│   │   ├── crypto.ts            # Web Crypto AES-256-GCM + SHA-256 layer
│   │   ├── crypto.test.ts       # Cryptographic unit tests (tamper, cross-device)
│   │   ├── expiry.ts            # Authoritative 7-day clamping & time formatting
│   │   ├── expiry.test.ts       # Expiration logic tests
│   │   ├── firebase.ts          # Centralized Firebase initialization & adapters
│   │   ├── firestore.rules.test.ts # Emulator security rules test suite
│   │   ├── relayClient.ts       # WebSocket client adapter for RAM-only relay
│   │   ├── relayClient.test.ts  # Integration test for relay client and server
│   │   ├── image.ts             # Magic bytes validation & canvas compression
│   │   ├── image.test.ts        # Image MIME & security tests
│   │   ├── utils.ts             # Secure slug generation & helpers
│   │   └── utils.test.ts        # Slug generation & utility tests
│   ├── components/
│   │   ├── Navbar.tsx           # Seamless header with countdown & Destroy action
│   │   ├── LandingView.tsx      # Calm sky-blue hero landing page (Untouched)
│   │   ├── ChatView.tsx         # Encrypted messaging stream & attachments
│   │   ├── ExpiredView.tsx      # Post-destruction tombstone screen
│   │   ├── ErrorBoundary.tsx    # Sanitized React error boundary
│   │   └── modals/              # Create, Join, Share, Revoke, and Security modals
│   ├── App.tsx                  # Root application coordinator
│   ├── main.tsx                 # Root entry point
│   └── index.css                # Calm sky-blue design system & utility classes
└── package.json
```

---

## 📖 Documentation

- [**Security Audit Report**](docs/SECURITY_AUDIT.md) — Detailed vulnerability analyses, CVSS ratings, remediations, and threat model.
- [**Deployment Guide**](docs/DEPLOYMENT.md) — Step-by-step production rollout for Firebase, Firestore, Cloud Functions, and environment configuration.
