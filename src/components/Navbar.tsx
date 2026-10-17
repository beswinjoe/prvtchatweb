import {
  Clock,
  Lock,
  Share2,
  Trash2,
  WifiOff,
} from 'lucide-react';
import React from 'react';
import { formatTimeRemaining } from '../lib/expiry';
import type { AppView, RoomData } from '../types';
import type { InfoModalTab } from './modals/SecurityModal';

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
  onOpenSecurityModal: (tab?: InfoModalTab) => void;
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

  const isLanding = currentView === 'landing';

  return (
    <header
      className={`sticky top-0 z-40 transition-colors ${
        isLanding
          ? 'h-20 bg-[#5B9EEA] px-4 sm:px-8 lg:px-12 flex items-center justify-between'
          : 'h-16 border-b border-zinc-200 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between'
      }`}
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onLeaveConversation}
          className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
          title="PRVTCHAT Home"
        >
          <div
            className={`flex items-center justify-center transition-colors ${
              isLanding
                ? 'w-8 h-8 rounded-full bg-[#0B0F19] text-white group-hover:bg-[#182234] shadow-xs'
                : 'w-7 h-7 rounded-lg bg-zinc-950 text-white group-hover:bg-zinc-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5 stroke-[2.4]" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-bold tracking-tight ${
                isLanding ? 'text-lg sm:text-xl text-[#0B132B]' : 'text-base text-zinc-950'
              }`}
            >
              PRVTCHAT
            </span>
            {!isLanding && (
              <span className="hidden sm:inline-block text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200 font-medium">
                E2EE
              </span>
            )}
          </div>
        </button>

        {/* In-Chat Room Slug Badge */}
        {currentView === 'chat' && activeSlug && (
          <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-zinc-200 text-xs font-mono text-zinc-600">
            <span>room:</span>
            <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-900 font-semibold">
              /{activeSlug}
            </span>
          </div>
        )}
      </div>

      {/* Landing Center Navigation Links (Matching Screenshot) */}
      {isLanding && (
        <nav className="hidden md:flex items-center gap-7 lg:gap-9 text-sm font-medium text-[#0B132B]/85">
          <button
            type="button"
            onClick={() => onOpenSecurityModal('features')}
            className="hover:text-[#0B132B] transition-colors cursor-pointer"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => onOpenSecurityModal('how-it-works')}
            className="hover:text-[#0B132B] transition-colors cursor-pointer"
          >
            How it works
          </button>
          <button
            type="button"
            onClick={() => onOpenSecurityModal('who-its-for')}
            className="hover:text-[#0B132B] transition-colors cursor-pointer"
          >
            Who it's for
          </button>
          <button
            type="button"
            onClick={() => onOpenSecurityModal('privacy')}
            className="hover:text-[#0B132B] transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <button
            type="button"
            onClick={() => onOpenSecurityModal('faq')}
            className="hover:text-[#0B132B] transition-colors cursor-pointer"
          >
            FAQ
          </button>
        </nav>
      )}

      {/* Center: Live Expiration Countdown (In Chat) */}
      {currentView === 'chat' && timeLeft && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-700">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>{timeLeft}</span>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {isLanding ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="https://buymeacoffee.com/beswinjoe"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFDD00] text-[#0B132B] text-xs font-bold hover:scale-105 active:scale-95 transition-all duration-200 no-underline shadow-sm"
            >
              <span>☕</span>
              Buy Me a Coffee
            </a>
            <a
              href="https://buymeacoffee.com/beswinjoe"
              target="_blank"
              rel="noopener noreferrer"
              className="sm:hidden inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#FFDD00] text-base hover:scale-110 active:scale-95 transition-all duration-200 no-underline shadow-sm"
              title="Buy Me a Coffee"
            >
              ☕
            </a>
            <button
              type="button"
              onClick={onOpenJoinModal}
              className="text-xs font-medium text-[#0B132B] hover:text-black px-3 py-1.5 transition-colors cursor-pointer hidden sm:block"
            >
              Have a link?
            </button>
            <button
              type="button"
              onClick={onOpenCreateModal}
              className="btn-pill-black px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-semibold cursor-pointer shadow-xs"
            >
              Enter Workspace
            </button>
          </div>
        ) : currentView === 'chat' ? (
          <div className="flex items-center gap-2">
            {/* Share Link Button */}
            <button
              type="button"
              onClick={onOpenShareModal}
              className="px-3.5 py-1.5 rounded-lg btn-outline text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-zinc-600" />
              <span className="hidden sm:inline">Share Link</span>
            </button>

            {/* Accessible Destroy Chat Button */}
            <button
              type="button"
              onClick={onOpenRevokeConfirm}
              className="px-3.5 py-1.5 rounded-lg btn-danger text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              title="Permanently destroy conversation and delete messages"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Destroy Chat</span>
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
