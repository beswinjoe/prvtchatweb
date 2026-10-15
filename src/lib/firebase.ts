// =============================================================================
// FIREBASE INITIALIZATION & ADAPTIVE ZERO-CONFIG FALLBACK RELAY
// =============================================================================
// If a valid __firebase_config is injected (e.g. Canvas/Firebase Studio),
// this uses live Firebase Auth & Firestore.
// If running standalone (e.g. local dev, static preview), this seamlessly
// uses an in-memory + BroadcastChannel + localStorage real-time relay so
// that E2EE messaging, multi-tab testing, and security verification work
// instantly out of the box with zero runtime errors or blank screens.
// =============================================================================

import { initializeApp, type FirebaseApp } from 'firebase/app';
import * as realAuth from 'firebase/auth';
import * as realFirestore from 'firebase/firestore';

// Global declarations for injected variables
declare global {
  // eslint-disable-next-line no-var
  var __firebase_config: string | Record<string, unknown> | undefined;
  // eslint-disable-next-line no-var
  var __app_id: string | undefined;
  // eslint-disable-next-line no-var
  var __initial_auth_token: string | undefined;
}

export interface DocumentSnapshot<T = any> {
  id: string;
  exists: () => boolean;
  data: () => T;
}

export interface QueryDocumentSnapshot<T = any> {
  id: string;
  ref: DocumentReference;
  exists: () => boolean;
  data: () => T;
}

export interface QuerySnapshot<T = any> {
  empty: boolean;
  size: number;
  docs: QueryDocumentSnapshot<T>[];
  forEach: (callback: (result: QueryDocumentSnapshot<T>) => void) => void;
}

export interface User {
  uid: string;
  displayName?: string | null;
  isAnonymous?: boolean;
}

export interface DocumentReference {
  _isMock?: boolean;
  path: string;
  id: string;
  parentPath?: string;
  // allow real DocumentReference compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface CollectionReference {
  _isMock?: boolean;
  path: string;
  // allow real CollectionReference compatibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export const appId: string =
  typeof __app_id !== 'undefined' && __app_id ? __app_id : 'prvtchat-ephemeral-e2ee';

// Determine if valid Firebase credentials exist
const parsedConfig = (() => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      const cfg =
        typeof __firebase_config === 'string'
          ? JSON.parse(__firebase_config)
          : __firebase_config;
      if (cfg && cfg.apiKey && cfg.projectId) {
        return cfg;
      }
    }
  } catch {
    // Ignore parse error
  }
  return null;
})();

let realAppInstance: FirebaseApp | null = null;
let realAuthInstance: realAuth.Auth | null = null;
let realDbInstance: realFirestore.Firestore | null = null;

if (parsedConfig) {
  try {
    realAppInstance = initializeApp(parsedConfig);
    realAuthInstance = realAuth.getAuth(realAppInstance);
    realDbInstance = realFirestore.getFirestore(realAppInstance);
  } catch (err) {
    console.warn('Real Firebase initialization failed, switching to local relay:', err);
    realAppInstance = null;
    realAuthInstance = null;
    realDbInstance = null;
  }
}

export const isUsingMockRelay = !realAppInstance;

// =============================================================================
// STANDALONE IN-MEMORY & BROADCAST RELAY (Local Dev / Offline Support)
// =============================================================================

// In-memory store: Map<path, Record<string, unknown>>
const mockStore = new Map<string, Record<string, unknown>>();

// Load saved data if present in localStorage
const STORAGE_KEY = 'prvtchat_local_relay_v1';
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v === 'object') {
          mockStore.set(k, v as Record<string, unknown>);
        }
      }
    }
  }
} catch {
  // Ignore
}

const persistStore = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const obj: Record<string, Record<string, unknown>> = {};
      for (const [k, v] of mockStore.entries()) {
        obj[k] = v;
      }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    }
  } catch {
    // Ignore quota issues
  }
};

// Cross-tab broadcast channel
type BroadcastMessage =
  | { type: 'set'; path: string; data: Record<string, unknown> }
  | { type: 'update'; path: string; data: Record<string, unknown> }
  | { type: 'delete'; path: string }
  | { type: 'clear' };

const channel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('prvtchat_cross_tab_relay')
    : null;

// Subscribers for doc & collection paths: Map<path, Set<() => void>>
const subscribers = new Map<string, Set<() => void>>();

const notifySubscribers = (path: string) => {
  // Notify exact doc listeners
  const docListeners = subscribers.get(path);
  if (docListeners) {
    docListeners.forEach((fn) => fn());
  }

  // Also notify parent collection listeners
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash > 0) {
    const parentPath = path.substring(0, lastSlash);
    const colListeners = subscribers.get(parentPath);
    if (colListeners) {
      colListeners.forEach((fn) => fn());
    }
  }
};

if (channel) {
  channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
    const msg = event.data;
    if (msg.type === 'set' || msg.type === 'update') {
      const existing = mockStore.get(msg.path) || {};
      mockStore.set(msg.path, { ...existing, ...msg.data });
      notifySubscribers(msg.path);
    } else if (msg.type === 'delete') {
      mockStore.delete(msg.path);
      notifySubscribers(msg.path);
    }
  };
}

// Generate persistent mock anonymous user ID per browser session
const getMockUser = (): User => {
  let uid = '';
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      uid = window.sessionStorage.getItem('prvtchat_mock_uid') || '';
      if (!uid) {
        uid = 'anon_' + Math.random().toString(36).substring(2, 9);
        window.sessionStorage.setItem('prvtchat_mock_uid', uid);
      }
    }
  } catch {
    uid = 'anon_local_peer';
  }
  return { uid, isAnonymous: true };
};

const mockUser = getMockUser();

// =============================================================================
// EXPORTED UNIFIED API
// =============================================================================

export const auth = realAuthInstance || {
  currentUser: mockUser,
  _isMock: true,
};

export const db = realDbInstance || {
  _isMock: true,
};

// Document Reference builder
export function doc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _database: any,
  ...pathSegments: string[]
): DocumentReference {
  if (realDbInstance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (realFirestore.doc as any)(_database, ...pathSegments);
  }
  const cleanPath = pathSegments.filter(Boolean).join('/');
  const lastSlash = cleanPath.lastIndexOf('/');
  const id = lastSlash >= 0 ? cleanPath.substring(lastSlash + 1) : cleanPath;
  const parentPath = lastSlash >= 0 ? cleanPath.substring(0, lastSlash) : '';
  return {
    _isMock: true,
    path: cleanPath,
    id,
    parentPath,
  };
}

// Collection Reference builder
export function collection(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _database: any,
  ...pathSegments: string[]
): CollectionReference {
  if (realDbInstance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (realFirestore.collection as any)(_database, ...pathSegments);
  }
  const cleanPath = pathSegments.filter(Boolean).join('/');
  return {
    _isMock: true,
    path: cleanPath,
  };
}

// Get Document
export async function getDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  docRef: any
): Promise<DocumentSnapshot> {
  if (realDbInstance) {
    return (await realFirestore.getDoc(docRef)) as DocumentSnapshot;
  }
  const path = docRef.path || '';
  const data = mockStore.get(path);
  return {
    id: docRef.id || '',
    exists: () => Boolean(data),
    data: () => (data ? { ...data } : undefined),
  };
}

// Set Document
export async function setDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  docRef: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
): Promise<void> {
  if (realDbInstance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (realFirestore.setDoc as any)(docRef, data);
  }
  const path = docRef.path || '';
  mockStore.set(path, { ...data });
  persistStore();
  notifySubscribers(path);
  channel?.postMessage({ type: 'set', path, data });
}

// Update Document
export async function updateDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  docRef: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  partial: any
): Promise<void> {
  if (realDbInstance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (realFirestore.updateDoc as any)(docRef, partial);
  }
  const path = docRef.path || '';
  const existing = mockStore.get(path) || {};
  const updated = { ...existing, ...partial };
  mockStore.set(path, updated);
  persistStore();
  notifySubscribers(path);
  channel?.postMessage({ type: 'update', path, data: updated });
}

// Delete Document
export async function deleteDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  docRef: any
): Promise<void> {
  if (realDbInstance) {
    return await realFirestore.deleteDoc(docRef);
  }
  const path = docRef.path || '';
  mockStore.delete(path);
  persistStore();
  notifySubscribers(path);
  channel?.postMessage({ type: 'delete', path });
}

// Add Document to Collection
export async function addDoc(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colRef: any,
  data: Record<string, unknown>
): Promise<DocumentReference> {
  if (realDbInstance) {
    return await realFirestore.addDoc(colRef, data);
  }
  const colPath = colRef.path || '';
  const autoId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const docPath = `${colPath}/${autoId}`;
  mockStore.set(docPath, { ...data, id: autoId });
  persistStore();
  notifySubscribers(docPath);
  channel?.postMessage({ type: 'set', path: docPath, data: { ...data, id: autoId } });
  return {
    _isMock: true,
    path: docPath,
    id: autoId,
    parentPath: colPath,
  };
}

// Get Docs in Collection
export async function getDocs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  colRef: any
): Promise<QuerySnapshot> {
  if (realDbInstance) {
    return (await realFirestore.getDocs(colRef)) as unknown as QuerySnapshot;
  }
  const colPath = colRef.path || '';
  const docs: QueryDocumentSnapshot[] = [];
  for (const [p, val] of mockStore.entries()) {
    if (p.startsWith(colPath + '/')) {
      const remainder = p.substring(colPath.length + 1);
      if (!remainder.includes('/')) {
        const docRef: DocumentReference = { _isMock: true, path: p, id: remainder, parentPath: colPath };
        docs.push({
          id: remainder,
          ref: docRef,
          exists: () => true,
          data: () => ({ ...val }),
        });
      }
    }
  }
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs,
    forEach: (cb) => docs.forEach(cb),
  };
}

// Snapshot listener for doc or collection
export function onSnapshot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNext: (snap: any) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onError?: (err: Error) => void
): () => void {
  if (realDbInstance) {
    return realFirestore.onSnapshot(ref, onNext, onError);
  }

  const path = ref.path || '';
  const isDoc = Boolean(ref.id);

  const pushUpdate = () => {
    try {
      if (isDoc) {
        const data = mockStore.get(path);
        onNext({
          id: ref.id,
          exists: () => Boolean(data),
          data: () => (data ? { ...data } : undefined),
        });
      } else {
        const docs: QueryDocumentSnapshot[] = [];
        for (const [p, val] of mockStore.entries()) {
          if (p.startsWith(path + '/')) {
            const remainder = p.substring(path.length + 1);
            if (!remainder.includes('/')) {
              const docRef: DocumentReference = { _isMock: true, path: p, id: remainder, parentPath: path };
              docs.push({
                id: remainder,
                ref: docRef,
                exists: () => true,
                data: () => ({ ...val }),
              });
            }
          }
        }
        onNext({
          empty: docs.length === 0,
          size: docs.length,
          docs,
          forEach: (cb: (doc: QueryDocumentSnapshot) => void) => docs.forEach(cb),
        });
      }
    } catch (e) {
      onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  };

  // Register listener
  if (!subscribers.has(path)) {
    subscribers.set(path, new Set());
  }
  const listenerSet = subscribers.get(path)!;
  listenerSet.add(pushUpdate);

  // Trigger initial snapshot synchronously or next tick
  setTimeout(pushUpdate, 0);

  return () => {
    listenerSet.delete(pushUpdate);
    if (listenerSet.size === 0) {
      subscribers.delete(path);
    }
  };
}

// Auth State Listener
export function onAuthStateChanged(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _authInstance: any,
  callback: (user: User | null) => void
): () => void {
  if (realAuthInstance) {
    return realAuth.onAuthStateChanged(realAuthInstance, callback);
  }
  // Immediately call with mock user on next microtask
  const timer = setTimeout(() => {
    callback(mockUser);
  }, 0);
  return () => clearTimeout(timer);
}

// Sign In Anonymously
export async function signInAnonymously(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _authInstance: any
): Promise<{ user: User }> {
  if (realAuthInstance) {
    const cred = await realAuth.signInAnonymously(realAuthInstance);
    return { user: cred.user };
  }
  return { user: mockUser };
}

// Sign In With Custom Token
export async function signInWithCustomToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _authInstance: any,
  token: string
): Promise<{ user: User }> {
  if (realAuthInstance) {
    const cred = await realAuth.signInWithCustomToken(realAuthInstance, token);
    return { user: cred.user };
  }
  return { user: mockUser };
}
