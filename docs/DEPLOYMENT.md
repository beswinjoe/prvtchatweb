# PRVTCHAT Production Deployment & Operations Guide

This guide details the complete procedure for deploying PRVTCHAT to production, configuring Firebase services, deploying Cloud Functions for scheduled room shredding, and running local verification tests.

---

## 1. Architecture Overview

PRVTCHAT uses a two-tier architecture:
1. **Frontend Client (Vite + React 19 + TypeScript):**
   - Pure client-side Web Crypto AES-256-GCM encryption/decryption.
   - Zero-knowledge URL fragment key distribution (`#key=...`).
   - Connects to Firebase Cloud Firestore for real-time encrypted document delivery.
   - Connects to Firebase Anonymous Authentication for ephemeral user sessions.
2. **Backend Services (Firebase Cloud Functions v2):**
   - Scheduled Cloud Scheduler job (`scheduledRoomCleanup`) executing every 15 minutes.
   - Permanently shreds expired and revoked rooms, messages, attachments, and presence records.
   - Callable endpoint (`cleanupRoom`) for immediate server-side cascading deletion upon manual room destruction.

---

## 2. Firebase Project Setup

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
   - `scheduledRoomCleanup` (Schedule: `every 15 minutes`)
   - `cleanupRoom` (Callable HTTPS endpoint)

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

## 6. Local Development & Emulator Testing

PRVTCHAT includes an adaptive dev mode so you can develop and run tests locally without connecting to live Firebase.

### Local Development (Zero-Config Relay)
Run the Vite development server:
```bash
npm run dev
```
In development, if no `.env` credentials are provided, PRVTCHAT automatically uses an in-memory BroadcastChannel relay across tabs on `http://localhost:5174/`.

### Local Firebase Emulator Testing
To run tests against the full local Firebase Emulator Suite:
```bash
# 1. Start emulators in background
npx firebase emulators:start --only firestore

# 2. Run automated test suite
npm test
```

---

## 7. Production Verification Checklist

1. [ ] **Homepage Visual Integrity:** Open the production URL and verify that the calm sky-blue background (`#5B9EEA`), bold Inter headline, white pill badge, black/white pill buttons, and bottom feature chips render seamlessly.
2. [ ] **E2EE Key Isolation:** Open developer tools network tab. Create a room and send a message. Verify that request payloads to Firestore contain only Base64 ciphertext and IVs. Verify that `#key=` remains in the URL hash and is never present in HTTP headers or logs.
3. [ ] **Cross-Device Chat:** Open the invitation link on a secondary device or phone. Verify that messages decrypt instantly and presence indicators reflect the peer.
4. [ ] **Instant Revocation:** Click **Destroy Chat** in the chat navbar. Confirm that the room document status transitions to `revoked`, messages and presence records are wiped, and participants are routed to the expired screen.
5. [ ] **Scheduled Shredding:** Create a room with a 2-hour expiry. Leave the room and close all browser tabs. Verify via Firebase Functions logs that `scheduledRoomCleanup` detects the expired room and executes batch deletion.
