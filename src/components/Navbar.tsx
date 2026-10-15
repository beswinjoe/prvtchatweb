import {
  Clock,
  Lock,
  Share2,
  Sparkles,
  Trash2,
  WifiOff,
} from 'lucide-react';
import React from 'react';
import { formatTimeRemaining } from '../lib/expiry';
import type { AppView, RoomData } from '../types';

interface NavbarProps {
  currentView: AppView;
  activeSlug: string;
  roomData: RoomData | null;
  isOnline: boolean;
  nowTick: number;
  onLeaveConversation: () => void;
  onOpenCreateModal: () => void;
  onOpenJoinModal: () => void;
  onOpenShareModal: () => void;
  onOpenRevokeConfirm: () => void;
  onOpenSecurityModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  activeSlug,
  roomData,
  isOnline,
  nowTick,
  onLeaveConversation,
  onOpenCreateModal,
  onOpenJoinModal,
  onOpenShareModal,
  onOpenRevokeConfirm,
  onOpenSecurityModal,
}) => {
  const timeLeft = roomData?.expiresAt ? formatTimeRemaining(roomData.expiresAt, nowTick) : null;

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-white/5 bg-[#07080D]/80 backdrop-blur-xl px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onLeaveConversation}
          className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
          title="PRVTCHAT Home"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Lock className="w-4 h-4 stroke-[2.4]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold tracking-tight text-base text-white">
              PRVT<span className="text-indigo-400">CHAT</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold">
              AES-256-GCM
            </span>
          </div>
        </button>

        {/* In-Chat Room Slug Badge */}
        {currentView === 'chat' && activeSlug && (
          <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-white/10 text-xs font-mono text-slate-300">
            <span className="text-slate-500">room:</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-indigo-300 font-semibold">
              /{activeSlug}
            </span>
          </div>
        )}
      </div>

      {/* Center: In-Chat Live Expiration Countdown */}
      {currentView === 'chat' && timeLeft && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-white/10 text-xs font-mono text-slate-300 shadow-xs">
          <Clock className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
          <span>{timeLeft}</span>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {currentView === 'landing' ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenSecurityModal}
              className="text-xs font-medium text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer hidden sm:block"
            >
              Security
            </button>
            <button
              type="button"
              onClick={onOpenJoinModal}
              className="text-xs font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors cursor-pointer hidden sm:block"
            >
              Join
            </button>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="px-4 py-2 rounded-xl btn-primary-gradient text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Chat</span>
            </button>
          </div>
        ) : currentView === 'chat' ? (
          <div className="flex items-center gap-2">
            {/* Share Link Button */}
            <button
              type="button"
              onClick={onOpenShareModal}
              className="px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Share Link</span>
            </button>

            {/* Prominent Destroy Chat Button */}
            <button
              type="button"
              onClick={onOpenRevokeConfirm}
              className="px-3.5 py-2 rounded-xl btn-danger-gradient text-rose-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Permanently destroy conversation and delete messages"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400 group-hover:text-white" />
              <span>Destroy Chat</span>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
