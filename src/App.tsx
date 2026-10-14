import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatView } from './components/ChatView';
import { ExpiredView } from './components/ExpiredView';
import { LandingView } from './components/LandingView';
import { JoinModal } from './components/modals/JoinModal';
import { LightboxModal } from './components/modals/LightboxModal';
import { RevokeModal } from './components/modals/RevokeModal';
import { SecurityModal } from './components/modals/SecurityModal';
import { ShareModal } from './components/modals/ShareModal';
import { Navbar } from './components/Navbar';
import { EXPIRATION_OPTIONS } from './lib/constants';
import {
  base64UrlToBuffer,
  bufferToBase64Url,
  computeKeyMetadata,
  decryptPayload,
  encryptPayload,
  generateRoomKey,
  importRoomKey,
} from './lib/crypto';
import {
  addDoc,
  appId,
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  type DocumentSnapshot,
  getDoc,
  getDocs,
  onAuthStateChanged,
  onSnapshot,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  setDoc,
  signInAnonymously,
  signInWithCustomToken,
  updateDoc,
  type User,
} from './lib/firebase';
import { processAndCompressImage } from './lib/image';
import { formatTimestamp, sanitizeSlug, validateSlug } from './lib/utils';
import type {
  ActivePeer,
  AppView,
  BurnState,
  DecryptedMessage,
  EncryptedMessage,
  ExpiredReason,
  HeroDemoKey,
  HeroDemoMessage,
  ImageAttachment,
  KeyMetadata,
  MessagePayload,
  PresenceRecord,
  PreviewTab,
  ReactionMap,
  RoomData,
  SlugStatus,
  TestResult,
  WorkbenchPacket,
} from './types';

// Declared global for potential container injection
declare const __initial_auth_token: string | undefined;

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(true);

  // Firebase Auth & Network State
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Navigation & Active Room State
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [activeSlug, setActiveSlug] = useState('');
  const [activeKeyString, setActiveKeyString] = useState('');
  const [activeCryptoKey, setActiveCryptoKey] = useState<CryptoKey | null>(null);
  const [keyMetadata, setKeyMetadata] = useState<KeyMetadata>({ fingerprint: '', commitment: '' });

  // Participant Profile State
  const [displayName, setDisplayName] = useState('Cipher-01');
  const [editingName, setEditingName] = useState(false);

  // Create Room Form State
  const [slugInput, setSlugInput] = useState(() => {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `afterhours-${randomSuffix}`;
  });
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({ checking: false, available: true, reason: '' });
  const [selectedTtl, setSelectedTtl] = useState('1h');
  const [allowPeerRevoke, setAllowPeerRevoke] = useState(true);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join Room Modal & Form State
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinLinkInput, setJoinLinkInput] = useState('');
  const [joinSlugManual, setJoinSlugManual] = useState('');
  const [joinKeyManual, setJoinKeyManual] = useState('');
  const [joinError, setJoinError] = useState('');

  // Active Conversation Room Data
  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [expiredReason, setExpiredReason] = useState<ExpiredReason | null>(null);
  const [encryptedMessages, setEncryptedMessages] = useState<EncryptedMessage[]>([]);
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([]);
  const [presenceList, setPresenceList] = useState<PresenceRecord[]>([]);

  // Composer & Messaging State
  const [messageText, setMessageText] = useState('');
  const [replyingTo, setReplyingTo] = useState<DecryptedMessage | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<ImageAttachment | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [lastSendTimestamp, setLastSendTimestamp] = useState(0);
  const [simulatingPeer, setSimulatingPeer] = useState(false);

  // UI Modals & Drawers
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<ImageAttachment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rawInspectMsg, setRawInspectMsg] = useState<DecryptedMessage | null>(null);

  // Interactive Homepage Dual-Perspective Live Preview State
  const [heroPreviewTab, setHeroPreviewTab] = useState<PreviewTab>('split');
  const [heroDemoKeyObj, setHeroDemoKeyObj] = useState<HeroDemoKey | null>(null);
  const [heroDemoInput, setHeroDemoInput] = useState('');
  const [heroDemoMessages, setHeroDemoMessages] = useState<HeroDemoMessage[]>([]);
  const [activeArchStep, setActiveArchStep] = useState(0);

  // Interactive Bento Sandbox State
  const [workbenchPlaintext, setWorkbenchPlaintext] = useState('Transfer the zero-knowledge recovery shard at 22:00 UTC.');
  const [workbenchDemoPacket, setWorkbenchDemoPacket] = useState<WorkbenchPacket | null>(null);
  const [bentoBurnState, setBentoBurnState] = useState<BurnState>('active');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  // Countdown ticker
  const [nowTick, setNowTick] = useState(Date.now());

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingWriteRef = useRef(0);

  // --------------------------------------------------------------------------
  // EFFECT 1: One-Time Firebase Authentication & Network Listener
  // --------------------------------------------------------------------------
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Authentication initialization error:', err);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
      if (currentUser) {
        const shortTag = currentUser.uid.slice(0, 4).toUpperCase();
        setDisplayName((prev) => (prev === 'Cipher-01' ? `Operator-${shortTag}` : prev));
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

  // Parse URL query (?room=slug) and hash fragment (#key=...) on load
  useEffect(() => {
    const checkUrlForInvitation = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const roomParam = params.get('room');
        const hash = window.location.hash || '';
        const keyMatch = hash.match(/key=([A-Za-z0-9_-]+)/);
        const keyParam = keyMatch ? keyMatch[1] : '';

        if (roomParam && keyParam) {
          await enterRoomWithCredentials(roomParam, keyParam);
        }
      } catch {
        // Ignore
      }
    };
    if (authReady && user) {
      checkUrlForInvitation();
    }
  }, [authReady, user]);

  // Live 1-second timer for TTL countdowns
  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Real WebCrypto Interactive Hero Preview Messages
  useEffect(() => {
    let cancelled = false;
    const initHeroPreview = async () => {
      try {
        const { cryptoKey, keyString } = await generateRoomKey();
        const meta = await computeKeyMetadata(cryptoKey);
        const seedPlaintexts = [
          {
            sender: 'Elena (SecOps)',
            role: 'peer' as const,
            text: 'Are we clear to share the production signing certificate here?',
            time: '21:41:08',
          },
          {
            sender: 'You (Operator)',
            role: 'me' as const,
            text: 'Yes. The 256-bit AES-GCM key is strictly in the #key URL fragment. Firestore only sees sealed ciphertext.',
            time: '21:41:24',
          },
        ];

        const encryptedSeeds: HeroDemoMessage[] = [];
        for (let i = 0; i < seedPlaintexts.length; i++) {
          const item = seedPlaintexts[i];
          const packet = await encryptPayload(cryptoKey, {
            text: item.text,
            senderName: item.sender,
          });
          encryptedSeeds.push({
            id: `hero-msg-${i}`,
            ...item,
            iv: packet.iv,
            ciphertext: packet.ciphertext,
          });
        }

        if (!cancelled) {
          setHeroDemoKeyObj({
            cryptoKey,
            keyString,
            fingerprint: meta.fingerprint,
          });
          setHeroDemoMessages(encryptedSeeds);
        }
      } catch {
        // Ignore
      }
    };
    initHeroPreview();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle adding a live encrypted message inside the Homepage Hero Interactive Preview
  const handleHeroDemoSend = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!heroDemoInput.trim() || !heroDemoKeyObj) return;
    const text = heroDemoInput.trim();
    setHeroDemoInput('');
    try {
      const packet = await encryptPayload(heroDemoKeyObj.cryptoKey, {
        text,
        senderName: displayName,
      });
      const nowStr = formatTimestamp(Date.now());
      setHeroDemoMessages((prev) => [
        ...prev.slice(-3),
        {
          id: `hero-msg-${Date.now()}`,
          sender: `${displayName} (You)`,
          role: 'me',
          text,
          time: nowStr,
          iv: packet.iv,
          ciphertext: packet.ciphertext,
        },
      ]);
    } catch {
      // Ignore
    }
  };

  // Live workbench encryption preview in the Bento Grid
  useEffect(() => {
    let cancelled = false;
    const runDemoEncryption = async () => {
      try {
        const { cryptoKey, keyString } = await generateRoomKey();
        const meta = await computeKeyMetadata(cryptoKey);
        const packet = await encryptPayload(cryptoKey, {
          text: workbenchPlaintext || 'Empty payload',
          senderName: displayName,
          sentAt: Date.now(),
        });
        if (!cancelled) {
          setWorkbenchDemoPacket({
            keyFragment: `#key=${keyString.slice(0, 20)}...`,
            fullKey: keyString,
            fingerprint: meta.fingerprint,
            iv: packet.iv,
            ciphertext: packet.ciphertext,
          });
        }
      } catch {
        // Ignore
      }
    };
    runDemoEncryption();
    return () => {
      cancelled = true;
    };
  }, [workbenchPlaintext, displayName]);

  // --------------------------------------------------------------------------
  // EFFECT 2: Real-Time Slug Availability Check on Landing Page
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user || currentView !== 'landing') return;

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
          const isExpired = data.expiresAt && Date.now() > data.expiresAt;
          const isRevoked = data.status === 'revoked' || data.status === 'expired';
          if (isExpired || isRevoked) {
            setSlugStatus({
              checking: false,
              available: true,
              reason: `/${cleaned} can be reclaimed`,
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
          setSlugStatus({ checking: false, available: false, reason: 'Unable to verify slug.' });
        }
      }
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slugInput, user, currentView]);

  // --------------------------------------------------------------------------
  // EFFECT 3: Active Room Real-Time Listeners (Room, Messages, Presence)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user || currentView !== 'chat' || !activeSlug || !activeCryptoKey) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', activeSlug);
    const messagesCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
    const presenceCol = collection(db, 'artifacts', appId, 'public', 'data', 'presence');

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

    const unsubMessages = onSnapshot(
      messagesCol,
      (snapshot: QuerySnapshot) => {
        const roomMsgs: EncryptedMessage[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
          const data = docSnap.data() as Omit<EncryptedMessage, 'id'>;
          if (data.roomSlug === activeSlug) {
            roomMsgs.push({ id: docSnap.id, ...data });
          }
        });
        roomMsgs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
        setEncryptedMessages(roomMsgs);
      },
      (err: Error) => {
        console.error('Messages listener error:', err);
      }
    );

    const unsubPresence = onSnapshot(
      presenceCol,
      (snapshot: QuerySnapshot) => {
        const list: PresenceRecord[] = [];
        snapshot.forEach((docSnap: QueryDocumentSnapshot) => {
          const data = docSnap.data() as Omit<PresenceRecord, 'id'>;
          if (data.roomSlug === activeSlug) {
            list.push({ id: docSnap.id, ...data });
          }
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
  // EFFECT 4: Client-Side Decryption Pipeline for Incoming Messages
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!activeCryptoKey || currentView !== 'chat') {
      setDecryptedMessages([]);
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
            const payload = await decryptPayload<MessagePayload>(activeCryptoKey, msg.iv, msg.ciphertext);
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
              decryptionFailed: false,
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

  // Decrypt active participants & typing indicators
  const [activePeers, setActivePeers] = useState<ActivePeer[]>([]);
  useEffect(() => {
    if (!activeCryptoKey || currentView !== 'chat') {
      setActivePeers([]);
      return;
    }
    let cancelled = false;
    const decryptPeers = async () => {
      const cutoff = Date.now() - 35000;
      const validRecords = presenceList.filter((p) => p.lastSeen && p.lastSeen > cutoff);
      const out: ActivePeer[] = [];
      for (const rec of validRecords) {
        try {
          const info = await decryptPayload<{ displayName?: string }>(activeCryptoKey, rec.iv, rec.ciphertext);
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
  // EFFECT 5: Presence Heartbeat & Auto-Expiration
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!user || currentView !== 'chat' || !activeSlug || !activeCryptoKey) return;

    const presenceDocId = `${activeSlug}_${user.uid}`;
    const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', 'presence', presenceDocId);

    const publishHeartbeat = async (isTypingFlag = false) => {
      try {
        const encryptedProfile = await encryptPayload(activeCryptoKey, {
          displayName,
        });
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

  // --------------------------------------------------------------------------
  // CORE ACTIONS: PURGE & EXPIRE
  // --------------------------------------------------------------------------
  const purgeAndExpireRoom = useCallback(
    async (slugToPurge: string, targetStatus: 'revoked' | 'expired' = 'revoked') => {
      if (!user || !slugToPurge) return;
      try {
        const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', slugToPurge);
        await updateDoc(roomRef, {
          status: targetStatus,
          revokedAt: Date.now(),
          revokedBy: user.uid,
        });

        const messagesCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
        const msgSnap = await getDocs(messagesCol);
        const deletePromises: Promise<void>[] = [];
        msgSnap.forEach((docSnap: QueryDocumentSnapshot) => {
          if (docSnap.data().roomSlug === slugToPurge) {
            deletePromises.push(deleteDoc(docSnap.ref));
          }
        });

        const presenceCol = collection(db, 'artifacts', appId, 'public', 'data', 'presence');
        const presSnap = await getDocs(presenceCol);
        presSnap.forEach((docSnap: QueryDocumentSnapshot) => {
          if (docSnap.data().roomSlug === slugToPurge) {
            deletePromises.push(deleteDoc(docSnap.ref));
          }
        });

        await Promise.all(deletePromises);
        setShowRevokeConfirm(false);
        setExpiredReason(targetStatus);
        setCurrentView('expired');
      } catch (err) {
        console.error('Failed to revoke and purge conversation:', err);
      }
    },
    [user]
  );

  // Check if active room has passed its expiration timestamp while open
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
  // CORE ACTIONS
  // --------------------------------------------------------------------------

  const enterRoomWithCredentials = async (rawSlug: string, rawKeyString: string) => {
    setJoinError('');
    setCreateError('');
    const cleanSlug = sanitizeSlug(rawSlug);
    if (!cleanSlug) {
      setJoinError('Invalid conversation slug.');
      return;
    }

    let importedKey: CryptoKey;
    let meta: KeyMetadata;
    try {
      importedKey = await importRoomKey(rawKeyString.trim());
      meta = await computeKeyMetadata(importedKey);
    } catch {
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
    } catch {
      setJoinError('Could not connect to room. Check your network connection.');
    }
  };

  const handleCreateConversation = async (
    e: React.FormEvent | null,
    withInstantPeerSimulation = false
  ) => {
    if (e) e.preventDefault();
    if (!user) return;
    setCreateError('');

    const cleanedSlug = sanitizeSlug(slugInput);
    const validation = validateSlug(cleanedSlug);
    if (!validation.valid) {
      setCreateError(validation.reason);
      return;
    }

    setIsCreatingRoom(true);
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'rooms', cleanedSlug);
      const existingSnap = await getDoc(roomRef);

      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as RoomData;
        const isExpired = existingData.expiresAt && Date.now() > existingData.expiresAt;
        const isRevoked = existingData.status === 'revoked' || existingData.status === 'expired';
        if (!isExpired && !isRevoked) {
          setCreateError(`/${cleanedSlug} is already active. Please pick another slug.`);
          setIsCreatingRoom(false);
          return;
        }
        await purgeAndExpireRoom(cleanedSlug, 'expired');
      }

      const { cryptoKey, keyString } = await generateRoomKey();
      const meta = await computeKeyMetadata(cryptoKey);

      const ttlConfig = EXPIRATION_OPTIONS.find((o) => o.id === selectedTtl) || EXPIRATION_OPTIONS[1];
      const now = Date.now();
      const expiresAt = ttlConfig.ms ? now + ttlConfig.ms : null;

      const newRoomDoc: RoomData = {
        slug: cleanedSlug,
        creatorUid: user.uid,
        createdAt: now,
        expiresAt,
        ttlLabel: ttlConfig.fullLabel,
        status: 'active',
        allowPeerRevoke: Boolean(allowPeerRevoke),
        keyCommitment: meta.commitment,
        encryptionCipher: 'AES-256-GCM',
      };

      await setDoc(roomRef, newRoomDoc);

      setActiveSlug(cleanedSlug);
      setActiveKeyString(keyString);
      setActiveCryptoKey(cryptoKey);
      setKeyMetadata(meta);
      setRoomData(newRoomDoc);
      setCurrentView('chat');

      try {
        window.history.replaceState(
          null,
          '',
          `?room=${encodeURIComponent(cleanedSlug)}#key=${encodeURIComponent(keyString)}`
        );
      } catch {
        // Ignore
      }

      if (withInstantPeerSimulation) {
        await triggerSimulatedPeerReply(
          cleanedSlug,
          cryptoKey,
          'Initial handshake verified. Your 256-bit AES-GCM session is live. Reply or drop an image to test real-time encryption.'
        );
      } else {
        setShowShareModal(true);
      }
    } catch (err) {
      console.error('Create conversation error:', err);
      setCreateError('Failed to initialize encrypted room. Please retry.');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const triggerSimulatedPeerReply = async (
    targetSlug = activeSlug,
    targetKey = activeCryptoKey,
    customMessage: string | null = null
  ) => {
    if (!targetSlug || !targetKey || simulatingPeer) return;
    setSimulatingPeer(true);
    const peerUid = 'peer-verified-cipher-99';
    const peerName = 'Elena (Peer Node)';
    const presenceDocId = `${targetSlug}_${peerUid}`;
    const presenceRef = doc(db, 'artifacts', appId, 'public', 'data', 'presence', presenceDocId);

    try {
      const encryptedPeerProfile = await encryptPayload(targetKey, { displayName: peerName });
      await setDoc(presenceRef, {
        roomSlug: targetSlug,
        uid: peerUid,
        iv: encryptedPeerProfile.iv,
        ciphertext: encryptedPeerProfile.ciphertext,
        isTyping: true,
        lastSeen: Date.now(),
      });

      await new Promise((r) => setTimeout(r, 1100));

      const sampleReplies = [
        'Confirmed. I verified our SHA-256 key fingerprint out-of-band. Zero plaintext is visible on the relay.',
        'Received loud and clear 🔒. Every packet has a unique 96-bit IV and 128-bit authentication tag.',
        'Let us burn and revoke this room as soon as we finish reviewing the architecture specs.',
      ];
      const chosenText =
        customMessage || sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

      const encryptedMsg = await encryptPayload(targetKey, {
        text: chosenText,
        senderName: peerName,
        sentAt: Date.now(),
        replyTo: null,
        attachment: null,
      });

      const messagesCol = collection(db, 'artifacts', appId, 'public', 'data', 'messages');
      await addDoc(messagesCol, {
        roomSlug: targetSlug,
        senderUid: peerUid,
        createdAt: Date.now(),
        type: 'text',
        iv: encryptedMsg.iv,
        ciphertext: encryptedMsg.ciphertext,
        alg: 'AES-256-GCM',
        deleted: false,
      });

      await setDoc(presenceRef, {
        roomSlug: targetSlug,
        uid: peerUid,
        iv: encryptedPeerProfile.iv,
        ciphertext: encryptedPeerProfile.ciphertext,
        isTyping: false,
        lastSeen: Date.now(),
      });
    } catch (err) {
      console.error('Peer simulation error:', err);
    } finally {
      setSimulatingPeer(false);
    }
  };

  const handleJoinConversation = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setJoinError('');

    let targetSlug = joinSlugManual.trim();
    let targetKey = joinKeyManual.trim();

    if (joinLinkInput.trim()) {
      const raw = joinLinkInput.trim();
      const roomMatch = raw.match(/[?&]room=([a-zA-Z0-9-_]+)/);
      const pathMatch = raw.match(/\/([a-zA-Z0-9-_]+)#key=/);
      const keyMatch = raw.match(/#key=([A-Za-z0-9_-]+)/);

      if (roomMatch) targetSlug = roomMatch[1];
      else if (pathMatch) targetSlug = pathMatch[1];

      if (keyMatch) targetKey = keyMatch[1];
    }

    if (!targetSlug || !targetKey) {
      setJoinError('Provide a complete invitation URI (including #key=...) or enter both the room slug and 256-bit key.');
      return;
    }

    await enterRoomWithCredentials(targetSlug, targetKey);
  };

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
              snippet: (replyingTo.decrypted?.text || '[Encrypted Image]').slice(0, 90),
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
      setUploadError('Failed to encrypt and transmit message. Please verify your connection.');
    } finally {
      setIsSending(false);
    }
  };

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

  const fullInvitationUri = useMemo(() => {
    const origin = typeof window !== 'undefined' && window.location.origin !== 'null'
      ? window.location.origin + window.location.pathname
      : 'https://vesper.link/';
    return `${origin}?room=${encodeURIComponent(activeSlug)}#key=${encodeURIComponent(activeKeyString)}`;
  }, [activeSlug, activeKeyString]);

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vesper E2EE Room: /${activeSlug}`,
          text: 'Join my temporary end-to-end encrypted conversation. The decryption key is embedded in the URL fragment.',
          url: fullInvitationUri,
        });
      } catch {
        // User cancelled
      }
    } else {
      copyToClipboard(fullInvitationUri, 'share-uri');
    }
  };

  const runAutomatedSecurityTests = async () => {
    setIsRunningTests(true);
    const results: TestResult[] = [];

    // Test 1: 256-Bit CSPRNG Key Generation
    try {
      const { cryptoKey, keyString } = await generateRoomKey();
      const rawBytes = base64UrlToBuffer(keyString);
      const passed = rawBytes.byteLength === 32 && Boolean(cryptoKey);
      results.push({
        id: 'T01',
        name: '256-Bit CSPRNG Key Generation & URL-Safe Base64 Encoding',
        passed,
        detail: `Generated ${rawBytes.byteLength * 8}-bit key (${keyString.slice(0, 14)}...)`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      results.push({ id: 'T01', name: '256-Bit CSPRNG Key Generation', passed: false, detail: msg });
    }

    // Test 2: AES-256-GCM Roundtrip
    try {
      const { cryptoKey } = await generateRoomKey();
      const sample = {
        text: 'Zero-knowledge verification payload 🔒✨',
        senderName: 'Alice',
        sentAt: 1700000000000,
      };
      const encrypted = await encryptPayload(cryptoKey, sample);
      const decrypted = await decryptPayload<{ text: string; senderName: string }>(
        cryptoKey,
        encrypted.iv,
        encrypted.ciphertext
      );
      const passed =
        decrypted.text === sample.text &&
        decrypted.senderName === sample.senderName &&
        !encrypted.ciphertext.includes('Zero-knowledge');
      results.push({
        id: 'T02',
        name: 'AES-256-GCM Client Encryption & Decryption Roundtrip',
        passed,
        detail: `IV (${encrypted.iv}) + 128-bit GCM Auth Tag verified`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      results.push({ id: 'T02', name: 'AES-256-GCM Roundtrip', passed: false, detail: msg });
    }

    // Test 3: Unique 96-Bit IV Indistinguishability
    try {
      const { cryptoKey } = await generateRoomKey();
      const payload = { text: 'Identical message' };
      const enc1 = await encryptPayload(cryptoKey, payload);
      const enc2 = await encryptPayload(cryptoKey, payload);
      const passed = enc1.iv !== enc2.iv && enc1.ciphertext !== enc2.ciphertext;
      results.push({
        id: 'T03',
        name: '96-Bit IV Uniqueness & Semantic Indistinguishability',
        passed,
        detail: 'Identical plaintexts produce distinct IVs & ciphertexts',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      results.push({ id: 'T03', name: '96-Bit IV Uniqueness', passed: false, detail: msg });
    }

    // Test 4: Tamper & Unauthorized Key Rejection
    try {
      const { cryptoKey: keyA } = await generateRoomKey();
      const { cryptoKey: keyB } = await generateRoomKey();
      const enc = await encryptPayload(keyA, { text: 'Confidential payload' });

      let wrongKeyRejected = false;
      try {
        await decryptPayload(keyB, enc.iv, enc.ciphertext);
      } catch {
        wrongKeyRejected = true;
      }

      const rawCipher = base64UrlToBuffer(enc.ciphertext);
      rawCipher[0] ^= 0xff;
      const tamperedCipher = bufferToBase64Url(rawCipher);
      let tamperRejected = false;
      try {
        await decryptPayload(keyA, enc.iv, tamperedCipher);
      } catch {
        tamperRejected = true;
      }

      results.push({
        id: 'T04',
        name: 'Authenticated GCM Tag Tamper & Wrong-Key Rejection',
        passed: wrongKeyRejected && tamperRejected,
        detail: '1-bit modified ciphertext & foreign keys rejected via OperationError',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      results.push({ id: 'T04', name: 'Tamper Rejection', passed: false, detail: msg });
    }

    // Test 5: Zero-Knowledge SHA-256 Key Commitment
    try {
      const { cryptoKey } = await generateRoomKey();
      const meta = await computeKeyMetadata(cryptoKey);
      const passed = Boolean(meta.fingerprint && meta.commitment && meta.commitment.length > 20);
      results.push({
        id: 'T05',
        name: 'Double-Iterated SHA-256 Commitment & Visual Fingerprint',
        passed,
        detail: `Fingerprint: ${meta.fingerprint}`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      results.push({ id: 'T05', name: 'SHA-256 Commitment', passed: false, detail: msg });
    }

    // Test 6: Custom URL Slug Sanitization
    try {
      const valid1 = validateSlug('afterhours').valid;
      const valid2 = validateSlug('just-us-2026').valid;
      const invalidShort = !validateSlug('ab').valid;
      const sanitized = sanitizeSlug('My Secret Room!! @#$');
      const passed = valid1 && valid2 && invalidShort && sanitized === 'my-secret-room';
      results.push({
        id: 'T06',
        name: 'URL Slug Boundary Validation & RFC Sanitization',
        passed,
        detail: `Sanitized "My Secret Room!! @#$" -> "/${sanitized}"`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      results.push({ id: 'T06', name: 'Slug Validation', passed: false, detail: msg });
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  useEffect(() => {
    runAutomatedSecurityTests();
  }, []);

  const typingPeers = useMemo(() => {
    if (!user) return [];
    return activePeers.filter((p) => p.uid !== user.uid && p.isTyping);
  }, [activePeers, user]);

  const leaveConversationView = () => {
    setCurrentView('landing');
    setActiveSlug('');
    setActiveKeyString('');
    setActiveCryptoKey(null);
    setRoomData(null);
    setDecryptedMessages([]);
    setEncryptedMessages([]);
    setExpiredReason(null);
    try {
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      // Ignore
    }
  };

  const scrollToSection = (id: string) => {
    if (currentView !== 'landing') {
      leaveConversationView();
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#09090B] text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-600 dark:selection:text-emerald-400 transition-colors duration-200 flex flex-col">
        {/* Navigation Bar */}
        <Navbar
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          currentView={currentView}
          activeSlug={activeSlug}
          roomData={roomData}
          isOnline={isOnline}
          user={user}
          simulatingPeer={simulatingPeer}
          onLeaveConversation={leaveConversationView}
          onScrollToSection={scrollToSection}
          onOpenJoinModal={() => setShowJoinModal(true)}
          onOpenShareModal={() => setShowShareModal(true)}
          onOpenRevokeConfirm={() => setShowRevokeConfirm(true)}
          onOpenSecurityModal={() => setShowSecurityModal(true)}
          onSimulatePeerReply={() => triggerSimulatedPeerReply(activeSlug, activeCryptoKey)}
        />

        {/* View 1: Landing Page & Crypto Lab */}
        {currentView === 'landing' && (
          <LandingView
            slugInput={slugInput}
            setSlugInput={setSlugInput}
            slugStatus={slugStatus}
            displayName={displayName}
            setDisplayName={setDisplayName}
            allowPeerRevoke={allowPeerRevoke}
            setAllowPeerRevoke={setAllowPeerRevoke}
            selectedTtl={selectedTtl}
            setSelectedTtl={setSelectedTtl}
            createError={createError}
            isCreatingRoom={isCreatingRoom}
            user={user}
            handleCreateConversation={handleCreateConversation}
            onOpenJoinModal={() => setShowJoinModal(true)}
            onOpenSecurityModal={() => setShowSecurityModal(true)}
            heroPreviewTab={heroPreviewTab}
            setHeroPreviewTab={setHeroPreviewTab}
            heroDemoKeyObj={heroDemoKeyObj}
            heroDemoMessages={heroDemoMessages}
            heroDemoInput={heroDemoInput}
            setHeroDemoInput={setHeroDemoInput}
            handleHeroDemoSend={handleHeroDemoSend}
            activeArchStep={activeArchStep}
            setActiveArchStep={setActiveArchStep}
            workbenchPlaintext={workbenchPlaintext}
            setWorkbenchPlaintext={setWorkbenchPlaintext}
            workbenchDemoPacket={workbenchDemoPacket}
            bentoBurnState={bentoBurnState}
            setBentoBurnState={setBentoBurnState}
            testResults={testResults}
            isRunningTests={isRunningTests}
            runAutomatedSecurityTests={runAutomatedSecurityTests}
          />
        )}

        {/* View 2: Active Chat Room */}
        {currentView === 'chat' && (
          <ChatView
            activeSlug={activeSlug}
            keyMetadata={keyMetadata}
            activePeers={activePeers}
            typingPeers={typingPeers}
            displayName={displayName}
            setDisplayName={setDisplayName}
            editingName={editingName}
            setEditingName={setEditingName}
            isDraggingOver={isDraggingOver}
            setIsDraggingOver={setIsDraggingOver}
            handleImageFile={handleImageFile}
            decryptedMessages={decryptedMessages}
            user={user}
            fullInvitationUri={fullInvitationUri}
            roomData={roomData}
            copyToClipboard={copyToClipboard}
            copiedId={copiedId}
            simulatingPeer={simulatingPeer}
            triggerSimulatedPeerReply={() => triggerSimulatedPeerReply(activeSlug, activeCryptoKey)}
            rawInspectMsg={rawInspectMsg}
            setRawInspectMsg={setRawInspectMsg}
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
            messagesEndRef={messagesEndRef}
            fileInputRef={fileInputRef}
          />
        )}

        {/* View 3: Expired / Revoked Tombstone */}
        {currentView === 'expired' && (
          <ExpiredView
            expiredReason={expiredReason}
            activeSlug={activeSlug}
            onReturnHome={leaveConversationView}
          />
        )}

        {/* Modals */}
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
          activeKeyString={activeKeyString}
          fingerprint={keyMetadata.fingerprint}
          copiedId={copiedId}
          onCopy={copyToClipboard}
          onNativeShare={handleNativeShare}
          onSimulatePeer={() => {
            setShowShareModal(false);
            triggerSimulatedPeerReply(activeSlug, activeCryptoKey);
          }}
        />

        <RevokeModal
          isOpen={showRevokeConfirm}
          onClose={() => setShowRevokeConfirm(false)}
          onConfirm={() => purgeAndExpireRoom(activeSlug, 'revoked')}
          activeSlug={activeSlug}
        />

        <SecurityModal
          isOpen={showSecurityModal}
          onClose={() => setShowSecurityModal(false)}
        />

        <LightboxModal
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      </div>
    </div>
  );
}
