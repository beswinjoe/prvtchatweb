# PRVTCHAT Production Deployment & Operations Guide

This guide details the complete procedure for deploying PRVTCHAT to production, configuring Firebase services, deploying Cloud Functions for scheduled room shredding, and running local verification tests.

---

## 1. Architecture Overview

PRVTCHAT supports two production architectures:
1. **Option A: RAM-Only Network Relay (Recommended — No Database / Zero Disk Writes)**
   - Standalone volatile-memory Node.js WebSocket relay (`server/relay.ts`).
   - Zero database (no Firebase, no Supabase, no external DB, zero disk writes).
   - Instant active memory purge upon room expiry or creator revocation.
2. **Option B: Firebase Serverless (For 100% Static Frontend CDN Hosting)**
   - Client connects directly to Firebase Cloud Firestore for real-time document delivery.
   - Cloud Functions background scheduler (`scheduledRoomCleanup`) shreds expired rooms.

---

## 2. Option A: RAM-Only Network Relay Deployment

### Overview & Guarantees
- **Zero Persistent Storage:** Active rooms, encrypted packets, and presence records exist exclusively in heap memory (`Map<string, RelayRoom>`).
- **Zero Key Knowledge:** Decryption keys remain exclusively in client URL fragments (`#key=...`) and are never transmitted to the relay. The server only routes ciphertext and IVs.
- **Resource Quotas:**
  - Maximum 500 concurrent rooms in RAM.
  - Maximum 50 messages per room (ring buffer; oldest evicted).
  - Maximum 1MB per message or image attachment ciphertext.
  - Maximum 50 connections per room.
  - Per-connection rate limit: 15 messages/second.
- **Active Memory Sweep:** A 5-second interval actively zeroes and deletes expired and revoked rooms from RAM.

### Server Startup Commands
```bash
# Start relay server (default port 4040)
PORT=4040 npm run relay
```

### Hosting Options & Costs
| Platform | Tier | Monthly Cost | Startup Command |
|---|---|---|---|
| **Railway** | Starter / Hobby | $0 - $5 / mo | `npm run relay` |
| **Render** | Free / Starter | $0 - $7 / mo | `node server/index.ts` |
| **Fly.io** | Shared CPU 256MB | $0 (Free Tier) | `fly launch` |
| **VPS (Ubuntu)** | 1 CPU 1GB RAM | $3.50 - $5 / mo | `pm2 start server/index.ts --name prvtchat-relay` |

### Critical Disclosures & Trade-offs
1. **Server Restart Implications:** Because all state is stored purely in volatile RAM, restarting, crashing, or redeploying the server process destroys all active conversations immediately.
2. **Memory Inspection:** While the server process is alive, root administrators or malicious host operators with memory dump access could technically inspect RAM. However, all message payloads and images are AES-256-GCM encrypted on the client before reaching the server, so ciphertexts cannot be read without the client's URL fragment key.
3. **No Absolute Privacy Claims:** RAM-only storage does not prevent screen capture (analog hole) or malware on participant devices.

---

## 3. Option B: Firebase Serverless Setup

### Step 2.1: Create Firebase Project
1. Navigate to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and provide a project name (e.g., `prvtchat-production`).
3. Google Analytics may be disabled to maximize user privacy.
4. Upgrade the project to the **Blaze (Pay-as-you-go) Plan**. Cloud Functions v2 and Cloud Scheduler require Blaze (the free tier includes generous monthly allowances: 2M invocations, 400k GB-seconds).

### Step 2.2: Register Web Application
1. In the Firebase Console, go to **Project Settings** > **General** > **Your apps**.
2. Click the **Web** icon (`</>`) to register a new web app (e.g., `PRVTCHAT Web`).
3. Note the displayed Firebase configuration object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "prvtchat-production.firebaseapp.com",
     projectId: "prvtchat-production",
     storageBucket: "prvtchat-production.appspot.com",
     messagingSenderId: "123456789...",
     appId: "1:123456789:web:..."
   };
   ```

### Step 2.3: Enable Anonymous Authentication
1. Go to **Build** > **Authentication** > **Sign-in method**.
2. Click **Anonymous** in the provider list.
3. Toggle **Enable** and click **Save**.
4. *Rationale:* Anonymous auth issues a unique, authenticated user ID to each browser session. This enables strict Firestore Security Rules without requiring personal emails or passwords.

### Step 2.4: Create Cloud Firestore Database
1. Go to **Build** > **Firestore Database**.
2. Click **Create Database**.
3. Choose a location closest to your users (e.g., `nam5` for US Central, `eur3` for Europe).
4. Start in **Production Mode** (default restrictive rules).

---

## 3. Deploying Firestore Security Rules

1. Install Firebase CLI locally if not already installed:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in with your Google account:
   ```bash
   firebase login
   ```
3. Set your active project:
   ```bash
   firebase use --add prvtchat-production
   ```
4. Deploy security rules and indexes:
   ```bash
   firebase deploy --only firestore
   ```
5. Verify in the Firebase Console under **Firestore** > **Rules** that the active rules match [`firestore.rules`](file:///Users/beswinjoe/Documents/prvt_con/prvtchatweb/firestore.rules).

---

## 4. Deploying Backend Cloud Functions

The Cloud Functions in `functions/` ensure that rooms that expire when participants are offline are shredded promptly.

1. Navigate to the `functions` directory:
   ```bash
   cd functions
   npm install
   npm run build
   ```
2. Deploy the functions to Firebase:
   ```bash
   firebase deploy --only functions
   ```
3. Verify in the Firebase Console under **Build** > **Functions**:
   - `scheduledRoomCleanup` (Cloud Scheduler: `every 15 minutes`)
   - `cleanupRoom` (Callable HTTPS: cascades and shreds room, messages, presence, and members subcollections)
   - `joinRoom` (Callable HTTPS: atomic transaction enforcing 12-member cap)
   - `leaveRoom` (Callable HTTPS: atomic departure and slot release)
   - `transferOwnership` (Callable HTTPS: atomic owner transfer to active member)

---

## 5. Frontend Deployment

### Option A: Firebase Hosting
1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Deploy the hosting site:
   ```bash
   firebase deploy --only hosting
   ```

### Option B: Vercel / Netlify / Cloudflare Pages
1. Set the following environment variables in your deployment dashboard:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
2. Build command: `npm run build`
3. Output directory: `dist`

---

## 6. Automated Testing & Verification

PRVTCHAT provides comprehensive automated tests verifying the client crypto, lifecycle, and Firestore security rules.

### 1. Run Unit & Cryptography Tests
```bash
npm test
```
Executes fast, deterministic unit tests for:
- AES-256-GCM encryption/decryption, non-extractable keys, and SHA-256 commitments
- Magic byte image validation and canvas compression
- 7-day hard ceiling calculation and custom expiry parsing
- Authoritative room manager join, leave, and transfer logic
- Cryptographically secure slug generation

### 2. Run Firestore Security Rules Tests (Firestore Emulator)
```bash
npm run test:rules
```
Launches the local Firestore Emulator via `firebase emulators:exec` and verifies:
- Unauthenticated access denial
- Spoofed `creatorUid` or `ownerUid` rejection
- 7-day lifetime bound enforcement
- Owner-only revocation and rejection of peer revocation
- Atomic ownership transfer verification
- Member-only message and reaction authorization
- Departed member message denial
- Immutability of ciphertext during reactions
- Server-side 12-member limit bounds

### 3. Run Entire Test Suite (Unit + Rules)
```bash
npm run test:all
```

---

## 7. Production Verification Checklist

1. [ ] **Homepage Visual Integrity:** Open the production URL and verify that the calm sky-blue background (`#5B9EEA`), bold Inter headline, white pill badge, black/white pill buttons, and bottom feature chips render seamlessly.
2. [ ] **E2EE Key Isolation:** Open developer tools network tab. Create a room and send a message. Verify that request payloads to Firestore contain only Base64 ciphertext and IVs. Verify that `#key=` remains in the URL hash and is never present in HTTP headers or logs.
3. [ ] **Cross-Device Chat:** Open the invitation link on a secondary device or phone. Verify that messages decrypt instantly and presence indicators reflect the peer.
4. [ ] **Instant Revocation:** Click **Destroy Chat** in the chat navbar. Confirm that the room document status transitions to `revoked`, messages and presence records are wiped, and participants are routed to the expired screen.
5. [ ] **Scheduled Shredding:** Create a room with a 2-hour expiry. Leave the room and close all browser tabs. Verify via Firebase Functions logs that `scheduledRoomCleanup` detects the expired room and executes batch deletion.
