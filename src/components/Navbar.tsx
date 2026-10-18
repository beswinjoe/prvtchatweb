import {
  Clock,
  Lock,
  LogOut,
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
  isOwner?: boolean;
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
  isOwner = false,
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
      role="banner"
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isLanding
          ? 'h-20 bg-transparent px-4 sm:px-8 lg:px-12 flex items-center justify-between'
          : 'h-16 border-b border-zinc-200/80 bg-white/95 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs'
      }`}
    >
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          id="navbar-brand"
          onClick={onLeaveConversation}
          className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
          title="PRVTCHAT Home"
          aria-label="Return to PRVTCHAT homepage"
        >
          <div
            className={`flex items-center justify-center transition-all duration-200 ${
              isLanding
                ? 'w-8 h-8 rounded-full bg-[#0B0F19] text-white group-hover:bg-[#182234] group-hover:scale-105 shadow-xs'
                : 'w-7 h-7 rounded-lg bg-zinc-950 text-white group-hover:bg-zinc-800 group-hover:scale-105'
            }`}
          >
            <Lock className="w-3.5 h-3.5 stroke-[2.4]" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`font-bold tracking-tight transition-colors ${
                isLanding ? 'text-lg sm:text-xl text-[#0B132B]' : 'text-base text-zinc-950'
              }`}
            >
              PRVTCHAT
            </span>
            {!isLanding && (
              <span className="hidden sm:inline-block text-[10px] font-mono tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium">
                E2EE
              </span>
            )}
          </div>
        </button>

        {/* In-Chat Room Slug Badge */}
        {currentView === 'chat' && activeSlug && (
          <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-zinc-200 text-xs font-mono text-zinc-600 animate-fade-in">
            <span>room:</span>
            <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-900 font-semibold">
              /{activeSlug}
            </span>
          </div>
        )}
      </div>

      {/* Landing Center Navigation Links */}
      {isLanding && (
        <nav className="hidden md:flex items-center gap-7 lg:gap-9 text-sm font-medium text-[#0B132B]/85" aria-label="Main navigation">
          <button
            type="button"
            id="nav-features"
            onClick={() => onOpenSecurityModal('features')}
            className="hover:text-[#0B132B] transition-colors duration-200 cursor-pointer relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-[#0B132B] hover:after:w-full after:transition-all after:duration-300"
          >
            Features
          </button>
          <button
            type="button"
            id="nav-how-it-works"
            onClick={() => onOpenSecurityModal('how-it-works')}
            className="hover:text-[#0B132B] transition-colors duration-200 cursor-pointer relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-[#0B132B] hover:after:w-full after:transition-all after:duration-300"
          >
            How it works
          </button>
          <button
            type="button"
            id="nav-who-its-for"
            onClick={() => onOpenSecurityModal('who-its-for')}
            className="hover:text-[#0B132B] transition-colors duration-200 cursor-pointer relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-[#0B132B] hover:after:w-full after:transition-all after:duration-300"
          >
            Who it's for
          </button>
          <button
            type="button"
            id="nav-privacy"
            onClick={() => onOpenSecurityModal('privacy')}
            className="hover:text-[#0B132B] transition-colors duration-200 cursor-pointer relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-[#0B132B] hover:after:w-full after:transition-all after:duration-300"
          >
            Privacy
          </button>
          <button
            type="button"
            id="nav-faq"
            onClick={() => onOpenSecurityModal('faq')}
            className="hover:text-[#0B132B] transition-colors duration-200 cursor-pointer relative after:absolute after:bottom-[-2px] after:left-0 after:w-0 after:h-[2px] after:bg-[#0B132B] hover:after:w-full after:transition-all after:duration-300"
          >
            FAQ
          </button>
        </nav>
      )}

      {/* Center: Live Expiration Countdown (In Chat) */}
      {currentView === 'chat' && timeLeft && (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-xs font-mono text-zinc-700 animate-fade-in">
          <Clock className="w-3.5 h-3.5 text-zinc-500" />
          <span>{timeLeft}</span>
        </div>
      )}

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {!isOnline && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium animate-fade-in" role="status">
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
              id="navbar-coffee"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFDD00] text-[#0B132B] text-xs font-bold hover:scale-105 active:scale-95 transition-all duration-200 no-underline shadow-sm hover:shadow-md"
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
              id="navbar-have-link"
              onClick={onOpenJoinModal}
              className="text-xs font-medium text-[#0B132B] hover:text-black px-3 py-1.5 transition-colors duration-200 cursor-pointer hidden sm:block"
            >
              Have a link?
            </button>
            <button
              type="button"
              id="navbar-enter-workspace"
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
              id="navbar-share"
              onClick={onOpenShareModal}
              className="px-3.5 py-1.5 rounded-lg btn-outline text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all duration-200"
            >
              <Share2 className="w-3.5 h-3.5 text-zinc-600" />
              <span className="hidden sm:inline">Share Link</span>
            </button>

            {/* Role-governed action: Owner destroys, Member leaves */}
            {isOwner ? (
              <button
                type="button"
                id="navbar-destroy"
                onClick={onOpenRevokeConfirm}
                className="px-3.5 py-1.5 rounded-lg btn-danger text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-all duration-200"
                title="Permanently destroy conversation and delete messages (Owner only)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Destroy Chat</span>
              </button>
            ) : (
              <button
                type="button"
                id="navbar-leave"
                onClick={onLeaveConversation}
                className="px-3.5 py-1.5 rounded-lg btn-outline text-xs font-medium text-zinc-700 hover:text-zinc-950 hover:bg-zinc-100 flex items-center gap-1.5 cursor-pointer transition-all duration-200"
                title="Leave conversation"
              >
                <LogOut className="w-3.5 h-3.5 text-zinc-600" />
                <span>Leave Chat</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
};
