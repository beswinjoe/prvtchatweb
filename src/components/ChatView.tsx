import {
  Check,
  Copy,
  CornerDownRight,
  ImageIcon,
  Key,
  Lock,
  Maximize2,
  Reply,
  Send,
  ShieldAlert,
  ShieldCheck,
  Smile,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import React from 'react';
import { EMOJI_CATEGORIES, QUICK_REACTION_EMOJIS } from '../lib/constants';
import { formatTimestamp, getParticipantColor } from '../lib/utils';
import type {
  ActivePeer,
  DecryptedMessage,
  ImageAttachment,
  KeyMetadata,
  RoomData,
} from '../types';

interface ChatViewProps {
  activeSlug: string;
  keyMetadata: KeyMetadata;
  activePeers: ActivePeer[];
  typingPeers: ActivePeer[];
  displayName: string;
  setDisplayName: (v: string) => void;
  editingName: boolean;
  setEditingName: (v: boolean) => void;
  isDraggingOver: boolean;
  setIsDraggingOver: (v: boolean) => void;
  handleImageFile: (file: File) => void;
  decryptedMessages: DecryptedMessage[];
  user: { uid: string } | null;
  fullInvitationUri: string;
  roomData: RoomData | null;
  copyToClipboard: (text: string, id: string) => void;
  copiedId: string | null;
  simulatingPeer: boolean;
  triggerSimulatedPeerReply: () => void;
  rawInspectMsg: DecryptedMessage | null;
  setRawInspectMsg: (msg: DecryptedMessage | null) => void;
  setLightboxImage: (img: ImageAttachment | null) => void;
  handleToggleReaction: (msg: DecryptedMessage, emoji: string) => void;
  setReplyingTo: (msg: DecryptedMessage | null) => void;
  handleDeleteOwnMessage: (msg: DecryptedMessage) => void;
  replyingTo: DecryptedMessage | null;
  pendingAttachment: ImageAttachment | null;
  setPendingAttachment: (att: ImageAttachment | null) => void;
  uploadError: string;
  setUploadError: (err: string) => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (v: boolean | ((prev: boolean) => boolean)) => void;
  messageText: string;
  setMessageText: (v: string | ((prev: string) => string)) => void;
  notifyTyping: () => void;
  handleSendMessage: (e?: React.FormEvent) => void;
  isSending: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ChatView: React.FC<ChatViewProps> = ({
  activeSlug,
  keyMetadata,
  activePeers,
  typingPeers,
  displayName,
  setDisplayName,
  editingName,
  setEditingName,
  isDraggingOver,
  setIsDraggingOver,
  handleImageFile,
  decryptedMessages,
  user,
  fullInvitationUri,
  roomData,
  copyToClipboard,
  copiedId,
  simulatingPeer,
  triggerSimulatedPeerReply,
  rawInspectMsg,
  setRawInspectMsg,
  setLightboxImage,
  handleToggleReaction,
  setReplyingTo,
  handleDeleteOwnMessage,
  replyingTo,
  pendingAttachment,
  setPendingAttachment,
  uploadError,
  setUploadError,
  showEmojiPicker,
  setShowEmojiPicker,
  messageText,
  setMessageText,
  notifyTyping,
  handleSendMessage,
  isSending,
  messagesEndRef,
  fileInputRef,
}) => {
  return (
    <div
      className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-2 sm:px-6 py-3 h-[calc(100vh-3.5rem)]"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleImageFile(e.dataTransfer.files[0]);
        }
      }}
    >
      {/* Subheader / Security Bar */}
      <div className="bg-white dark:bg-[#111113] border border-zinc-200/90 dark:border-zinc-800/90 rounded-t-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              /{activeSlug}
            </span>
          </div>

          <div
            className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/90 text-[11px] font-mono text-zinc-600 dark:text-zinc-400"
            title="SHA-256 fingerprint of your 256-bit room encryption key. Compare with your peer to verify zero MITM."
          >
            <Key className="w-3 h-3 text-emerald-500" />
            <span>Key Fingerprint: {keyMetadata.fingerprint}</span>
          </div>
        </div>

        {/* Active Participants & Alias Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {Math.max(1, activePeers.length)}{' '}
              {activePeers.length === 1 ? 'participant' : 'participants'} online
            </span>
          </div>

          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={24}
                className="px-2 py-0.5 text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 w-28 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingName(false);
                }}
              />
              <button
                type="button"
                onClick={() => setEditingName(false)}
                className="text-xs px-2 py-0.5 rounded bg-emerald-500 text-white font-medium cursor-pointer"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Click to change your encrypted display alias"
            >
              Alias: {displayName}
            </button>
          )}
        </div>
      </div>

      {/* Drag-and-Drop Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-40 bg-zinc-950/70 backdrop-blur-xs flex items-center justify-center p-6 pointer-events-none">
          <div className="border-2 border-dashed border-emerald-400 rounded-2xl p-8 bg-zinc-900/90 text-center space-y-2 max-w-sm">
            <ImageIcon className="w-10 h-10 text-emerald-400 mx-auto" />
            <div className="text-sm font-semibold text-white">
              Drop Image to Encrypt & Attach
            </div>
            <p className="text-xs text-zinc-400">
              Compressed & encrypted client-side with AES-256-GCM before upload.
            </p>
          </div>
        </div>
      )}

      {/* Message Timeline */}
      <div className="flex-1 overflow-y-auto bg-white/60 dark:bg-[#111113]/60 border-x border-zinc-200/90 dark:border-zinc-800/90 p-4 sm:p-6 space-y-4">
        {decryptedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto py-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                End-to-End Encrypted Room Ready
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                Share the invitation link (including the{' '}
                <code className="font-mono text-zinc-700 dark:text-zinc-300">#key=</code>{' '}
                fragment) with your peer, or click <strong>Simulate Peer Reply</strong> below
                to test two-way real-time E2EE messaging immediately.
              </p>
            </div>

            <div className="w-full p-3.5 rounded-xl bg-zinc-100/80 dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 text-left space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>SHAREABLE INVITATION URI</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {roomData?.ttlLabel || 'Ephemeral'}
                </span>
              </div>
              <div className="text-xs font-mono truncate text-zinc-800 dark:text-zinc-200 bg-white dark:bg-zinc-900 px-2.5 py-1.5 rounded border border-zinc-200 dark:border-zinc-800">
                {fullInvitationUri}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => copyToClipboard(fullInvitationUri, 'empty-copy')}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedId === 'empty-copy' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied Full Link</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Invitation Link</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={simulatingPeer}
                  onClick={triggerSimulatedPeerReply}
                  className="py-1.5 px-3 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{simulatingPeer ? 'Simulating...' : 'Simulate Peer'}</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          decryptedMessages.map((msg) => {
            const isMine = Boolean(user && msg.senderUid === user.uid);
            const palette = getParticipantColor(msg.senderUid);

            if (msg.deleted) {
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="px-3 py-1.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-[11px] font-mono text-zinc-400 dark:text-zinc-500 flex items-center gap-1.5">
                    <Trash2 className="w-3 h-3" />
                    <span>Ciphertext purged by sender</span>
                  </div>
                </div>
              );
            }

            if (msg.decryptionFailed || !msg.decrypted) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>
                      Unable to decrypt message (authentication tag mismatch or foreign key).
                    </span>
                  </div>
                </div>
              );
            }

            const { text, senderName, replyTo, attachment } = msg.decrypted;
            const reactionEntries = Object.entries(msg.reactions || {});

            return (
              <div
                key={msg.id}
                className={`group flex flex-col ${
                  isMine ? 'items-end' : 'items-start'
                } space-y-1`}
              >
                {/* Sender Name & Timestamp */}
                <div className="flex items-center gap-2 px-1">
                  {!isMine && (
                    <span className={`text-[11px] font-semibold ${palette.text}`}>
                      {senderName}
                    </span>
                  )}
                  {isMine && (
                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                      {senderName} (You)
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                    {formatTimestamp(msg.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setRawInspectMsg(rawInspectMsg?.id === msg.id ? null : msg)
                    }
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-[10px] font-mono text-zinc-400 hover:text-emerald-500 transition-opacity cursor-pointer"
                    title="Inspect raw Firestore AES-GCM ciphertext for this message"
                  >
                    [raw]
                  </button>
                </div>

                {/* Bubble */}
                <div
                  className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-2xs transition-all ${
                    isMine
                      ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950 rounded-br-xs'
                      : 'bg-white dark:bg-zinc-800/90 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 rounded-bl-xs'
                  }`}
                >
                  {replyTo && (
                    <div
                      className={`mb-2 pl-2.5 py-1 rounded border-l-2 text-xs ${
                        isMine
                          ? 'border-emerald-400 bg-white/10 dark:bg-zinc-900/10 text-zinc-200 dark:text-zinc-700'
                          : 'border-emerald-500 bg-zinc-100 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <div className="font-semibold text-[10px]">{replyTo.senderName}</div>
                      <div className="truncate text-[11px]">{replyTo.snippet}</div>
                    </div>
                  )}

                  {attachment && attachment.dataUrl && (
                    <div className="mb-2 rounded-xl overflow-hidden border border-zinc-700/20 dark:border-zinc-300/20 relative group/img">
                      <img
                        src={attachment.dataUrl}
                        alt={attachment.originalName || 'Encrypted attachment'}
                        className="max-h-72 w-auto object-cover cursor-pointer rounded-lg"
                        onClick={() => setLightboxImage(attachment)}
                      />
                      <button
                        type="button"
                        onClick={() => setLightboxImage(attachment)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-zinc-950/70 text-white opacity-0 group-hover/img:opacity-100 transition-opacity cursor-pointer"
                        title="Open full-screen viewer"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {text && (
                    <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                      {text}
                    </p>
                  )}

                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-mono ${
                      isMine
                        ? 'text-zinc-400 dark:text-zinc-600'
                        : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    <Lock className="w-2.5 h-2.5 text-emerald-500" />
                    <span>GCM Verified</span>
                  </div>
                </div>

                {/* Raw Inspector Accordion */}
                {rawInspectMsg?.id === msg.id && (
                  <div className="max-w-[85%] sm:max-w-[70%] p-2.5 rounded-xl bg-zinc-950 text-zinc-300 font-mono text-[10px] border border-zinc-800 space-y-1">
                    <div className="text-emerald-400 font-semibold">
                      Firestore Document ID: {msg.id}
                    </div>
                    <div>
                      <span className="text-zinc-500">IV (96-bit): </span>
                      <span className="text-amber-300">{msg.iv}</span>
                    </div>
                    <div className="break-all">
                      <span className="text-zinc-500">Ciphertext: </span>
                      <span>{msg.ciphertext?.slice(0, 120)}...</span>
                    </div>
                  </div>
                )}

                {/* Reaction Badges */}
                {reactionEntries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 px-1">
                    {reactionEntries.map(([emoji, users]) => {
                      const iReacted =
                        user &&
                        Array.isArray(users) &&
                        users.some((u) => u.uid === user.uid);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg, emoji)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors cursor-pointer ${
                            iReacted
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                          }`}
                          title={
                            Array.isArray(users)
                              ? users.map((u) => u.name).join(', ')
                              : ''
                          }
                        >
                          <span>{emoji}</span>
                          <span className="text-[10px] font-mono">
                            {Array.isArray(users) ? users.length : 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Action Bar */}
                <div className="opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 px-1">
                  {QUICK_REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleToggleReaction(msg, emoji)}
                      className="p-1 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-xs transition-colors cursor-pointer"
                      title={`React with ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => setReplyingTo(msg)}
                    className="p-1 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                    title="Reply to message"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>

                  {text && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(text, `msg-${msg.id}`)}
                      className="p-1 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
                      title="Copy decrypted message text"
                    >
                      {copiedId === `msg-${msg.id}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {isMine && (
                    <button
                      type="button"
                      onClick={() => handleDeleteOwnMessage(msg)}
                      className="p-1 rounded hover:bg-rose-500/15 text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer"
                      title="Delete and purge ciphertext"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typingPeers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono pl-1">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:300ms]" />
            </span>
            <span>
              {typingPeers.map((p) => p.displayName).join(', ')}{' '}
              {typingPeers.length === 1 ? 'is' : 'are'} encrypting a message...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Footer */}
      <div className="bg-white dark:bg-[#111113] border border-zinc-200/90 dark:border-zinc-800/90 rounded-b-2xl p-3 space-y-2 shadow-sm relative">
        {replyingTo && (
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 text-xs">
            <div className="flex items-center gap-2 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                Replying to {replyingTo.decrypted?.senderName}:
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 truncate">
                {replyingTo.decrypted?.text || '[Encrypted Image]'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {pendingAttachment && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <img
                src={pendingAttachment.dataUrl}
                alt="Pending upload"
                className="w-12 h-12 rounded-lg object-cover border border-zinc-300 dark:border-zinc-700"
              />
              <div>
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-emerald-500" />
                  <span>Ready for Client-Side AES-256-GCM Encryption</span>
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  {pendingAttachment.originalName} ({pendingAttachment.width}×
                  {pendingAttachment.height} · ~
                  {Math.round(pendingAttachment.approxBytes / 1024)} KB)
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {uploadError && (
          <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError('')}
              className="text-rose-500 hover:underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div className="absolute bottom-16 left-3 z-30 w-72 sm:w-80 p-3 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-1.5">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Insert Unicode Emoji
              </span>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto space-y-2.5 pr-1">
              {Object.entries(EMOJI_CATEGORIES).map(([cat, list]) => (
                <div key={cat} className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-zinc-400">{cat}</div>
                  <div className="grid grid-cols-8 gap-1">
                    {list.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          setMessageText((prev) => prev + em);
                        }}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-base flex items-center justify-center cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleImageFile(e.target.files[0]);
                e.target.value = '';
              }
            }}
          />

          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            title="Open emoji picker"
          >
            <Smile className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
            title="Attach or drag-and-drop image (encrypted client-side)"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <textarea
            rows={1}
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              notifyTyping();
            }}
            onPaste={(e) => {
              if (e.clipboardData && e.clipboardData.files.length > 0) {
                const file = e.clipboardData.files[0];
                if (file.type.startsWith('image/')) {
                  e.preventDefault();
                  handleImageFile(file);
                }
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Write an encrypted message... (Paste or drop images anytime)"
            className="flex-1 max-h-32 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#09090B] px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-300 resize-none"
          />

          <button
            type="submit"
            disabled={isSending || (!messageText.trim() && !pendingAttachment)}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 font-medium text-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Encrypt & Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
