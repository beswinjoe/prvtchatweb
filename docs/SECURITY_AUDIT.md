# PRVTCHAT Security & Architecture Audit Report

**Date:** October 2026  
**Auditor:** Senior Security Engineer & Full-Stack TypeScript Architect  
**Target Repository:** [https://github.com/beswinjoe/prvtchatweb](https://github.com/beswinjoe/prvtchatweb)  
**Classification:** High-Assurance Ephemeral Zero-Knowledge Messaging  

---

## 1. Executive Summary

PRVTCHAT provides zero-knowledge, client-side end-to-end encrypted messaging with strict ephemeral lifecycles (maximum 7 days). Keys are transmitted exclusively via URL hash fragments (`#key=...`) and are never sent to the Firebase host or server endpoints.

This comprehensive audit evaluated the full application stack:
1. **Cryptography & Web Crypto API Key Management**
2. **Cloud Firestore Security Rules & Access Authorization**
3. **Database Architecture & Multi-Client Data Isolation**
4. **Room Lifecycles, Expiry Bounds & Shredding**
5. **Image Processing, Attachment Encryption & MIME Integrity**
6. **Error Handling, Telemetry & Privacy Leakage**

A total of **8 security vulnerabilities** were identified and remediated directly within the codebase, accompanied by automated tests.

---

## 2. Vulnerability Register & Remediation Summary

| ID | Title | Severity | Affected Files | Status |
|---|---|---|---|---|
| **SEC-01** | Permissive Firestore Rules (Unauthenticated Read/Write/Delete) | **CRITICAL** | `firestore.rules` | **RESOLVED** |
| **SEC-02** | Unscoped Collection Subscriptions (Cross-Room Data Exposure) | **CRITICAL** | `src/App.tsx`, `src/lib/firebase.ts` | **RESOLVED** |
| **SEC-03** | Silent Production Fallback to Local Relay | **HIGH** | `src/lib/firebase.ts`, `src/App.tsx` | **RESOLVED** |
| **SEC-04** | Predictable Room Suffixes via `Math.random()` | **HIGH** | `src/App.tsx`, `src/lib/utils.ts` | **RESOLVED** |
| **SEC-05** | Image MIME-Type Mismatch & Executable SVG Vector | **HIGH** | `src/lib/image.ts`, `src/components/modals/LightboxModal.tsx` | **RESOLVED** |
| **SEC-06** | Client-Only Expiration & Lack of Trusted Backend Deletion | **HIGH** | `src/lib/expiry.ts`, `functions/` | **RESOLVED** |
| **SEC-07** | Extractable CryptoKeys & Incomplete URL Hash Clearing | **MEDIUM** | `src/lib/crypto.ts`, `src/App.tsx` | **RESOLVED** |
| **SEC-08** | Stale Branding & Unhandled Error Boundary Fallbacks | **LOW** | `src/components/ErrorBoundary.tsx`, `src/lib/utils.ts` | **RESOLVED** |

---

## 3. Detailed Vulnerability Analyses & Fixes

### SEC-01: Permissive Firestore Security Rules
- **Severity:** Critical (CVSS 9.8)
- **Vulnerability:**
  Prior rules specified `allow read: if true;` and `allow delete: if true;` for room, message, and presence collections. Any unauthenticated attacker could:
  1. Enumerate and read all room metadata and ciphertexts.
  2. Overwrite existing messages or modify reaction payloads maliciously.
  3. Delete rooms and messages belonging to legitimate users.
  4. Spoof presence records and active participant states.
- **Remediation:**
  Rewrote `firestore.rules` using principle of least privilege:
  - All operations mandate `request.auth != null`.
  - Room read allowed only for active, unexpired rooms (`request.time.toMillis() < resource.data.expiresAt`).
  - Room create enforces `creatorUid == request.auth.uid`, `status == 'active'`, `createdAt <= request.time.toMillis()`, and `expiresAt <= request.time.toMillis() + 7 days`.
  - Room update restricted: only status revocation permitted by room creator or participants. Expiry extension, key commitment alteration, and creator tampering strictly blocked.
  - Message create requires authenticated sender (`senderUid == request.auth.uid`), valid room status, and strict payload schemas.
  - Message update strictly limited to sender soft-delete (`deleted: true`) or valid `reactions` map updates. Ciphertext, IV, and sender cannot be modified.
  - Presence operations bound to authenticated user's ID (`uid == request.auth.uid`).

---

### SEC-02: Unscoped Collection Subscriptions (Cross-Room Data Exposure)
- **Severity:** Critical (CVSS 8.6)
- **Vulnerability:**
  `App.tsx` subscribed to `onSnapshot(messagesCol)` at the collection root rather than querying by room slug. Every client connected to any room received ciphertexts, timestamps, sender UIDs, and presence records for every other conversation across the platform.
- **Remediation:**
  - Implemented scoped room queries: queries are filtered by `where('roomSlug', '==', activeSlug)`.
  - Updated `src/lib/firebase.ts` to export typed query primitives (`query`, `where`, `orderBy`, `limit`) and updated both live Firestore and dev relay layers to support filtered snapshots.

---

### SEC-03: Silent Production Fallback to Local Relay
- **Severity:** High (CVSS 7.5)
- **Vulnerability:**
  When Firebase credentials were absent or failed to initialize, `firebase.ts` silently reverted to an in-memory BroadcastChannel and localStorage relay. In production, users on separate physical devices sharing links would appear in disconnected empty rooms without an error.
- **Remediation:**
  - Added support for standard Vite environment variables (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID`, etc.).
  - Explicitly fail safe in production (`import.meta.env.PROD`): render a clear, dedicated configuration error UI with setup instructions rather than silently running a single-machine mock.
  - Restricted mock relay strictly to development (`import.meta.env.DEV` or `VITE_USE_MOCK_RELAY=true`).

---

### SEC-04: Predictable Room Identifiers via `Math.random()`
- **Severity:** High (CVSS 7.2)
- **Vulnerability:**
  `const randomSuffix = Math.floor(100 + Math.random() * 900);` generated only 900 possible numeric room suffixes. `Math.random()` lacks cryptographic entropy, enabling easy enumeration and room discovery attacks.
- **Remediation:**
  - Replaced with cryptographically secure random identifier generator using `crypto.getRandomValues()`.
  - Appends high-entropy alphanumeric suffixes (6+ characters, base32/hex) providing >36 bits of collision-resistant entropy per word pair.

---

### SEC-05: Image MIME-Type Mismatch & Executable SVG Vector
- **Severity:** High (CVSS 7.1)
- **Vulnerability:**
  1. `file.type.startsWith('image/')` accepted `image/svg+xml`, which can embed JavaScript payloads (`<script>`, `<svg onload="...">`).
  2. Canvas compression fallback to `image/jpeg` retained hardcoded `mimeType: 'image/webp'`, violating content-type integrity.
  3. No file signature (magic byte) verification was performed.
- **Remediation:**
  - Added magic byte inspection (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `52 49 46 46` for WebP, `47 49 46 38` for GIF).
  - Explicitly rejected SVG and HTML files.
  - Dynamically extracted genuine output MIME type from compressed data URL (`dataUrl.substring(5, dataUrl.indexOf(';'))`).

---

### SEC-06: Client-Only Expiration & Lack of Trusted Backend Deletion
- **Severity:** High (CVSS 6.8)
- **Vulnerability:**
  Room expiration and document shredding were executed client-side. If all participants closed their browsers before expiration, expired rooms and ciphertexts remained in the database indefinitely.
- **Remediation:**
  - Created trusted Firebase Cloud Functions in `functions/`:
    1. `scheduledRoomCleanup`: Recurring Cloud Scheduler job that queries expired/revoked rooms and performs batch document shredding.
    2. `cleanupRoom`: Authenticated callable function for immediate server-side cascading deletion upon room revocation.
  - Enforced server-side expiration checks in `firestore.rules` using `request.time.toMillis() < room.expiresAt`.

---

### SEC-07: Extractable CryptoKeys & Incomplete URL Hash Clearing
- **Severity:** Medium (CVSS 5.3)
- **Vulnerability:**
  `importRoomKey` set `extractable: true` by default. Once imported for session chat, extractable keys can be retrieved by rogue extensions or injected scripts via `crypto.subtle.exportKey()`. Additionally, leaving a chat room did not consistently scrub the URL fragment.
- **Remediation:**
  - Provided `extractable: false` option for operational chat session CryptoKeys.
  - Added strict IV validation (`iv.byteLength === 12`) in `decryptPayload`.
  - Added defensive URL hash wiping (`history.replaceState(null, '', window.location.pathname)`) and memory clearing on room exit, revocation, and expiration.

---

### SEC-08: Stale Branding & Error Boundary Fallbacks
- **Severity:** Low (CVSS 3.1)
- **Vulnerability:**
  `ErrorBoundary.tsx` and `utils.ts` referenced legacy project naming ("Vesper") and logged raw uncaught exceptions to the console.
- **Remediation:**
  - Standardized all titles, logs, and user-facing copy to `PRVTCHAT`.
  - Sanitized error boundary logs to avoid exposing internal state, room slugs, or key fragments.

---

## 4. Threat Model & Residual Risks

### What PRVTCHAT Protects Against
1. **Server-Side Eavesdropping:** Plaintext messages, images, and reactions are encrypted client-side with AES-256-GCM. Firebase never receives decryption keys.
2. **Database Snooping:** Compromise of Firestore yields only Base64-encoded ciphertexts and randomized IVs.
3. **Network Interception:** Keys are placed strictly in the URL hash fragment (`#key=...`). RFC 3986 guarantees hash fragments are never transmitted in HTTP request headers.
4. **Replay & Tampering:** AES-256-GCM uses a 128-bit authentication tag and fresh 96-bit random IV per message. Modified ciphertexts fail authentication and are dropped.
5. **Enforced Ephemerality:** Server rules enforce a hard maximum lifetime of 7 days from creation.

### Residual Risks & Honest Limitations
1. **Endpoint Compromise:** Zero-knowledge encryption protects data in transit and at rest on the server. It cannot protect against a compromised client device (keyloggers, malware, malicious browser extensions).
2. **Participant Integrity:** Any peer possessing the room key can read messages, capture screenshots, or copy plaintext.
3. **Traffic Metadata:** Firebase infrastructure and network providers observe connection timestamps, IP addresses, and document counts/sizes.
4. **Link Exposure:** Users must share invitation links through trusted, secure channels. Anyone with the URL fragment can decrypt conversation messages.
