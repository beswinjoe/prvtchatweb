# PRVTCHAT — Production Security Audit & Implementation Plan

## 1. Inspection & Test Baseline

### 1.1 Existing Test Suite Execution
- **Command**: `npm test` (`vitest run`)
- **Initial Result**: 1 Failure, 39 Passing across 5 test suites.
- **Root Cause of Failure**: In `src/lib/utils.test.ts`, `expect(formatTimeRemaining(now + 3600000)).toMatch(/1h 0m left/)` failed due to millisecond timing drift between `now` capture and execution (`3599998ms` resulted in `59m 59s left`).
- **Remediation**: Added optional deterministic reference timestamp `now: number = Date.now()` to `formatTimeRemaining()` in `src/lib/utils.ts` and updated tests to eliminate clock race conditions.
- **Current Status**: **40/40 tests passing (100%)**.

### 1.2 Vulnerability & Functional Defect Register

| Component | Defect / Issue | Severity | Status | Planned Fix |
|---|---|---|---|---|
| **Firestore Rules** | Reaction updates mismatch: client submits `reactionsIv`, `reactionsCiphertext`, and `reactionsUpdatedAt`, but rules restrict to `affectedKeys().hasOnly(['reactions'])`. | **High** | Confirmed | Expand `affectedKeys().hasOnly(...)` in `firestore.rules` to include `['reactions', 'reactionsIv', 'reactionsCiphertext', 'reactionsUpdatedAt']`. |
| **Firestore Rules & UI** | Room revocation policy inconsistency: UI creates rooms with `allowPeerRevoke: true` and shows Destroy action to all participants, but rules check `creatorUid` on delete. | **High** | Confirmed | Align policy: allow authenticated participants to mark status as `revoked` when `allowPeerRevoke == true`, and allow deletion when room status is `revoked`. |
| **Frontend Shredding** | `purgeAndExpireRoom()` catches errors but immediately transitions to 'expired' view without reporting whether document deletion succeeded or failed. | **High** | Confirmed | Add explicit status tracking (`revoking` -> `shredding` -> `shredded` / `failed`), retry logic, and honest feedback. Never report permanent purge if delete failed. |
| **Backend Functions** | `scheduledRoomCleanup` query limit (50) and hardcoded `appId` can lead to stale rooms under load or failure if `appId` is customized. | **Medium** | Confirmed | Dynamically read `appId` from environment, add query pagination with sorting, and sweep `shredding` status rooms that may have stalled. |
| **Client Memory** | Cryptographic keys in memory must be securely wiped and URL fragments cleared on leave/revoke. | **Medium** | Confirmed | Clear window history state, nullify active `CryptoKey` references, and empty decrypted message arrays immediately upon leaving. |
| **Attachment Handling** | Magic byte validation and MIME re-encoding must reject SVG, HTML, and malformed files. | **High** | Addressed & Tested | Magic byte inspection active (`FF D8 FF`, `89 50 4E 47`, `52 49 46 46`, `47 49 46`), SVG rejected. Enforce maximum payload limits (1MB). |

---

## 2. Architecture Determination: Cross-Device Real-Time Messaging & RAM-Only Relay

### 2.1 Product Requirement Determination
- **Is cross-device real-time messaging required?**
  **YES.** PRVTCHAT's core purpose is enabling two or more individuals on different physical devices (smartphones, laptops, disparate network origins) to exchange end-to-end encrypted messages by sharing an ephemeral invitation link (`https://prvtchat.com/room-slug#key=...`).
- **Can cross-device messaging operate without a network relay?**
  **NO.** Web browsers on separate networks cannot establish direct IP connections without network intermediaries (NAT traversal / signaling / relay). WebRTC requires a signaling server and often TURN relays. Local-only browser storage (`localStorage`, `BroadcastChannel`) is strictly sandboxed to the local device origin.
- **Conclusion**: A network relay is mathematically and architecturally necessary for cross-device communication.

### 2.2 Proposed Architecture: RAM-Only Network Relay
To satisfy the user's preference for **no Firebase, no Supabase, and no external database**, we propose and implement a **RAM-only Relay Server**:

```
[ Alice (Browser) ]                     [ RAM-Only Relay Server ]                     [ Bob (Browser) ]
  Encrypts AES-256-GCM                   (Node.js / WebSockets / HTTP)                  Encrypts AES-256-GCM
  Key never leaves URL fragment                 |                                       Key never leaves URL fragment
       |                                        |                                             |
       |--- 1. Connect / Join Room (Slug) ----->| (Registers connection in Memory Map)        |
       |                                        |<---- 1. Connect / Join Room (Slug) ---------|
       |                                        |                                             |
       |--- 2. Post Ciphertext + IV ----------->| (Validates size <= 1MB, adds to RAM queue)  |
       |                                        |---- 2. Broadcasts Ciphertext + IV --------->|
       |                                        |                                             |
       |--- 3. Destroy / Revoke Room ---------->| (IMMEDIATELY zeroes & deletes from RAM)     |
       |                                        |---- Broadcasts Room Destroyed ------------->|
```

#### RAM-Only Relay Guarantees:
1. **Zero Disk Storage**: Zero database, zero SQLite, zero Redis, zero disk writes. Messages, presence, and room metadata exist only in volatile server memory (`Map<string, RoomState>`).
2. **Zero Key Storage**: Encryption keys are kept strictly in client URL fragments (`#key=...`) and are **never** transmitted to the relay. The relay only sees AES-256-GCM ciphertexts and IVs.
3. **Immediate Memory Eviction**: Upon room expiration or creator revocation, the room and all messages are immediately zeroed and removed from memory (`roomMap.delete(slug)`).
4. **Strict Resource Quotas**:
   - Max 100 concurrent rooms.
   - Max 50 messages per room (ring buffer; oldest evicted).
   - Max 1MB per message / attachment ciphertext.
   - Max 20 connections per room.
   - Rate limit: max 10 messages/sec per connection.

#### Unavoidable Architectural Trade-Offs & Honest Limitations:
- **Server Volatility**: If the relay process restarts, crashes, or is redeployed, all active rooms in RAM vanish instantly.
- **Process Memory Dump Vector**: While the server is running, the host root/cloud operator could technically inspect memory. End-to-end encryption mitigates this because ciphertexts cannot be decrypted without the client's URL fragment key.
- **Hosting Footprint**: Requires running a Node.js process / container (e.g. Railway, Render, Fly.io, or VPS) rather than a 100% static frontend CDN.
- **No Absolute Security**: RAM-only storage does not prevent screen capture (analog hole) or malware on participant devices.

---

## 3. Prioritized Implementation Steps

1. **Step 1: Fix Firestore Rules & Client Permissions (Defense in Depth)**
   - Update `firestore.rules` to permit reaction ciphertext updates (`reactionsIv`, `reactionsCiphertext`, `reactionsUpdatedAt`).
   - Align room revocation permissions with `allowPeerRevoke`.
   - Update `src/lib/firestore.rules.test.ts` to test reaction updates and peer revocation.
2. **Step 2: Hardening Room Purge & Lifecycle in Frontend**
   - Update `purgeAndExpireRoom()` in `src/App.tsx` to distinguish access revocation from data deletion, handle shredding states, and report errors truthfully.
3. **Step 3: Build RAM-Only Relay Server**
   - Implement standalone RAM-only WebSocket / HTTP server in `server/relay.ts` with strict rate limits, connection limits, and in-memory auto-expiry.
   - Add unit tests for the RAM-only relay server in `server/relay.test.ts`.
4. **Step 4: Relay Client Adapter in Frontend**
   - Support seamless switching between RAM-only relay and Firebase via configuration (`VITE_RELAY_URL` or fallback).
5. **Step 5: Automated Testing & Verification**
   - Execute all tests: crypto, image, expiry, utils, firestore rules, and relay server.
   - Run type checks (`tsc -b`) and build verification (`vite build`).
6. **Step 6: Update Documentation & Deployment Guide**
   - Document RAM-only relay hosting, environment variables, security characteristics, and commands in `README.md` and `docs/DEPLOYMENT.md`.
