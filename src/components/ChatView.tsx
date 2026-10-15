import {
  Check,
  Clock,
  Copy,
  CornerDownRight,
  Image as ImageIcon,
  Lock,
  Maximize2,
  Reply,
  Send,
  Share2,
  Smile,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import React from 'react';
import { EMOJI_CATEGORIES, QUICK_REACTION_EMOJIS } from '../lib/constants';
import { formatTimeRemaining } from '../lib/expiry';
import { formatTimestamp } from '../lib/utils';
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
  isDraggingOver: boolean;
  setIsDraggingOver: (v: boolean) => void;
  handleImageFile: (file: File) => void;
  decryptedMessages: DecryptedMessage[];
  user: { uid: string } | null;
  fullInvitationUri: string;
  roomData: RoomData | null;
  copyToClipboard: (text: string, id: string) => void;
  copiedId: string | null;
  onOpenShareModal: () => void;
  onOpenRevokeConfirm: () => void;
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
  nowTick: number;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const ChatView: React.FC<ChatViewProps> = ({
  activeSlug,
  activePeers,
  typingPeers,
  isDraggingOver,
  setIsDraggingOver,
  handleImageFile,
  decryptedMessages,
  user,
  fullInvitationUri,
  roomData,
  copyToClipboard,
  copiedId,
  onOpenShareModal,
  onOpenRevokeConfirm,
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
  nowTick,
  messagesEndRef,
  fileInputRef,
}) => {
  const timeLeft = roomData?.expiresAt ? formatTimeRemaining(roomData.expiresAt, nowTick) : null;

  return (
    <div
      className="relative flex-1 flex flex-col h-[calc(100vh-4rem)] max-w-4xl w-full mx-auto px-3 sm:px-6 py-2 overflow-hidden bg-white text-zinc-950"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsDraggingOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
          handleImageFile(file);
        }
      }}
    >
      {/* Sub-header Bar: Room identity, status & quick actions */}
      <div className="shrink-0 py-2.5 px-4 mb-2 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold text-zinc-950 text-sm">
              /{activeSlug}
            </span>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-200/80 text-zinc-800 text-[11px] font-medium">
              <Lock className="w-3 h-3" />
              <span>Encrypted</span>
            </div>
          </div>

          {/* Active Peers Counter */}
          <div className="hidden sm:flex items-center gap-1.5 text-zinc-500 pl-3 border-l border-zinc-200">
            <Users className="w-3.5 h-3.5 text-zinc-600" />
            <span>
              {activePeers.length > 0
                ? `${activePeers.length} online`
                : '1 participant'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Expiration badge */}
          {timeLeft && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-700 bg-white px-2.5 py-1 rounded-lg border border-zinc-200">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>{timeLeft}</span>
            </div>
          )}

          {/* Quick Copy Link Button */}
          <button
            type="button"
            onClick={() => copyToClipboard(fullInvitationUri, 'chat-header-uri')}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer border border-transparent hover:border-zinc-200"
            title="Copy invitation link"
          >
            {copiedId === 'chat-header-uri' ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Accessible Destroy Chat Action */}
          <button
            type="button"
            onClick={onOpenRevokeConfirm}
            className="p-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
            title="Destroy this conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-4 z-50 rounded-2xl border-2 border-dashed border-zinc-950 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none animate-in fade-in duration-150">
          <ImageIcon className="w-10 h-10 text-zinc-800 mb-2" />
          <p className="text-sm font-semibold text-zinc-950">
            Drop image to encrypt and send
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Compressed and encrypted client-side before upload
          </p>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-3 space-y-4">
        {decryptedMessages.length === 0 ? (
          /* Empty State for Newly Created Chat */
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 my-auto">
            <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center">
              <Lock className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h3 className="text-base font-bold text-zinc-950 tracking-tight">
                This conversation is encrypted & ephemeral
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Messages, images, and reactions are sealed with AES-256-GCM.
                Keys remain in the URL fragment and are never stored on any server.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenShareModal}
                className="px-5 py-2.5 rounded-lg btn-black text-xs font-semibold flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Invitation Link</span>
              </button>
            </div>
          </div>
        ) : (
          decryptedMessages.map((msg) => {
            const isMe = user ? msg.senderUid === user.uid : false;
            const senderName = msg.decrypted?.senderName || 'Anonymous';

            if (msg.deleted) {
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="py-1.5 px-3 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-400 text-xs italic">
                    This message was deleted.
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`group flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                {/* Sender Identity & Time */}
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 px-1">
                  {!isMe && (
                    <span
                      className="font-semibold text-zinc-800"
                    >
                      {senderName}
                    </span>
                  )}
                  <span>{formatTimestamp(msg.createdAt)}</span>
                </div>

                {/* Bubble Container with Actions on Hover */}
                <div className={`relative flex items-center gap-2 max-w-[85%] sm:max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Message Bubble */}
                  <div
                    className={`p-3 sm:p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isMe
                        ? 'bg-zinc-950 text-white rounded-tr-xs shadow-xs'
                        : 'bg-zinc-100 text-zinc-950 rounded-tl-xs border border-zinc-200/80 shadow-xs'
                    }`}
                  >
                    {/* Reply Reference */}
                    {msg.decrypted?.replyTo && (
                      <div className={`mb-2 pl-2.5 py-1 text-[11px] border-l-2 rounded-r-md ${
                        isMe
                          ? 'border-zinc-400 bg-zinc-900 text-zinc-300'
                          : 'border-zinc-400 bg-zinc-200/80 text-zinc-700'
                      }`}>
                        <div className="font-semibold">
                          {msg.decrypted.replyTo.senderName}
                        </div>
                        <div className="truncate max-w-xs opacity-90">
                          {msg.decrypted.replyTo.snippet}
                        </div>
                      </div>
                    )}

                    {/* Image Attachment */}
                    {msg.decrypted?.attachment && (
                      <div
                        className="mb-2 rounded-xl overflow-hidden bg-black/5 border border-zinc-200 relative group/img cursor-pointer"
                        onClick={() => setLightboxImage(msg.decrypted?.attachment || null)}
                      >
                        <img
                          src={msg.decrypted.attachment.dataUrl}
                          alt="Decrypted attachment"
                          className="max-h-64 sm:max-h-80 w-auto object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                          <Maximize2 className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    )}

                    {/* Plaintext Body */}
                    {msg.decrypted?.text && (
                      <p className="whitespace-pre-wrap break-words">
                        {msg.decrypted.text}
                      </p>
                    )}
                  </div>

                  {/* Micro Actions Menu on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 bg-white border border-zinc-200 rounded-lg p-1 shadow-sm">
                    {/* Reply */}
                    <button
                      type="button"
                      onClick={() => setReplyingTo(msg)}
                      className="p-1 text-zinc-500 hover:text-zinc-950 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                      title="Reply"
                    >
                      <Reply className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Own Message */}
                    {isMe && (
                      <button
                        type="button"
                        onClick={() => handleDeleteOwnMessage(msg)}
                        className="p-1 text-zinc-500 hover:text-rose-600 hover:bg-zinc-100 rounded transition-colors cursor-pointer"
                        title="Delete for everyone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Emoji Reactions Bar */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1 pt-0.5">
                    {Object.entries(msg.reactions).map(([emoji, userList]) => {
                      const hasReacted = user ? userList.some((u) => u.uid === user.uid) : false;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleToggleReaction(msg, emoji)}
                          className={`px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 transition-all cursor-pointer border ${
                            hasReacted
                              ? 'bg-zinc-950 border-zinc-950 text-white'
                              : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          <span>{emoji}</span>
                          <span className="font-mono text-[10px]">{userList.length}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Active Typing Indicator */}
      {typingPeers.length > 0 && (
        <div className="shrink-0 px-4 py-1 text-[11px] text-zinc-600 flex items-center gap-1.5 animate-pulse font-mono">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-800" />
          <span>
            {typingPeers.map((p) => p.displayName).join(', ')}{' '}
            {typingPeers.length === 1 ? 'is typing...' : 'are typing...'}
          </span>
        </div>
      )}

      {/* Message Composer Area */}
      <div className="shrink-0 pt-2 pb-1 bg-white">
        {/* Reply Reference Preview */}
        {replyingTo && (
          <div className="mb-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <CornerDownRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
              <span className="text-zinc-500">
                Replying to{' '}
                <strong className="text-zinc-900">
                  {replyingTo.decrypted?.senderName || 'Participant'}
                </strong>
                :
              </span>
              <span className="truncate text-zinc-800">
                {replyingTo.decrypted?.text || '[Image Attachment]'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Pending Image Attachment Preview */}
        {pendingAttachment && (
          <div className="mb-2 p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <img
                src={pendingAttachment.dataUrl}
                alt="Preview"
                className="w-12 h-12 object-cover rounded-lg border border-zinc-200"
              />
              <div>
                <div className="font-medium text-zinc-900 truncate max-w-xs">
                  {pendingAttachment.originalName}
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  {Math.round(pendingAttachment.approxBytes / 1024)} KB · Compressed
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              className="p-1 text-zinc-400 hover:text-zinc-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="mb-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError('')}
              className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Quick Emoji Picker Drawer */}
        {showEmojiPicker && (
          <div className="mb-2 p-3 rounded-2xl bg-white shadow-lg border border-zinc-200 max-h-48 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Select Emoji
              </span>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(false)}
                className="text-zinc-400 hover:text-zinc-950 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-8 sm:grid-cols-12 gap-1 text-lg">
              {QUICK_REACTION_EMOJIS.concat(
                EMOJI_CATEGORIES['Expressions'],
                EMOJI_CATEGORIES['Security & Tech']
              ).map((emo, idx) => (
                <button
                  key={`${emo}-${idx}`}
                  type="button"
                  onClick={() => {
                    setMessageText((prev) => prev + emo);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1.5 rounded-lg hover:bg-zinc-100 transition-colors text-center cursor-pointer"
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(e);
          }}
          className="flex items-center gap-2 p-1.5 rounded-xl bg-white border border-zinc-200 shadow-xs focus-within:border-zinc-950 focus-within:ring-1 focus-within:ring-zinc-950 transition-all"
        >
          {/* File Upload Hidden Input */}
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageFile(file);
              e.target.value = '';
            }}
          />

          {/* Attach Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Attach image (client-side compressed & encrypted)"
          >
            <ImageIcon className="w-4 h-4" />
          </button>

          {/* Emoji Drawer Toggle */}
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Insert emoji"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Message Input Box */}
          <input
            type="text"
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              notifyTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type encrypted message..."
            className="flex-1 bg-transparent px-2 py-2 text-xs sm:text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={(!messageText.trim() && !pendingAttachment) || isSending}
            className="py-2 px-3.5 rounded-lg btn-black text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
