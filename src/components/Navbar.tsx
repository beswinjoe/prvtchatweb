import { Clock, Flame, Key, Moon, Share2, Shield, Sun, Terminal, Trash2, UserPlus, WifiOff } from 'lucide-react';
import React from 'react';
import { formatTimeRemaining } from '../lib/utils';
import type { AppView, RoomData } from '../types';

interface NavbarProps {
  darkMode: boolean;
  setDarkMode: (v: boolean | ((prev: boolean) => boolean)) => void;
  currentView: AppView;
  activeSlug: string;
  roomData: RoomData | null;
  isOnline: boolean;
  user: unknown;
  simulatingPeer: boolean;
  onLeaveConversation: () => void;
  onScrollToSection: (id: string) => void;
  onOpenJoinModal: () => void;
  onOpenShareModal: () => void;
  onOpenRevokeConfirm: () => void;
  onOpenSecurityModal: () => void;
  onSimulatePeerReply: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  setDarkMode,
  currentView,
  activeSlug,
  roomData,
  isOnline,
  user,
  simulatingPeer,
  onLeaveConversation,
  onScrollToSection,
  onOpenJoinModal,
  onOpenShareModal,
  onOpenRevokeConfirm,
  onOpenSecurityModal,
  onSimulatePeerReply,
}) => {
  return (
    <header className="sticky top-0 z-30 h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090B]/80 backdrop-blur-xl px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <button
          onClick={onLeaveConversation}
          className="flex items-center gap-2.5 text-left group focus:outline-none cursor-pointer"
          title="Vesper Home"
        >
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
            <Shield className="w-4 h-4 stroke-[2.3]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-sm text-zinc-900 dark:text-zinc-100">
              Vesper
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 font-medium">
              AES-256-GCM
            </span>
          </div>
        </button>

        {/* Quick Section Links on Landing Page */}
        {currentView === 'landing' && (
          <nav className="hidden md:flex items-center gap-5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            <button
              type="button"
              onClick={() => onScrollToSection('fragment-architecture')}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              #key Architecture
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection('crypto-bento')}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Live Crypto Lab
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection('threat-matrix')}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
            >
              Threat Matrix
            </button>
            <button
              type="button"
              onClick={() => onScrollToSection('verification-suite')}
              className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Verify Suite</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                6/6
              </span>
            </button>
          </nav>
        )}

        {/* Active Room Context Pill */}
        {currentView === 'chat' && activeSlug && (
          <div className="hidden md:flex items-center gap-2 pl-4 border-l border-zinc-200 dark:border-zinc-800">
            <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">room</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
              /{activeSlug}
            </span>
            {roomData?.expiresAt ? (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                <Clock className="w-3 h-3" />
                {formatTimeRemaining(roomData.expiresAt)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 rounded-md">
                <Flame className="w-3 h-3 text-emerald-500" />
                Burn on revoke
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* WebCrypto & Transport Status Pill */}
        <div
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
            isOnline && user
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
          }`}
          title={isOnline ? 'WebCrypto & Real-Time Zero-Knowledge Relay Active' : 'Offline — reconnecting'}
        >
          {isOnline && user ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>WebCrypto Ready</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Reconnecting</span>
            </>
          )}
        </div>

        {currentView === 'landing' && (
          <button
            type="button"
            onClick={onOpenJoinModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 hover:bg-zinc-200/80 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-emerald-500" />
            <span>Join Room</span>
          </button>
        )}

        {currentView === 'chat' && (
          <>
            <button
              type="button"
              onClick={onSimulatePeerReply}
              disabled={simulatingPeer}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 transition-colors cursor-pointer disabled:opacity-50"
              title="Simulate a second participant encrypting and sending a message to this room"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {simulatingPeer ? 'Peer Encrypting...' : 'Simulate Peer Reply'}
              </span>
            </button>

            <button
              onClick={onOpenShareModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-950 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Invite Link</span>
            </button>

            <button
              onClick={onOpenRevokeConfirm}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
              title="Destroy and revoke this conversation immediately"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Revoke</span>
            </button>
          </>
        )}

        <button
          onClick={onOpenSecurityModal}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
          title="Inspect cryptographic specification & threat model"
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden lg:inline">Spec</span>
        </button>

        <button
          onClick={() => setDarkMode((prev) => !prev)}
          className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
          aria-label="Toggle color theme"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
