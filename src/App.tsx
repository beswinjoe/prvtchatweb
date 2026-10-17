import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatView } from './components/ChatView';
import { ExpiredView } from './components/ExpiredView';
import { LandingView } from './components/LandingView';
import { CreateChatModal } from './components/modals/CreateChatModal';
import { JoinModal } from './components/modals/JoinModal';
import { LightboxModal } from './components/modals/LightboxModal';
import { MemberManagementModal } from './components/modals/MemberManagementModal';
import { RevokeModal } from './components/modals/RevokeModal';
import { SecurityModal, type InfoModalTab } from './components/modals/SecurityModal';
import { ShareModal } from './components/modals/ShareModal';
import { Navbar } from './components/Navbar';
import { DEFAULT_EXPIRATION_ID } from './lib/constants';
import {
  computeKeyMetadata,
  decryptPayload,
  encryptPayload,
  generateRoomKey,
  importRoomKey,
} from './lib/crypto';
import { calculateExpiresAt, getTtlLabel, isRoomExpired, isRoomRevoked } from './lib/expiry';
import {
  addDoc,
  appId,
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  type DocumentSnapshot,
  firebaseConfigError,
  getDoc,
  getDocs,
  onAuthStateChanged,
  onSnapshot,
  query,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  setDoc,
  signInAnonymously,
  signInWithCustomToken,
  updateDoc,
  type User,
  where,
} from './lib/firebase';
import { processAndCompressImage } from './lib/image';
import {
  joinRoomAuthoritative,
  leaveRoomAuthoritative,
  listenToRoomMembers,
  transferOwnershipAuthoritative,
} from './lib/roomManager';
import { generateSecureRoomSlug, sanitizeSlug, validateSlug } from './lib/utils';
import type {
  ActivePeer,
  AppView,
  DecryptedMessage,
  EncryptedMessage,
  ExpiredReason,
  ImageAttachment,
  KeyMetadata,
  MessagePayload,
  PresenceRecord,
  ReactionMap,
  RoomData,
  RoomMember,
  SlugStatus,
} from './types';

// Injected auth token support (for Canvas/Firebase container runtime)
declare const __initial_auth_token: string | undefined;

export default function App() {
  // Firebase Auth & Network State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authInitError, setAuthInitError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Active View & Navigation State
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeSlug, setActiveSlug] = useState('');
  const [activeKeyString, setActiveKeyString] = useState('');
  const [activeCryptoKey, setActiveCryptoKey] = useState<CryptoKey | null>(null);
  const [keyMetadata, setKeyMetadata] = useState<KeyMetadata>({
    fingerprint: '',
    commitment: '',
  });

  // Detect invite URL on initial load to skip landing page flash
  const [isJoiningFromUrl, setIsJoiningFromUrl] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const roomParam = params.get('room') || '';
      const hash = window.location.hash || '';
      const keyMatch = hash.match(/key=([A-Za-z0-9_-]+)/);
      return !!(roomParam && keyMatch);
    } catch {
      return false;
    }
  });

  // Participant Profile State
  const [displayName, setDisplayName] = useState('Operator');

  // Create Room State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [slugInput, setSlugInput] = useState('');
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({
    checking: false,
    available: true,
    reason: '',
  });
  const [selectedTtl, setSelectedTtl] = useState(DEFAULT_EXPIRATION_ID);
  const [customExpiresAt, setCustomExpiresAt] = useState<number | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdRoomResult, setCreatedRoomResult] = useState<{
    slug: string;
    shareUrl: string;
    expiresAt: number;
  } | null>(null);

  // Join Room State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLinkInput, setJoinLinkInput] = useState('');
  const [joinSlugManual, setJoinSlugManual] = useState('');
  const [joinKeyManual, setJoinKeyManual] = useState('');
  const [joinError, setJoinError] = useState('');

  // Active Conversation State
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [expiredReason, setExpiredReason] = useState<ExpiredReason | null>(null);
  const [encryptedMessages, setEncryptedMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([]);
  const [presenceList, setPresenceList] = useState<PresenceRecord[]>([]);

  // Messaging & Composer State
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<DecryptedMessage | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<ImageAttachment | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lastSendTimestamp, setLastSendTimestamp] = useState(0);

  // Modals & UI Controls
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityModalTab, setSecurityModalTab] = useState<InfoModalTab>('privacy');
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<ImageAttachment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleOpenSecurityModal = useCallback((tab: InfoModalTab = 'privacy') => {
    setSecurityModalTab(tab);
    setShowSecurityModal(true);
  }, []);

  // Ticker for live TTL countdowns
  const [nowTick, setNowTick] = useState(() => Date.now());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingWriteRef = useRef(0);

  // --------------------------------------------------------------------------
  // EFFECT 1: Firebase Auth & Online/Offline Status
  // --------------------------------------------------------------------------
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err: unknown) {
        console.error('Authentication initialization error:', err);
        const fbErr = err as { code?: string; message?: string };
        if (fbErr?.code === 'auth/configuration-not-found') {
          setAuthInitError(
            'Firebase Anonymous Authentication is not enabled. In Firebase Console, go to Build > Authentication > Sign-in method and enable Anonymous.'
          );
        } else {
          setAuthInitError(fbErr?.message || 'Authentication initialization error.');
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        const shortTag = currentUser.uid.slice(0, 4).toUpperCase();
        setDisplayName((prev) => (prev === 'Operator' ? `User-${shortTag}` : prev));
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --------------------------------------------------------------------------
  // EFFECT 2: Live 1-Second Timer
  // --------------------------------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // --------------------------------------------------------------------------
  // URL INVITATION BUILDER
  // --------------------------------------------------------------------------
  const buildInvitationUrl = useCallback((slug: string, keyString: string) => {
    const origin =
      typeof window !== 'undefined' && window.location.origin !== 'null'
        ? window.location.origin + window.location.pathname
        : 'https://prvtchat.link/';
    return `${origin}?room=${encodeURIComponent(slug)}#key=${encodeURIComponent(keyString)}`;
  }, []);

  const fullInvitationUri = useMemo(() => {
    return buildInvitationUrl(activeSlug, activeKeyString);
  }, [activeSlug, activeKeyString, buildInvitationUrl]);

  // --------------------------------------------------------------------------
  // CORE ACTION: PURGE & DESTROY
  // --------------------------------------------------------------------------
  const purgeAndExpireRoom = useCallback(
    async (slugToPurge: string, targetStatus: 'revoked' | 'expired' = 'revoked') => {
      if (!slugToPurge) return;
      let accessRevoked = false;

      try {
        // 1. Immediately revoke room access so no new messages can attach
        const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', slugToPurge);
        await updateDoc(roomRef, {
          status: targetStatus,
          revokedAt: Date.now(),
          revokedBy: user ? user.uid : 'system',
        });
        accessRevoked = true;

        // 2. Permanently delete all stored message records for this room
        const messagesCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
        const messagesQuery = query(messagesCol, where('roomSlug', '==', slugToPurge));
        const msgSnap = await getDocs(messagesQuery);
        const deletePromises: Promise<void>[] = [];
        msgSnap.forEach((docSnap: QueryDocumentSnapshot) => {
          deletePromises.push(deleteDoc(docSnap.ref));
        });

        // 3. Delete presence heartbeat records
        const presenceCol = collection(db, 'artifacts', appId, 'public', 'data', 'presence');
        const presenceQuery = query(presenceCol, where('roomSlug', '==', slugToPurge));
        const presSnap = await getDocs(presenceQuery);
        presSnap.forEach((docSnap: QueryDocumentSnapshot) => {
          deletePromises.push(deleteDoc(docSnap.ref));
        });

        // 4. Delete room members subcollection records
        const membersCol = collection(db, 'artifacts', appId, 'public', 'data', 'rooms', slugToPurge, 'members');
        const memSnap = await getDocs(membersCol);
        memSnap.forEach((docSnap: QueryDocumentSnapshot) => {
          deletePromises.push(deleteDoc(docSnap.ref));
        });

        await Promise.all(deletePromises);
      } catch (err) {
        console.error('Purge error:', err);
      } finally {
        // Clear active conversation keys from memory immediately
        setActiveCryptoKey(null);
        setActiveKeyString('');
        setDecryptedMessages([]);
        setEncryptedMessages([]);
        setRoomMembers([]);
        setShowRevokeConfirm(false);
        setShowMembersModal(false);
        setExpiredReason(accessRevoked ? targetStatus : 'not_found');
        setCurrentView('expired');

        // Remove secret from URL hash fragment
        try {
          window.history.replaceState(null, '', window.location.pathname);
        } catch {
          // Ignore
        }
      }
    },
    [user]
  );

  // --------------------------------------------------------------------------
  // ENTER ROOM WITH CREDENTIALS
  // --------------------------------------------------------------------------
  const enterRoomWithCredentials = useCallback(
    async (rawSlug: string, rawKeyString: string) => {
      setJoinError('');
      setCreateError('');
      if (!user) {
        setJoinError(authInitError || 'Authentication initializing, please wait a moment...');
        return;
      }
      const cleanSlug = sanitizeSlug(rawSlug);
      if (!cleanSlug) {
        setJoinError('Invalid conversation slug.');
        return;
      }

      let importedKey: CryptoKey;
      let meta: KeyMetadata;
      try {
        const cleanKey = rawKeyString.trim();
        meta = await computeKeyMetadata(cleanKey);
        importedKey = await importRoomKey(cleanKey, true);
      } catch (err: unknown) {
        console.error('Failed to import room key:', err);
        setJoinError('Invalid 256-bit encryption key in link fragment.');
        return;
      }

      try {
        const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', cleanSlug);
        const snap = await getDoc(roomRef);

        if (!snap.exists()) {
          setActiveSlug(cleanSlug);
          setExpiredReason('not_found');
          setShowJoinModal(false);
          setCurrentView('expired');
          return;
        }

        const data = snap.data() as RoomData;
        if (data.status === 'revoked') {
          setRoomData(data);
          setActiveSlug(cleanSlug);
          setExpiredReason('revoked');
          setShowJoinModal(false);
          setCurrentView('expired');
          return;
        }
        if (data.expiresAt && Date.now() >= data.expiresAt) {
          setShowJoinModal(false);
          await purgeAndExpireRoom(cleanSlug, 'expired');
          return;
        }
        if (data.keyCommitment && data.keyCommitment !== meta.commitment) {
          setRoomData(data);
          setActiveSlug(cleanSlug);
          setExpiredReason('invalid_key');
          setShowJoinModal(false);
          setCurrentView('expired');
          return;
        }

        // Authoritatively join room and enforce 12-member capacity limit
        if (user) {
          const joinRes = await joinRoomAuthoritative(cleanSlug, user, displayName);
          if (!joinRes.success) {
            if (joinRes.error && (joinRes.error.includes('12') || joinRes.error.toLowerCase().includes('capacity'))) {
              setJoinError('This room has reached its maximum capacity of 12 active participants.');
            } else {
              setJoinError(joinRes.error || 'Failed to join conversation room.');
            }
            return;
          }
        }

        setActiveSlug(cleanSlug);
        setActiveKeyString(rawKeyString.trim());
        setActiveCryptoKey(importedKey);
        setKeyMetadata(meta);
        setRoomData(data);
        setShowJoinModal(false);
        setCurrentView('chat');

        try {
          window.history.replaceState(
            null,
            '',
            `?room=${encodeURIComponent(cleanSlug)}#key=${encodeURIComponent(rawKeyString.trim())}`
          );
        } catch {
          // Ignore
        }
      } catch (err: unknown) {
        console.error('Enter room error:', err);
        const errMsg = err instanceof Error ? err.message : String(err);
        setJoinError(`Could not connect to room: ${errMsg}`);
      }
    },
    [purgeAndExpireRoom, user, displayName, authInitError]
  );

  // --------------------------------------------------------------------------
  // EFFECT 3: URL Parse on Initial Load
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!authReady) return;

    if (!user) {
      // Auth resolved but no user — cannot join, fall back to landing
      setIsJoiningFromUrl(false);
      return;
    }

    const checkUrlForInvitation = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room') || '';
        const hash = window.location.hash || '';
        const keyMatch = hash.match(/key=([A-Za-z0-9_-]+)/) || window.location.search.match(/key=([A-Za-z0-9_-]+)/);
        const keyParam = keyMatch ? keyMatch[1] : '';

        if (roomParam && keyParam) {
          await enterRoomWithCredentials(roomParam, keyParam);
        }
      } catch {
        // Ignore parse error
      } finally {
        setIsJoiningFromUrl(false);
      }
    };
    checkUrlForInvitation();
  }, [authReady, user, enterRoomWithCredentials]);

  // --------------------------------------------------------------------------
  // EFFECT 4: Slug Availability Checker (When Creating)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user || !showCreateModal || !slugInput.trim()) {
      setSlugStatus((prev) => (prev.reason || prev.checking ? { checking: false, available: true, reason: '' } : prev));
      return;
    }

    const cleaned = sanitizeSlug(slugInput);
    const validation = validateSlug(cleaned);
    if (!validation.valid) {
      setSlugStatus({ checking: false, available: false, reason: validation.reason });
      return;
    }

    let cancelled = false;
    setSlugStatus({ checking: true, available: false, reason: 'Checking availability...' });

    const timer = setTimeout(async () => {
      try {
        const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', cleaned);
        const snap = await getDoc(roomRef);
        if (cancelled) return;

        if (!snap.exists()) {
          setSlugStatus({ checking: false, available: true, reason: `/${cleaned} is available` });
        } else {
          const data = snap.data() as RoomData;
          if (isRoomExpired(data) || isRoomRevoked(data)) {
            setSlugStatus({
              checking: false,
              available: true,
              reason: `/${cleaned} can be claimed`,
            });
          } else {
            setSlugStatus({
              checking: false,
              available: false,
              reason: `/${cleaned} is currently active`,
            });
          }
        }
      } catch {
        if (!cancelled) {
          setSlugStatus({ checking: false, available: false, reason: 'Could not verify slug' });
        }
      }
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slugInput, user, showCreateModal]);

  // --------------------------------------------------------------------------
  // EFFECT 5: Real-Time Listeners for Active Room
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user || currentView !== 'chat' || !activeSlug || !activeCryptoKey) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeSlug);
    const messagesCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const presenceCol = collection(db, 'artifacts', appId, 'public', 'data', 'presence');

    // 1. Listen for room status and revocation
    const unsubRoom = onSnapshot(
      roomRef,
      (snap: DocumentSnapshot) => {
        if (!snap.exists()) {
          setExpiredReason('not_found');
          setCurrentView('expired');
          return;
        }
        const data = snap.data() as RoomData;
        if (
          data.keyCommitment &&
          keyMetadata.commitment &&
          data.keyCommitment !== keyMetadata.commitment
        ) {
          setExpiredReason('invalid_key');
          setCurrentView('expired');
          return;
        }
        if (data.status === 'revoked') {
          setRoomData(data);
          setExpiredReason('revoked');
          setCurrentView('expired');
          return;
        }
        if (data.expiresAt && Date.now() >= data.expiresAt) {
          setRoomData(data);
          setExpiredReason('expired');
          setCurrentView('expired');
          return;
        }
        setRoomData(data);
      },
      (err: Error) => {
        console.error('Room listener error:', err);
      }
    );

    // 2. Listen for encrypted messages strictly for this room
    const messagesQuery = query(
      messagesCol,
      where('roomSlug', '==', activeSlug)
    );
    const unsubMessages = onSnapshot(
      messagesQuery,
      (snapshot: QuerySnapshot) => {
        const roomMsgs: EncryptedMessage[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
          const data = docSnap.data() as Omit<EncryptedMessage, 'id'>;
          roomMsgs.push({ id: docSnap.id, ...data });
        });
        roomMsgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setEncryptedMessages(roomMsgs);
      },
      (err: Error) => {
        console.error('Messages listener error:', err);
      }
    );

    // 3. Listen for presence records strictly for this room
    const presenceQuery = query(
      presenceCol,
      where('roomSlug', '==', activeSlug)
    );
    const unsubPresence = onSnapshot(
      presenceQuery,
      (snapshot: QuerySnapshot) => {
        const list: PresenceRecord[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
          const data = docSnap.data() as Omit<PresenceRecord, 'id'>;
          list.push({ id: docSnap.id, ...data });
        });
        setPresenceList(list);
      },
      (err: Error) => {
        console.error('Presence listener error:', err);
      }
    );

    return () => {
      unsubRoom();
      unsubMessages();
      unsubPresence();
    };
  }, [user, currentView, activeSlug, activeCryptoKey, keyMetadata.commitment]);

  // --------------------------------------------------------------------------
  // EFFECT 6: Client-Side Message Decryption Pipeline
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCryptoKey || currentView !== 'chat') {
      setDecryptedMessages((prev) => (prev.length > 0 ? [] : prev));
      return;
    }

    let cancelled = false;
    const decryptAll = async () => {
      const results = await Promise.all(
        encryptedMessages.map(async (msg): Promise<DecryptedMessage> => {
          if (msg.deleted) {
            return {
              id: msg.id,
              senderUid: msg.senderUid,
              createdAt: msg.createdAt,
              deleted: true,
              decrypted: null,
              reactions: {},
            };
          }
          try {
            const payload = await decryptPayload<MessagePayload>(
              activeCryptoKey,
              msg.iv,
              msg.ciphertext
            );
            let decryptedReactions: ReactionMap = {};
            if (msg.reactionsIv && msg.reactionsCiphertext) {
              try {
                decryptedReactions = await decryptPayload<ReactionMap>(
                  activeCryptoKey,
                  msg.reactionsIv,
                  msg.reactionsCiphertext
                );
              } catch {
                decryptedReactions = {};
              }
            }
            return {
              id: msg.id,
              senderUid: msg.senderUid,
              createdAt: msg.createdAt,
              iv: msg.iv,
              ciphertext: msg.ciphertext,
              deleted: false,
              decrypted: payload,
              reactions: decryptedReactions,
            };
          } catch {
            return {
              id: msg.id,
              senderUid: msg.senderUid,
              createdAt: msg.createdAt,
              iv: msg.iv,
              ciphertext: msg.ciphertext,
              deleted: false,
              decryptionFailed: true,
              decrypted: null,
              reactions: {},
            };
          }
        })
      );

      if (!cancelled) {
        setDecryptedMessages(results);
      }
    };

    decryptAll();
    return () => {
      cancelled = true;
    };
  }, [encryptedMessages, activeCryptoKey, currentView]);

  // --------------------------------------------------------------------------
  // EFFECT 7: Decrypt Active Peers & Typing Indicators
  // --------------------------------------------------------------------------
  const [activePeers, setActivePeers] = useState<ActivePeer[]>([]);
  useEffect(() => {
    if (!activeCryptoKey || currentView !== 'chat') {
      setActivePeers((prev) => (prev.length > 0 ? [] : prev));
      return;
    }
    let cancelled = false;
    const decryptPeers = async () => {
      const cutoff = Date.now() - 35000;
      const validRecords = presenceList.filter((p) => p.lastSeen && p.lastSeen > cutoff);
      const out: ActivePeer[] = [];
      for (const rec of validRecords) {
        try {
          const info = await decryptPayload<{ displayName?: string }>(
            activeCryptoKey,
            rec.iv,
            rec.ciphertext
          );
          out.push({
            uid: rec.uid,
            displayName: info.displayName || 'Anonymous',
            isTyping: Boolean(rec.isTyping && Date.now() - rec.lastSeen < 6000),
            lastSeen: rec.lastSeen,
          });
        } catch {
          // Ignore
        }
      }
      if (!cancelled) {
        setActivePeers(out);
      }
    };
    decryptPeers();
    return () => {
      cancelled = true;
    };
  }, [presenceList, activeCryptoKey, currentView, nowTick]);

  // --------------------------------------------------------------------------
  // EFFECT 8: Presence Heartbeat
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user || currentView !== 'chat' || !activeSlug || !activeCryptoKey) return;

    const presenceDocId = `${activeSlug}_${user.uid}`;
    const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', 'presence', presenceDocId);

    const publishHeartbeat = async (isTypingFlag = false) => {
      try {
        const encryptedProfile = await encryptPayload(activeCryptoKey, { displayName });
        await setDoc(presenceRef, {
          roomSlug: activeSlug,
          uid: user.uid,
          iv: encryptedProfile.iv,
          ciphertext: encryptedProfile.ciphertext,
          isTyping: isTypingFlag,
          lastSeen: Date.now(),
        });
      } catch {
        // Non-fatal
      }
    };

    publishHeartbeat(false);
    const heartbeatTimer = setInterval(() => publishHeartbeat(false), 12000);

    return () => {
      clearInterval(heartbeatTimer);
      deleteDoc(presenceRef).catch(() => {});
    };
  }, [user, currentView, activeSlug, activeCryptoKey, displayName]);

  // Check for auto-expiration in background
  useEffect(() => {
    if (
      currentView === 'chat' &&
      roomData &&
      roomData.expiresAt &&
      nowTick >= roomData.expiresAt
    ) {
      purgeAndExpireRoom(activeSlug, 'expired');
    }
  }, [nowTick, currentView, roomData, activeSlug, purgeAndExpireRoom]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (currentView === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [decryptedMessages.length, currentView]);

  // --------------------------------------------------------------------------
  // CREATE CONVERSATION ACTION
  // --------------------------------------------------------------------------
  const handleCreateConversation = async (e?: React.FormEvent): Promise<boolean> => {
    if (e) e.preventDefault();
    if (!user) {
      setCreateError(authInitError || 'Authentication initializing, please wait a moment...');
      return false;
    }
    setCreateError('');

    let finalSlug = slugInput.trim();
    if (!finalSlug) {
      // Auto-generate high-entropy collision-resistant slug
      finalSlug = generateSecureRoomSlug();
    }

    const cleanedSlug = sanitizeSlug(finalSlug);
    const validation = validateSlug(cleanedSlug);
    if (!validation.valid) {
      setCreateError(validation.reason);
      return false;
    }

    setIsCreatingRoom(true);
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', cleanedSlug);
      const existingSnap = await getDoc(roomRef);

      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as RoomData;
        if (!isRoomExpired(existingData) && !isRoomRevoked(existingData)) {
          setCreateError(`/${cleanedSlug} is already in use. Please choose another.`);
          setIsCreatingRoom(false);
          return false;
        }
        await purgeAndExpireRoom(cleanedSlug, 'expired');
      }

      const { cryptoKey, keyString } = await generateRoomKey();
      const meta = await computeKeyMetadata(cryptoKey);

      const now = Date.now();
      if (selectedTtl === 'custom') {
        if (!customExpiresAt || customExpiresAt <= now) {
          setCreateError('Please pick a future expiration date and time.');
          setIsCreatingRoom(false);
          return false;
        }
      }
      const expiresAt = calculateExpiresAt(now, selectedTtl, customExpiresAt);
      const ttlLabel = getTtlLabel(selectedTtl, expiresAt, now);

      const newRoomDoc: RoomData = {
        slug: cleanedSlug,
        ownerUid: user.uid,
        creatorUid: user.uid,
        createdAt: now,
        expiresAt,
        ttlLabel,
        status: 'active',
        memberCount: 1,
        maxMembers: 12,
        allowPeerRevoke: false,
        keyCommitment: meta.commitment,
        encryptionCipher: 'AES-256-GCM',
      };

      await setDoc(roomRef, newRoomDoc);

      // Initialize authoritative owner membership record in members subcollection
      const ownerMemberRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', cleanedSlug, 'members', user.uid);
      await setDoc(ownerMemberRef, {
        uid: user.uid,
        role: 'owner',
        status: 'active',
        displayName: displayName || 'Creator',
        joinedAt: now,
        updatedAt: now,
      });

      const initialMember: RoomMember = {
        uid: user.uid,
        role: 'owner',
        status: 'active',
        displayName: displayName || 'Creator',
        joinedAt: now,
        updatedAt: now,
      };
      setRoomMembers([initialMember]);

      setActiveSlug(cleanedSlug);
      setActiveKeyString(keyString);
      setActiveCryptoKey(cryptoKey);
      setKeyMetadata(meta);
      setRoomData(newRoomDoc);

      const shareUrl = buildInvitationUrl(cleanedSlug, keyString);
      setCreatedRoomResult({
        slug: cleanedSlug,
        shareUrl,
        expiresAt,
      });

      return true;
    } catch (err: unknown) {
      console.error('Create conversation error:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      if (
        errMsg.toLowerCase().includes('permission') ||
        errMsg.includes('PERMISSION_DENIED') ||
        errMsg.includes('insufficient permissions')
      ) {
        setCreateError(
          'Database permission denied. In your Firebase Console, make sure Anonymous Authentication is enabled (Build > Authentication > Sign-in method).'
        );
      } else {
        setCreateError(`Failed to initialize room: ${errMsg}`);
      }
      return false;
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleEnterCreatedChat = () => {
    if (!createdRoomResult) return;
    setShowCreateModal(false);
    setCurrentView('chat');
    try {
      window.history.replaceState(
        null,
        '',
        `?room=${encodeURIComponent(activeSlug)}#key=${encodeURIComponent(activeKeyString)}`
      );
    } catch {
      // Ignore
    }
  };

  // --------------------------------------------------------------------------
  // JOIN FORM SUBMISSION
  // --------------------------------------------------------------------------
  const handleJoinConversation = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setJoinError('');
    if (!user) {
      setJoinError(authInitError || 'Authentication initializing, please wait a moment...');
      return;
    }

    let targetSlug = joinSlugManual.trim();
    let targetKey = joinKeyManual.trim();

    if (joinLinkInput.trim()) {
      const raw = joinLinkInput.trim();
      const roomMatch = raw.match(/[?&]room=([a-zA-Z0-9-_]+)/);
      const pathMatch = raw.match(/\/([a-zA-Z0-9-_]+)[#&?]key=/);
      const keyMatch = raw.match(/[#&?]key=([A-Za-z0-9_-]+)/);

      if (roomMatch) targetSlug = roomMatch[1];
      else if (pathMatch) targetSlug = pathMatch[1];

      if (keyMatch) targetKey = keyMatch[1];
    }

    if (!targetSlug || !targetKey) {
      setJoinError('Provide a full link with #key=... or both room slug and 256-bit key.');
      return;
    }

    await enterRoomWithCredentials(targetSlug, targetKey);
  };

  // --------------------------------------------------------------------------
  // TYPING NOTIFICATION
  // --------------------------------------------------------------------------
  const notifyTyping = useCallback(async () => {
    if (!user || !activeSlug || !activeCryptoKey || currentView !== 'chat') return;
    const now = Date.now();
    if (now - lastTypingWriteRef.current < 2500) return;
    lastTypingWriteRef.current = now;

    const presenceDocId = `${activeSlug}_${user.uid}`;
    const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', 'presence', presenceDocId);

    try {
      const encryptedProfile = await encryptPayload(activeCryptoKey, { displayName });
      await setDoc(presenceRef, {
        roomSlug: activeSlug,
        uid: user.uid,
        iv: encryptedProfile.iv,
        ciphertext: encryptedProfile.ciphertext,
        isTyping: true,
        lastSeen: now,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(async () => {
        try {
          await updateDoc(presenceRef, { isTyping: false, lastSeen: Date.now() });
        } catch {
          // Ignore
        }
      }, 3500);
    } catch {
      // Ignore
    }
  }, [user, activeSlug, activeCryptoKey, currentView, displayName]);

  // --------------------------------------------------------------------------
  // SEND MESSAGE
  // --------------------------------------------------------------------------
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || !activeCryptoKey || !activeSlug || isSending) return;

    const trimmedText = messageText.trim();
    if (!trimmedText && !pendingAttachment) return;

    const now = Date.now();
    if (now - lastSendTimestamp < 350) return;
    setLastSendTimestamp(now);

    setIsSending(true);
    setUploadError('');

    try {
      const plaintextPayload: MessagePayload = {
        text: trimmedText,
        senderName: displayName.trim() || 'Anonymous',
        sentAt: now,
        replyTo: replyingTo
          ? {
              id: replyingTo.id,
              senderName: replyingTo.decrypted?.senderName || 'Participant',
              snippet: (replyingTo.decrypted?.text || '[Image]').slice(0, 90),
            }
          : null,
        attachment: pendingAttachment
          ? {
              dataUrl: pendingAttachment.dataUrl,
              width: pendingAttachment.width,
              height: pendingAttachment.height,
              originalName: pendingAttachment.originalName,
              approxBytes: pendingAttachment.approxBytes,
            }
          : null,
      };

      const encrypted = await encryptPayload(activeCryptoKey, plaintextPayload);

      const messagesCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
      await addDoc(messagesCol, {
        roomSlug: activeSlug,
        senderUid: user.uid,
        createdAt: now,
        type: pendingAttachment ? 'image' : 'text',
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
        alg: 'AES-256-GCM',
        deleted: false,
      });

      setMessageText('');
      setReplyingTo(null);
      setPendingAttachment(null);
      setShowEmojiPicker(false);
    } catch (err) {
      console.error('Failed to encrypt & send message:', err);
      setUploadError('Failed to encrypt and send. Check your connection.');
    } finally {
      setIsSending(false);
    }
  };

  // --------------------------------------------------------------------------
  // IMAGE ATTACHMENT HANDLER
  // --------------------------------------------------------------------------
  const handleImageFile = async (file: File) => {
    if (!file) return;
    setUploadError('');
    try {
      const processed = await processAndCompressImage(file);
      setPendingAttachment(processed);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not process image attachment.';
      setUploadError(msg);
    }
  };

  // --------------------------------------------------------------------------
  // MESSAGE REACTION
  // --------------------------------------------------------------------------
  const handleToggleReaction = async (msg: DecryptedMessage, emoji: string) => {
    if (!user || !activeCryptoKey || msg.deleted) return;
    try {
      const currentReactions: ReactionMap = { ...(msg.reactions || {}) };
      const usersForEmoji = Array.isArray(currentReactions[emoji])
        ? [...currentReactions[emoji]]
        : [];

      const existingIdx = usersForEmoji.findIndex((u) => u.uid === user.uid);
      if (existingIdx >= 0) {
        usersForEmoji.splice(existingIdx, 1);
      } else {
        usersForEmoji.push({ uid: user.uid, name: displayName });
      }

      if (usersForEmoji.length === 0) {
        delete currentReactions[emoji];
      } else {
        currentReactions[emoji] = usersForEmoji;
      }

      const encryptedReactions = await encryptPayload(activeCryptoKey, currentReactions);
      const msgRef = doc(db, 'artifacts', appId, 'public', 'data', 'messages', msg.id);
      await updateDoc(msgRef, {
        reactionsIv: encryptedReactions.iv,
        reactionsCiphertext: encryptedReactions.ciphertext,
      });
    } catch (err) {
      console.error('Failed to update encrypted reaction:', err);
    }
  };

  // --------------------------------------------------------------------------
  // DELETE OWN MESSAGE
  // --------------------------------------------------------------------------
  const handleDeleteOwnMessage = async (msg: DecryptedMessage) => {
    if (!user || msg.senderUid !== user.uid) return;
    try {
      const msgRef = doc(db, 'artifacts', appId, 'public', 'data', 'messages', msg.id);
      await updateDoc(msgRef, {
        iv: '',
        ciphertext: '',
        reactionsIv: '',
        reactionsCiphertext: '',
        deleted: true,
        deletedAt: Date.now(),
      });
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // --------------------------------------------------------------------------
  // CLIPBOARD COPY HELPER
  // --------------------------------------------------------------------------
  const copyToClipboard = async (text: string, idLabel: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(idLabel);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedId(idLabel);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // --------------------------------------------------------------------------
  // NATIVE SHARE
  // --------------------------------------------------------------------------
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `PRVTCHAT: /${activeSlug}`,
          text: 'Join my private end-to-end encrypted chat. Decryption key is in the link fragment.',
          url: fullInvitationUri,
        });
      } catch {
        // User cancelled
      }
    } else {
      copyToClipboard(fullInvitationUri, 'share-uri');
    }
  };

  const typingPeers = useMemo(() => {
    if (!user) return [];
    return activePeers.filter((p) => p.uid !== user.uid && p.isTyping);
  }, [activePeers, user]);

  // --------------------------------------------------------------------------
  // EFFECT: Real-Time Room Members Listener
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user || currentView !== 'chat' || !activeSlug) {
      setRoomMembers([]);
      return;
    }
    const unsub = listenToRoomMembers(activeSlug, (members) => {
      setRoomMembers(members);
    });
    return () => unsub();
  }, [user, currentView, activeSlug]);

  const handleLeaveRoom = useCallback(async () => {
    if (activeSlug && user) {
      await leaveRoomAuthoritative(activeSlug, user);
      const presenceDocId = `${activeSlug}_${user.uid}`;
      const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', 'presence', presenceDocId);
      deleteDoc(presenceRef).catch(() => {});
    }
    setCurrentView('landing');
    setActiveSlug('');
    setActiveKeyString('');
    setActiveCryptoKey(null);
    setRoomData(null);
    setRoomMembers([]);
    setShowMembersModal(false);
    setDecryptedMessages([]);
    setEncryptedMessages([]);
    setExpiredReason(null);
    setCreatedRoomResult(null);
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      // Ignore
    }
    return { success: true };
  }, [activeSlug, user]);

  const handleTransferOwnership = useCallback(async (newOwnerUid: string) => {
    if (!user || !activeSlug) return { success: false, error: 'No active session' };
    const res = await transferOwnershipAuthoritative(activeSlug, user, newOwnerUid);
    if (res.success) {
      setRoomData((prev) => (prev ? { ...prev, ownerUid: newOwnerUid } : prev));
    }
    return res;
  }, [user, activeSlug]);

  const leaveConversationView = handleLeaveRoom;

  const handleOpenCreateModal = () => {
    setCreatedRoomResult(null);
    setCreateError('');
    setShowCreateModal(true);
  };

  if (firebaseConfigError) {
    return (
      <div className="min-h-screen bg-[#5B9EEA] text-[#0B132B] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white border border-black/10 rounded-3xl p-8 space-y-6 shadow-2xl text-left">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
            <span className="font-bold text-xl">!</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#0B132B] tracking-tight">Firebase Configuration Required</h2>
            <p className="text-xs text-zinc-600 leading-relaxed">
              PRVTCHAT is running in production mode, but live Firebase environment variables are not configured. To enable zero-knowledge multi-device encrypted chat, configure the following variables in your environment:
            </p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 font-mono text-[11px] text-zinc-800 space-y-1 overflow-x-auto">
            <div>VITE_FIREBASE_API_KEY=your_api_key</div>
            <div>VITE_FIREBASE_PROJECT_ID=your_project_id</div>
            <div>VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com</div>
            <div>VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com</div>
          </div>
          <p className="text-[11px] text-zinc-500">
            For local offline testing, set <code className="font-mono text-zinc-800">VITE_USE_MOCK_RELAY=true</code> in your <code className="font-mono text-zinc-800">.env</code> file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen font-sans antialiased flex flex-col ${
        currentView === 'landing'
          ? 'bg-[#5B9EEA] text-[#0B132B]'
          : 'bg-[#F4F7FB] text-zinc-900'
      }`}
    >
      {/* Top Navigation Bar */}
      <Navbar
        currentView={currentView}
        activeSlug={activeSlug}
        roomData={roomData}
        isOnline={isOnline}
        nowTick={nowTick}
        onLeaveConversation={leaveConversationView}
        onOpenCreateModal={handleOpenCreateModal}
        onOpenJoinModal={() => setShowJoinModal(true)}
        onOpenShareModal={() => setShowShareModal(true)}
        onOpenRevokeConfirm={() => setShowRevokeConfirm(true)}
        onOpenSecurityModal={handleOpenSecurityModal}
      />

      {/* Main Views */}
      {/* Instant connecting screen when opening an invite link */}
      {currentView === 'landing' && isJoiningFromUrl && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-5">
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
            <svg className="w-10 h-10 text-white animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25z" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <p className="text-white text-lg font-semibold tracking-tight">Unlocking Private Chat</p>
            <p className="text-white/60 text-xs">Establishing encrypted connection…</p>
          </div>
          <div className="w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-2/3 bg-white/50 rounded-full animate-pulse" />
          </div>
        </div>
      )}

      {currentView === 'landing' && !isJoiningFromUrl && (
        <>
          <LandingView
            onOpenCreateModal={handleOpenCreateModal}
            onOpenJoinModal={() => setShowJoinModal(true)}
            onOpenSecurityModal={() => handleOpenSecurityModal('how-it-works')}
          />

          {/* Footer: Pharmaceutical Disclaimer */}
          <footer className="w-full px-6 pb-8 pt-2 flex flex-col items-center">
            <div className="max-w-xl text-center px-4">
              <p className="text-[8px] sm:text-[9px] leading-relaxed text-white/35 tracking-wide" style={{ fontStyle: 'italic' }}>
                ⚠️ CAUTION: PRVTCHAT® may cause excessive feelings of privacy, sudden distrust of unencrypted messaging apps, and compulsive link-sharing behavior. Side effects include: whispering while typing, paranoia about plaintext, and an overwhelming urge to say &quot;it&apos;s encrypted&quot; in every conversation. If your conversation persists beyond 7 days, please create a new room. Not responsible for secrets you accidentally reveal by hitting send too early. We don&apos;t store, read, or judge your messages — we literally can&apos;t. Use responsibly. Keep out of reach of hackers. Individual encryption results may vary. No animals were harmed in the making of this chat. If you experience a sudden loss of plaintext, do not panic — this is working as intended.
              </p>
            </div>
          </footer>
        </>
      )}

      {currentView === 'chat' && (
        <ChatView
          activeSlug={activeSlug}
          keyMetadata={keyMetadata}
          activePeers={activePeers}
          typingPeers={typingPeers}
          roomMembers={roomMembers}
          onOpenMembersModal={() => setShowMembersModal(true)}
          onLeaveRoom={handleLeaveRoom}
          isDraggingOver={isDraggingOver}
          setIsDraggingOver={setIsDraggingOver}
          handleImageFile={handleImageFile}
          decryptedMessages={decryptedMessages}
          user={user}
          fullInvitationUri={fullInvitationUri}
          roomData={roomData}
          copyToClipboard={copyToClipboard}
          copiedId={copiedId}
          onOpenShareModal={() => setShowShareModal(true)}
          onOpenRevokeConfirm={() => setShowRevokeConfirm(true)}
          setLightboxImage={setLightboxImage}
          handleToggleReaction={handleToggleReaction}
          setReplyingTo={setReplyingTo}
          handleDeleteOwnMessage={handleDeleteOwnMessage}
          replyingTo={replyingTo}
          pendingAttachment={pendingAttachment}
          setPendingAttachment={setPendingAttachment}
          uploadError={uploadError}
          setUploadError={setUploadError}
          showEmojiPicker={showEmojiPicker}
          setShowEmojiPicker={setShowEmojiPicker}
          messageText={messageText}
          setMessageText={setMessageText}
          notifyTyping={notifyTyping}
          handleSendMessage={handleSendMessage}
          isSending={isSending}
          nowTick={nowTick}
          messagesEndRef={messagesEndRef}
          fileInputRef={fileInputRef}
        />
      )}

      {currentView === 'expired' && (
        <ExpiredView
          expiredReason={expiredReason}
          activeSlug={activeSlug}
          onReturnHome={leaveConversationView}
          onStartNewChat={handleOpenCreateModal}
        />
      )}

      {/* Modals */}
      <CreateChatModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        slugInput={slugInput}
        setSlugInput={setSlugInput}
        slugStatus={slugStatus}
        selectedTtl={selectedTtl}
        setSelectedTtl={setSelectedTtl}
        customExpiresAt={customExpiresAt}
        setCustomExpiresAt={setCustomExpiresAt}
        isCreatingRoom={isCreatingRoom}
        createError={createError}
        onCreateRoom={handleCreateConversation}
        createdRoomResult={createdRoomResult}
        onEnterCreatedChat={handleEnterCreatedChat}
      />

      <JoinModal
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        onSubmit={handleJoinConversation}
        joinLinkInput={joinLinkInput}
        setJoinLinkInput={setJoinLinkInput}
        joinSlugManual={joinSlugManual}
        setJoinSlugManual={setJoinSlugManual}
        joinKeyManual={joinKeyManual}
        setJoinKeyManual={setJoinKeyManual}
        joinError={joinError}
      />

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        fullInvitationUri={fullInvitationUri}
        activeSlug={activeSlug}
        fingerprint={keyMetadata.fingerprint}
        copiedId={copiedId}
        onCopy={copyToClipboard}
        onNativeShare={handleNativeShare}
      />

      <RevokeModal
        isOpen={showRevokeConfirm}
        onClose={() => setShowRevokeConfirm(false)}
        onConfirm={() => purgeAndExpireRoom(activeSlug, 'revoked')}
        activeSlug={activeSlug}
      />

      <MemberManagementModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        activeSlug={activeSlug}
        members={roomMembers}
        currentUid={user ? user.uid : null}
        ownerUid={roomData ? (roomData.ownerUid || roomData.creatorUid) : ''}
        onTransferOwnership={handleTransferOwnership}
        onLeaveRoom={handleLeaveRoom}
      />

      <SecurityModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        initialTab={securityModalTab}
      />

      <LightboxModal
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />
    </div>
  );
}
