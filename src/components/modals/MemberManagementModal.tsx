import {
  AlertTriangle,
  ArrowRightLeft,
  Check,
  Crown,
  LogOut,
  User as UserIcon,
  Users,
  X,
} from 'lucide-react';
import React, { useState } from 'react';
import type { RoomMember } from '../../types';

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSlug: string;
  members: RoomMember[];
  currentUid: string | null;
  ownerUid: string;
  onTransferOwnership: (targetUid: string) => Promise<{ success: boolean; error?: string }>;
  onLeaveRoom: () => Promise<{ success: boolean; error?: string }>;
}

export const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  isOpen,
  onClose,
  activeSlug,
  members,
  currentUid,
  ownerUid,
  onTransferOwnership,
  onLeaveRoom,
}) => {
  const [selectedRecipient, setSelectedRecipient] = useState<RoomMember | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  const [confirmLeave, setConfirmLeave] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  if (!isOpen) return null;

  const isCurrentOwner = Boolean(currentUid && (ownerUid === currentUid));

  const handleStartTransfer = (member: RoomMember) => {
    setTransferError('');
    setSelectedRecipient(member);
  };

  const handleExecuteTransfer = async () => {
    if (!selectedRecipient) return;
    setIsTransferring(true);
    setTransferError('');

    const res = await onTransferOwnership(selectedRecipient.uid);
    setIsTransferring(false);

    if (res.success) {
      setTransferSuccess(true);
      setTimeout(() => {
        setTransferSuccess(false);
        setSelectedRecipient(null);
      }, 1500);
    } else {
      setTransferError(res.error || 'Failed to transfer ownership. Please retry.');
    }
  };

  const handleExecuteLeave = async () => {
    setIsLeaving(true);
    setLeaveError('');
    const res = await onLeaveRoom();
    setIsLeaving(false);
    if (!res.success) {
      setLeaveError(res.error || 'Failed to leave room.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg p-6 rounded-2xl bg-white border border-zinc-200 shadow-2xl space-y-5 text-left text-zinc-950 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-900 flex items-center justify-center">
              <Users className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-950 tracking-tight">
                  Room Participants
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-zinc-100 text-zinc-800 border border-zinc-200">
                  {members.length}/12
                </span>
              </div>
              <p className="text-[11px] font-mono text-zinc-500">/{activeSlug}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Transfer Confirmation Sub-View */}
        {selectedRecipient ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900">
                <ArrowRightLeft className="w-4 h-4 text-zinc-700" />
                <span>Confirm Ownership Transfer</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                You are about to transfer full room ownership of{' '}
                <strong className="text-zinc-950">/{activeSlug}</strong> to{' '}
                <strong className="text-zinc-950">
                  {selectedRecipient.displayName || `User-${selectedRecipient.uid.slice(0, 4).toUpperCase()}`}
                </strong>.
              </p>
              <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  You will become a regular member. The new owner will have sole authority to manage or destroy this conversation.
                </span>
              </div>
            </div>

            {transferError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {transferError}
              </div>
            )}

            {transferSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Ownership transferred successfully!</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecipient(null)}
                disabled={isTransferring}
                className="px-3.5 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteTransfer}
                disabled={isTransferring || transferSuccess}
                className="px-4 py-2 rounded-lg bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isTransferring ? (
                  <span>Transferring...</span>
                ) : (
                  <>
                    <Crown className="w-3.5 h-3.5" />
                    <span>Confirm Transfer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Normal Members List */
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px]">
            {members.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500">
                No active participants recorded.
              </div>
            ) : (
              members.map((member) => {
                const isMe = currentUid === member.uid;
                const isOwner = member.role === 'owner' || member.uid === ownerUid;
                const name = member.displayName || `User-${member.uid.slice(0, 4).toUpperCase()}`;

                return (
                  <div
                    key={member.uid}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 hover:border-zinc-300 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center font-mono text-xs font-semibold text-zinc-800 shrink-0">
                        {name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-zinc-950 truncate max-w-[140px] sm:max-w-[200px]">
                            {name}
                          </span>
                          {isMe && (
                            <span className="text-[10px] text-zinc-500 font-medium">
                              (You)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-900 text-white">
                              <Crown className="w-2.5 h-2.5" />
                              <span>Owner</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-200 text-zinc-800">
                              <UserIcon className="w-2.5 h-2.5 text-zinc-600" />
                              <span>Member</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isCurrentOwner && !isMe && (
                        <button
                          type="button"
                          onClick={() => handleStartTransfer(member)}
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 hover:border-zinc-950 hover:bg-zinc-100 text-zinc-800 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Transfer room ownership"
                        >
                          <Crown className="w-3 h-3 text-zinc-700" />
                          <span className="hidden sm:inline">Transfer Ownership</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Footer: Leave Room Action for Regular Members */}
        {!selectedRecipient && (
          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between shrink-0">
            <div className="text-[11px] text-zinc-500">
              Capacity: <strong className="text-zinc-800">{members.length}/12 slots used</strong>
            </div>

            {!isCurrentOwner && currentUid && (
              confirmLeave ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-600">Leave room?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmLeave(false)}
                    className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-950 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteLeave}
                    disabled={isLeaving}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Confirm</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmLeave(true)}
                  className="px-3 py-1.5 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave Room</span>
                </button>
              )
            )}
          </div>
        )}

        {leaveError && (
          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            {leaveError}
          </div>
        )}
      </div>
    </div>
  );
};
