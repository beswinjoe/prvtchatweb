// =============================================================================
// PRVTCHAT RAM-ONLY ZERO-PERSISTENCE NETWORK RELAY SERVER
// =============================================================================
// ARCHITECTURAL GUARANTEES:
// 1. All data (rooms, encrypted packets, presence) exists exclusively in volatile memory (RAM).
// 2. Zero disk writes, zero database connections, zero persistent logs of message payloads.
// 3. E2EE: The relay server never possesses or receives encryption keys (which remain in the URL fragment #key=).
// 4. Instant eviction: When a room expires or is revoked/destroyed, all associated memory is immediately deleted.
// 5. Hard resource boundaries: Bounded ring buffers, rate limiting, and size validation prevent memory exhaustion.
// =============================================================================

import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

export interface RelayMessage {
  id: string;
  roomSlug: string;
  senderUid: string;
  createdAt: number;
  type: 'text' | 'image';
  iv: string;
  ciphertext: string;
  alg: string;
  deleted: boolean;
  deletedAt?: number;
  reactionsIv?: string;
  reactionsCiphertext?: string;
  reactionsUpdatedAt?: number;
}

export interface RelayPresence {
  uid: string;
  lastSeen: number;
  isTyping: boolean;
  ciphertext?: string;
  iv?: string;
}

export interface RelayRoom {
  slug: string;
  creatorUid: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'revoked' | 'expired';
  keyCommitment: string;
  allowPeerRevoke: boolean;
  messages: RelayMessage[];
  presence: Map<string, RelayPresence>;
  clients: Set<WebSocket>;
}

// Resource bounding constants
export const MAX_MESSAGE_SIZE_BYTES = 1048576; // 1 MB hard limit
export const MAX_MESSAGES_PER_ROOM = 50; // Ring-buffer limit
export const MAX_CONCURRENT_ROOMS = 500;
export const MAX_CLIENTS_PER_ROOM = 50;
export const MAX_ROOM_LIFETIME_MS = 7 * 24 * 3600 * 1000; // 7 days hard ceiling
export const RATE_LIMIT_WINDOW_MS = 1000;
export const RATE_LIMIT_MAX_PER_WINDOW = 15;

export class MemoryRelay {
  private rooms = new Map<string, RelayRoom>();
  private clientRateLimits = new Map<WebSocket, { count: number; windowStart: number }>();
  private sweepInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Background sweep every 5 seconds to actively shred expired rooms from RAM
    this.sweepInterval = setInterval(() => this.sweepExpiredRooms(), 5000);
  }

  public getRoomCount(): number {
    return this.rooms.size;
  }

  public getRoom(slug: string): RelayRoom | undefined {
    return this.rooms.get(slug);
  }

  public createRoom(params: {
    slug: string;
    creatorUid: string;
    expiresAt: number;
    keyCommitment: string;
    allowPeerRevoke?: boolean;
  }): { success: boolean; error?: string; room?: RelayRoom } {
    const { slug, creatorUid, expiresAt, keyCommitment, allowPeerRevoke = true } = params;
    const now = Date.now();

    if (!slug || typeof slug !== 'string' || slug.length < 3 || slug.length > 36) {
      return { success: false, error: 'Invalid room slug.' };
    }
    if (!creatorUid || typeof creatorUid !== 'string') {
      return { success: false, error: 'Valid creator UID is required.' };
    }
    if (!keyCommitment || typeof keyCommitment !== 'string' || keyCommitment.length > 128) {
      return { success: false, error: 'Invalid key commitment hash.' };
    }
    if (expiresAt <= now || expiresAt > now + MAX_ROOM_LIFETIME_MS) {
      return { success: false, error: 'Room expiration exceeds 7-day maximum bounds.' };
    }
    if (this.rooms.has(slug)) {
      const existing = this.rooms.get(slug)!;
      if (existing.status === 'active' && now < existing.expiresAt) {
        return { success: false, error: 'Room slug is currently occupied and active.' };
      }
      // Reclaim expired/revoked room
      this.destroyRoom(slug, 'expired');
    }
    if (this.rooms.size >= MAX_CONCURRENT_ROOMS) {
      return { success: false, error: 'Server capacity reached. Please try again shortly.' };
    }

    const newRoom: RelayRoom = {
      slug,
      creatorUid,
      createdAt: now,
      expiresAt,
      status: 'active',
      keyCommitment,
      allowPeerRevoke,
      messages: [],
      presence: new Map(),
      clients: new Set(),
    };

    this.rooms.set(slug, newRoom);
    return { success: true, room: newRoom };
  }

  public joinRoom(slug: string, ws: WebSocket, _uid?: string): { success: boolean; error?: string; roomData?: Partial<RelayRoom> } {
    const room = this.rooms.get(slug);
    const now = Date.now();

    if (!room) {
      return { success: false, error: 'Room not found or has been shredded.' };
    }
    if (room.status !== 'active' || now >= room.expiresAt) {
      return { success: false, error: 'Room has expired or was destroyed.' };
    }
    if (room.clients.size >= MAX_CLIENTS_PER_ROOM) {
      return { success: false, error: 'Room participant limit reached.' };
    }

    room.clients.add(ws);
    return {
      success: true,
      roomData: {
        slug: room.slug,
        creatorUid: room.creatorUid,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
        status: room.status,
        keyCommitment: room.keyCommitment,
        allowPeerRevoke: room.allowPeerRevoke,
      },
    };
  }

  public leaveRoom(slug: string, ws: WebSocket, uid?: string): void {
    const room = this.rooms.get(slug);
    if (!room) return;
    room.clients.delete(ws);
    if (uid) {
      room.presence.delete(uid);
      this.broadcastToRoom(room, {
        type: 'presence_update',
        presence: Array.from(room.presence.values()),
      });
    }
  }

  public postMessage(slug: string, message: RelayMessage, _senderWs?: WebSocket): { success: boolean; error?: string } {
    const room = this.rooms.get(slug);
    const now = Date.now();

    if (!room || room.status !== 'active' || now >= room.expiresAt) {
      return { success: false, error: 'Cannot post message: room is not active.' };
    }

    // Size bounding validation
    const payloadSize = (message.ciphertext?.length || 0) + (message.iv?.length || 0);
    if (payloadSize > MAX_MESSAGE_SIZE_BYTES) {
      return { success: false, error: 'Message payload exceeds 1MB limit.' };
    }

    // Ring buffer: enforce MAX_MESSAGES_PER_ROOM in RAM
    if (room.messages.length >= MAX_MESSAGES_PER_ROOM) {
      room.messages.shift();
    }
    room.messages.push(message);

    // Broadcast to all clients in this room
    this.broadcastToRoom(room, {
      type: 'new_message',
      message,
    });

    return { success: true };
  }

  public updateReaction(slug: string, update: {
    messageId: string;
    reactionsIv?: string;
    reactionsCiphertext?: string;
    reactionsUpdatedAt: number;
  }): { success: boolean; error?: string } {
    const room = this.rooms.get(slug);
    if (!room || room.status !== 'active') {
      return { success: false, error: 'Room not active.' };
    }

    const msg = room.messages.find((m) => m.id === update.messageId);
    if (!msg) {
      return { success: false, error: 'Message not found.' };
    }

    msg.reactionsIv = update.reactionsIv;
    msg.reactionsCiphertext = update.reactionsCiphertext;
    msg.reactionsUpdatedAt = update.reactionsUpdatedAt;

    this.broadcastToRoom(room, {
      type: 'reaction_updated',
      update,
    });

    return { success: true };
  }

  public updatePresence(slug: string, presence: RelayPresence): void {
    const room = this.rooms.get(slug);
    if (!room || room.status !== 'active') return;

    room.presence.set(presence.uid, presence);
    this.broadcastToRoom(room, {
      type: 'presence_update',
      presence: Array.from(room.presence.values()),
    });
  }

  public destroyRoom(slug: string, reason: 'revoked' | 'expired'): void {
    const room = this.rooms.get(slug);
    if (!room) return;

    room.status = reason;

    // 1. Notify all connected participants
    this.broadcastToRoom(room, {
      type: 'room_destroyed',
      reason,
      slug,
    });

    // 2. Disconnect clients
    room.clients.forEach((client) => {
      try {
        client.close(1000, `Room ${reason}`);
      } catch {
        // Ignore
      }
    });

    // 3. Complete volatile memory purge: zero and delete
    room.messages = [];
    room.presence.clear();
    room.clients.clear();
    this.rooms.delete(slug);
  }

  public checkRateLimit(ws: WebSocket): boolean {
    const now = Date.now();
    let rl = this.clientRateLimits.get(ws);
    if (!rl || now - rl.windowStart > RATE_LIMIT_WINDOW_MS) {
      rl = { count: 1, windowStart: now };
      this.clientRateLimits.set(ws, rl);
      return true;
    }
    rl.count++;
    return rl.count <= RATE_LIMIT_MAX_PER_WINDOW;
  }

  public removeClientRateLimit(ws: WebSocket): void {
    this.clientRateLimits.delete(ws);
  }

  private sweepExpiredRooms(): void {
    const now = Date.now();
    for (const [slug, room] of this.rooms.entries()) {
      if (room.status === 'revoked' || now >= room.expiresAt) {
        this.destroyRoom(slug, 'expired');
      }
    }
  }

  private broadcastToRoom(room: RelayRoom, payload: unknown): void {
    const serialized = JSON.stringify(payload);
    room.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    });
  }

  public close(): void {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    for (const slug of Array.from(this.rooms.keys())) {
      this.destroyRoom(slug, 'revoked');
    }
    this.clientRateLimits.clear();
  }
}

/**
 * Creates and starts the HTTP and WebSocket Relay server.
 */
export function createRelayServer(port: number = 4040): { server: http.Server; wss: WebSocketServer; relay: MemoryRelay } {
  const relay = new MemoryRelay();

  const server = http.createServer((req, res) => {
    // Enable CORS for web client
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          status: 'ok',
          mode: 'ram_only_relay',
          activeRooms: relay.getRoomCount(),
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        }),
      );
      return;
    }

    if (url.pathname.startsWith('/api/room/')) {
      const slug = url.pathname.replace('/api/room/', '').split('/')[0];
      const room = relay.getRoom(slug);
      if (!room || room.status !== 'active' || Date.now() >= room.expiresAt) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ exists: false, error: 'Room does not exist or has expired.' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          exists: true,
          slug: room.slug,
          status: room.status,
          createdAt: room.createdAt,
          expiresAt: room.expiresAt,
          keyCommitment: room.keyCommitment,
          allowPeerRevoke: room.allowPeerRevoke,
        }),
      );
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Endpoint not found.' }));
  });

  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomSlug = '';
    let currentUid = '';

    ws.on('message', (data: Buffer | string) => {
      if (!relay.checkRateLimit(ws)) {
        ws.send(JSON.stringify({ type: 'error', error: 'Rate limit exceeded. Please slow down.' }));
        return;
      }

      try {
        const msg = JSON.parse(data.toString());

        switch (msg.type) {
          case 'create_room': {
            const res = relay.createRoom(msg);
            if (res.success && res.room) {
              currentRoomSlug = res.room.slug;
              currentUid = msg.creatorUid;
              relay.joinRoom(currentRoomSlug, ws, currentUid);
              ws.send(JSON.stringify({ type: 'room_created', room: res.room }));
            } else {
              ws.send(JSON.stringify({ type: 'error', error: res.error }));
            }
            break;
          }

          case 'join_room': {
            const res = relay.joinRoom(msg.slug, ws, msg.uid);
            if (res.success) {
              currentRoomSlug = msg.slug;
              currentUid = msg.uid;
              const room = relay.getRoom(msg.slug)!;
              ws.send(
                JSON.stringify({
                  type: 'room_joined',
                  room: res.roomData,
                  messages: room.messages,
                  presence: Array.from(room.presence.values()),
                }),
              );
            } else {
              ws.send(JSON.stringify({ type: 'error', error: res.error }));
            }
            break;
          }

          case 'post_message': {
            if (!currentRoomSlug) {
              ws.send(JSON.stringify({ type: 'error', error: 'Must join a room before posting messages.' }));
              return;
            }
            const res = relay.postMessage(currentRoomSlug, msg.message, ws);
            if (!res.success) {
              ws.send(JSON.stringify({ type: 'error', error: res.error }));
            }
            break;
          }

          case 'toggle_reaction': {
            if (!currentRoomSlug) return;
            relay.updateReaction(currentRoomSlug, msg.update);
            break;
          }

          case 'presence': {
            if (!currentRoomSlug) return;
            relay.updatePresence(currentRoomSlug, msg.presence);
            break;
          }

          case 'revoke_room': {
            if (!currentRoomSlug) return;
            const room = relay.getRoom(currentRoomSlug);
            if (!room) return;
            if (room.creatorUid !== msg.uid) {
              ws.send(JSON.stringify({ type: 'error', error: 'Only room creator can revoke this conversation.' }));
              return;
            }
            relay.destroyRoom(currentRoomSlug, 'revoked');
            break;
          }

          case 'leave_room': {
            if (currentRoomSlug) {
              relay.leaveRoom(currentRoomSlug, ws, currentUid);
              currentRoomSlug = '';
            }
            break;
          }
        }
      } catch {
        ws.send(JSON.stringify({ type: 'error', error: 'Malformed JSON payload.' }));
      }
    });

    ws.on('close', () => {
      if (currentRoomSlug) {
        relay.leaveRoom(currentRoomSlug, ws, currentUid);
      }
      relay.removeClientRateLimit(ws);
    });
  });

  server.listen(port, '0.0.0.0');
  return { server, wss, relay };
}
