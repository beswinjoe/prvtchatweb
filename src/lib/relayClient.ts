// =============================================================================
// PRVTCHAT RAM-ONLY WEBSOCKET RELAY CLIENT ADAPTER
// =============================================================================

import type { EncryptedMessage, PresenceRecord, RoomData } from '../types';

export type RelayEvent =
  | { type: 'room_created'; room: RoomData }
  | { type: 'room_joined'; room: RoomData; messages: EncryptedMessage[]; presence: PresenceRecord[] }
  | { type: 'new_message'; message: EncryptedMessage }
  | { type: 'reaction_updated'; update: { messageId: string; reactionsIv?: string; reactionsCiphertext?: string; reactionsUpdatedAt: number } }
  | { type: 'presence_update'; presence: PresenceRecord[] }
  | { type: 'room_destroyed'; reason: 'revoked' | 'expired'; slug: string }
  | { type: 'error'; error: string };

export class RelayClient {
  private ws: WebSocket | null = null;
  private url: string;
  private messageListeners = new Set<(msg: EncryptedMessage) => void>();
  private presenceListeners = new Set<(presence: PresenceRecord[]) => void>();
  private reactionListeners = new Set<(update: { messageId: string; reactionsIv?: string; reactionsCiphertext?: string; reactionsUpdatedAt: number }) => void>();
  private destroyListeners = new Set<(reason: 'revoked' | 'expired') => void>();
  private statusListeners = new Set<(connected: boolean) => void>();
  private activeSlug: string = '';
  private currentUid: string = '';
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(relayUrl?: string) {
    const defaultUrl =
      typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:4040`
        : 'ws://localhost:4040';
    this.url = relayUrl || import.meta.env.VITE_RELAY_WS_URL || defaultUrl;
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public connect(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          this.notifyStatus(true);
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const data: RelayEvent = JSON.parse(event.data);
            this.handleEvent(data);
          } catch {
            // Ignore malformed payloads
          }
        };

        this.ws.onclose = () => {
          this.notifyStatus(false);
          resolve(false);
        };

        this.ws.onerror = () => {
          this.notifyStatus(false);
          resolve(false);
        };
      } catch {
        resolve(false);
      }
    });
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // Ignore
      }
      this.ws = null;
    }
    this.notifyStatus(false);
  }

  public async createRoom(params: {
    slug: string;
    creatorUid: string;
    expiresAt: number;
    keyCommitment: string;
    allowPeerRevoke?: boolean;
  }): Promise<{ success: boolean; error?: string; room?: RoomData }> {
    if (!this.isConnected()) {
      const ok = await this.connect();
      if (!ok) return { success: false, error: 'Cannot connect to RAM-only relay server.' };
    }

    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        try {
          const res = JSON.parse(event.data);
          if (res.type === 'room_created') {
            this.ws?.removeEventListener('message', handler);
            this.activeSlug = params.slug;
            this.currentUid = params.creatorUid;
            resolve({ success: true, room: res.room });
          } else if (res.type === 'error') {
            this.ws?.removeEventListener('message', handler);
            resolve({ success: false, error: res.error });
          }
        } catch {
          // Ignore
        }
      };

      this.ws?.addEventListener('message', handler);
      this.send({ type: 'create_room', ...params });
    });
  }

  public async joinRoom(
    slug: string,
    uid: string,
  ): Promise<{ success: boolean; error?: string; room?: RoomData; messages?: EncryptedMessage[]; presence?: PresenceRecord[] }> {
    if (!this.isConnected()) {
      const ok = await this.connect();
      if (!ok) return { success: false, error: 'Cannot connect to RAM-only relay server.' };
    }

    return new Promise((resolve) => {
      const handler = (event: MessageEvent) => {
        try {
          const res = JSON.parse(event.data);
          if (res.type === 'room_joined') {
            this.ws?.removeEventListener('message', handler);
            this.activeSlug = slug;
            this.currentUid = uid;
            resolve({
              success: true,
              room: res.room,
              messages: res.messages,
              presence: res.presence,
            });
          } else if (res.type === 'error') {
            this.ws?.removeEventListener('message', handler);
            resolve({ success: false, error: res.error });
          }
        } catch {
          // Ignore
        }
      };

      this.ws?.addEventListener('message', handler);
      this.send({ type: 'join_room', slug, uid });
    });
  }

  public postMessage(message: EncryptedMessage): void {
    this.send({ type: 'post_message', message });
  }

  public toggleReaction(update: {
    messageId: string;
    reactionsIv?: string;
    reactionsCiphertext?: string;
    reactionsUpdatedAt: number;
  }): void {
    this.send({ type: 'toggle_reaction', update });
  }

  public sendPresence(isTyping: boolean, lastSeen: number = Date.now()): void {
    if (!this.activeSlug || !this.currentUid) return;
    this.send({
      type: 'presence',
      presence: {
        uid: this.currentUid,
        isTyping,
        lastSeen,
      },
    });
  }

  public revokeRoom(): void {
    if (!this.activeSlug) return;
    this.send({ type: 'revoke_room', uid: this.currentUid });
  }

  public leaveRoom(): void {
    if (this.activeSlug) {
      this.send({ type: 'leave_room' });
      this.activeSlug = '';
    }
  }

  public onMessage(cb: (msg: EncryptedMessage) => void): () => void {
    this.messageListeners.add(cb);
    return () => this.messageListeners.delete(cb);
  }

  public onPresence(cb: (presence: PresenceRecord[]) => void): () => void {
    this.presenceListeners.add(cb);
    return () => this.presenceListeners.delete(cb);
  }

  public onReaction(cb: (update: { messageId: string; reactionsIv?: string; reactionsCiphertext?: string; reactionsUpdatedAt: number }) => void): () => void {
    this.reactionListeners.add(cb);
    return () => this.reactionListeners.delete(cb);
  }

  public onRoomDestroyed(cb: (reason: 'revoked' | 'expired') => void): () => void {
    this.destroyListeners.add(cb);
    return () => this.destroyListeners.delete(cb);
  }

  public onConnectionChange(cb: (connected: boolean) => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private send(data: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleEvent(event: RelayEvent): void {
    switch (event.type) {
      case 'new_message':
        this.messageListeners.forEach((cb) => cb(event.message));
        break;
      case 'reaction_updated':
        this.reactionListeners.forEach((cb) => cb(event.update));
        break;
      case 'presence_update':
        this.presenceListeners.forEach((cb) => cb(event.presence));
        break;
      case 'room_destroyed':
        this.destroyListeners.forEach((cb) => cb(event.reason));
        break;
    }
  }

  private notifyStatus(connected: boolean): void {
    this.statusListeners.forEach((cb) => cb(connected));
  }
}

export const relayClient = new RelayClient();
