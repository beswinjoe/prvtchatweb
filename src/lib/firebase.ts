// =============================================================================
// PRVTCHAT FIREBASE INITIALIZATION & SECURE DATABASE ADAPTER
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
  data: () => T | undefined;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface CollectionReference {
  _isMock?: boolean;
  path: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface QueryConstraintMock {
  _type: 'where' | 'orderBy' | 'limit';
  fieldPath?: string;
  opStr?: string;
  value?: unknown;
  directionStr?: 'asc' | 'desc';
  limitNum?: number;
}

export interface QueryMock {
  _isMock: boolean;
  _isQuery: boolean;
  path: string;
  constraints: QueryConstraintMock[];
}

export const appId: string =
  typeof __app_id !== 'undefined' && __app_id ? __app_id : 'prvtchat-ephemeral-e2ee';

/**
 * Resolves Firebase configuration from environment variables or runtime injection.
 */
function resolveFirebaseConfig(): Record<string, unknown> | null {
  // 1. Injected __firebase_config (Canvas / container hosting)
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      const cfg =
        typeof __firebase_config === 'string'
          ? JSON.parse(__firebase_config)
          : __firebase_config;
      if (cfg && cfg.apiKey && cfg.projectId) {
        return cfg as Record<string, unknown>;
      }
    } catch {
      // Ignore
    }
  }

  // 2. Vite environment variables
  const env = import.meta.env;
  if (env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID) {
    return {
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || `${env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: env.VITE_FIREBASE_APP_ID || '',
      measurementId: env.VITE_FIREBASE_MEASUREMENT_ID || '',
    };
  }

  return null;
}

const resolvedConfig = resolveFirebaseConfig();

let realAppInstance: FirebaseApp | null = null;
let realAuthInstance: realAuth.Auth | null = null;
let realDbInstance: realFirestore.Firestore | null = null;

if (resolvedConfig) {
  try {
    realAppInstance = initializeApp(resolvedConfig);
    realAuthInstance = realAuth.getAuth(realAppInstance);
    realDbInstance = realFirestore.getFirestore(realAppInstance);

    // Initialize Analytics safely if running in browser environment
    if (typeof window !== 'undefined' && resolvedConfig.measurementId) {
      import('firebase/analytics')
        .then(({ getAnalytics, isSupported }) => {
          isSupported().then((supported) => {
            if (supported && realAppInstance) {
              getAnalytics(realAppInstance);
            }
          }).catch(() => {});
        })
        .catch(() => {});
    }
  } catch (err) {
    console.warn('Real Firebase initialization failed:', err);
    realAppInstance = null;
    realAuthInstance = null;
    realDbInstance = null;
  }
}

export const isProduction = import.meta.env.PROD;
export const isMockRelayAllowed =
  import.meta.env.DEV || import.meta.env.VITE_USE_MOCK_RELAY === 'true';

export const isFirebaseConfigured = Boolean(realAppInstance);

/**
 * In production, if Firebase is missing and mock relay is not explicitly allowed,
 * this error is populated so the application can fail safe with an explanatory screen
 * rather than silently simulating multi-user chat on a single device.
 */
export const firebaseConfigError: string | null =
  !realAppInstance && isProduction && !isMockRelayAllowed
    ? 'Firebase configuration is missing in production. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in your environment deployment settings.'
    : null;

export const auth = realAuthInstance;
export const db = realDbInstance;

// =============================================================================
// STANDALONE IN-MEMORY & BROADCAST RELAY (Local Dev & Testing Only)
// =============================================================================

const mockStore = new Map<string, Record<string, unknown>>();
const STORAGE_KEY = 'prvtchat_local_relay_v2';

try {
  if (typeof window !== 'undefined' && window.localStorage && isMockRelayAllowed) {
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
  if (!isMockRelayAllowed) return;
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

type BroadcastMessage =
  | { type: 'set'; path: string; data: Record<string, unknown> }
  | { type: 'update'; path: string; data: Record<string, unknown> }
  | { type: 'delete'; path: string }
  | { type: 'clear' };

const channel: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window && isMockRelayAllowed
    ? new BroadcastChannel('prvtchat_cross_tab_relay')
    : null;

const subscribers = new Map<string, Set<() => void>>();

const notifySubscribers = (path: string) => {
  const docListeners = subscribers.get(path);
  if (docListeners) {
    docListeners.forEach((fn) => fn());
  }

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

const getMockUser = (): User => {
  let uid = '';
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      uid = window.sessionStorage.getItem('prvtchat_mock_uid') || '';
      if (!uid) {
        const cryptoObj = window.crypto || (globalThis as unknown as { crypto: Crypto }).crypto;
        const randBytes = cryptoObj.getRandomValues(new Uint8Array(8));
        let hex = '';
        for (let i = 0; i < randBytes.length; i++) {
          hex += randBytes[i].toString(16).padStart(2, '0');
        }
        uid = 'anon_' + hex;
        window.sessionStorage.setItem('prvtchat_mock_uid', uid);
      }
    }
  } catch {
    uid = 'anon_local_operator';
  }
  return {
    uid: uid || 'anon_local_operator',
    displayName: 'Operator',
    isAnonymous: true,
  };
};

const mockUser = getMockUser();

// =============================================================================
// UNIFIED FIRESTORE API WRAPPERS
// =============================================================================

export function doc(
  _database: unknown,
  ...pathSegments: string[]
): DocumentReference {
  const cleanPath = pathSegments.filter(Boolean).join('/');
  if (realDbInstance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (realFirestore.doc as any)(realDbInstance, cleanPath);
  }
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

export function collection(
  _database: unknown,
  ...pathSegments: string[]
): CollectionReference {
  const cleanPath = pathSegments.filter(Boolean).join('/');
  if (realDbInstance) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (realFirestore.collection as any)(realDbInstance, cleanPath);
  }
  return {
    _isMock: true,
    path: cleanPath,
  };
}

export function where(fieldPath: string, opStr: string, value: unknown): QueryConstraintMock {
  return { _type: 'where', fieldPath, opStr, value };
}

export function orderBy(
  fieldPath: string,
  directionStr: 'asc' | 'desc' = 'asc',
): QueryConstraintMock {
  return { _type: 'orderBy', fieldPath, directionStr };
}

export function limit(limitNum: number): QueryConstraintMock {
  return { _type: 'limit', limitNum };
}

export function query(
  colRef: CollectionReference,
  ...constraints: QueryConstraintMock[]
): unknown {
  if (realDbInstance && !colRef._isMock) {
    const realConstraints = constraints.map((c) => {
      if (c._type === 'where') return realFirestore.where(c.fieldPath!, c.opStr as realFirestore.WhereFilterOp, c.value);
      if (c._type === 'orderBy') return realFirestore.orderBy(c.fieldPath!, c.directionStr);
      if (c._type === 'limit') return realFirestore.limit(c.limitNum!);
      return c;
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (realFirestore.query as any)(colRef, ...realConstraints);
  }

  return {
    _isMock: true,
    _isQuery: true,
    path: colRef.path,
    constraints,
  };
}

export function serverTimestamp(): unknown {
  if (realDbInstance) {
    return realFirestore.serverTimestamp();
  }
  return Date.now();
}

export async function getDoc<T = any>(
  docRef: DocumentReference,
): Promise<DocumentSnapshot<T>> {
  if (realDbInstance && !docRef._isMock) {
    const snap = await realFirestore.getDoc(docRef as realFirestore.DocumentReference);
    return {
      id: snap.id,
      exists: () => snap.exists(),
      data: () => snap.data() as T | undefined,
    };
  }
  const path = docRef.path || '';
  const data = mockStore.get(path);
  return {
    id: docRef.id || '',
    exists: () => Boolean(data),
    data: () => (data ? ({ ...data } as T) : undefined),
  };
}

export async function setDoc(
  docRef: DocumentReference,
  data: Record<string, any>,
  options?: { merge?: boolean },
): Promise<void> {
  if (realDbInstance && !docRef._isMock) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (realFirestore.setDoc as any)(docRef, data, options);
  }
  const path = docRef.path || '';
  const existing = options?.merge ? mockStore.get(path) || {} : {};
  const updated = { ...existing, ...data };
  mockStore.set(path, updated);
  persistStore();
  notifySubscribers(path);
  channel?.postMessage({ type: 'set', path, data: updated });
}

export async function updateDoc(
  docRef: DocumentReference,
  partial: Record<string, any>,
): Promise<void> {
  if (realDbInstance && !docRef._isMock) {
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

export async function deleteDoc(
  docRef: DocumentReference,
): Promise<void> {
  if (realDbInstance && !docRef._isMock) {
    return await realFirestore.deleteDoc(docRef as realFirestore.DocumentReference);
  }
  const path = docRef.path || '';
  mockStore.delete(path);
  persistStore();
  notifySubscribers(path);
  channel?.postMessage({ type: 'delete', path });
}

export async function addDoc(
  colRef: CollectionReference,
  data: Record<string, any>,
): Promise<DocumentReference> {
  if (realDbInstance && !colRef._isMock) {
    const res = await realFirestore.addDoc(colRef as realFirestore.CollectionReference, data);
    return {
      path: res.path,
      id: res.id,
    };
  }
  const colPath = colRef.path || '';
  const cryptoObj = typeof window !== 'undefined' && window.crypto ? window.crypto : (globalThis as unknown as { crypto: Crypto }).crypto;
  const randBytes = cryptoObj.getRandomValues(new Uint8Array(6));
  let hex = '';
  for (let i = 0; i < randBytes.length; i++) {
    hex += randBytes[i].toString(16).padStart(2, '0');
  }
  const autoId = 'msg_' + Date.now() + '_' + hex;
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

export async function getDocs(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any,
): Promise<QuerySnapshot> {
  if (realDbInstance && !ref._isMock) {
    return (await realFirestore.getDocs(ref)) as unknown as QuerySnapshot;
  }
  const colPath = ref.path || '';
  let docs: QueryDocumentSnapshot[] = [];

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

  if (ref._isQuery && ref.constraints) {
    for (const c of ref.constraints as QueryConstraintMock[]) {
      if (c._type === 'where' && c.opStr === '==' && c.fieldPath) {
        docs = docs.filter((d) => d.data()[c.fieldPath!] === c.value);
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

export function onSnapshot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onNext: (snap: any) => void,
  onError?: (err: Error) => void,
): () => void {
  if (realDbInstance && !ref._isMock) {
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
        let docs: QueryDocumentSnapshot[] = [];
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

        if (ref._isQuery && ref.constraints) {
          for (const c of ref.constraints as QueryConstraintMock[]) {
            if (c._type === 'where' && c.opStr === '==' && c.fieldPath) {
              docs = docs.filter((d) => d.data()[c.fieldPath!] === c.value);
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

  if (!subscribers.has(path)) {
    subscribers.set(path, new Set());
  }
  const listenerSet = subscribers.get(path)!;
  listenerSet.add(pushUpdate);

  setTimeout(pushUpdate, 0);

  return () => {
    listenerSet.delete(pushUpdate);
    if (listenerSet.size === 0) {
      subscribers.delete(path);
    }
  };
}

export function onAuthStateChanged(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _authInstance: any,
  callback: (user: User | null) => void,
): () => void {
  if (realAuthInstance) {
    return realAuth.onAuthStateChanged(realAuthInstance, callback);
  }
  const timer = setTimeout(() => {
    callback(mockUser);
  }, 0);
  return () => clearTimeout(timer);
}

export async function signInAnonymously(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _authInstance: any,
): Promise<{ user: User }> {
  if (realAuthInstance) {
    const cred = await realAuth.signInAnonymously(realAuthInstance);
    return { user: cred.user };
  }
  return { user: mockUser };
}

export async function signInWithCustomToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _authInstance: any,
  token: string,
): Promise<{ user: User }> {
  if (realAuthInstance) {
    const cred = await realAuth.signInWithCustomToken(realAuthInstance, token);
    return { user: cred.user };
  }
  return { user: mockUser };
}
