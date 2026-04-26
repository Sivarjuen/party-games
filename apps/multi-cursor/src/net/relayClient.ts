// Typed relay client matching the server's protocol exactly.

export interface Envelope {
  type: string;
  lobbyId?: string;
  from?: string;
  to?: string;
  seq?: number;
  payload?: unknown;
}

// ── Outgoing ──────────────────────────────────────────────────────────────────

export type OutgoingMessage =
  | { type: "lobby.create" }
  | { type: "lobby.join"; payload: { code: string } }
  | { type: "lobby.leave" }
  | { type: "guest.message"; payload: unknown }
  | { type: "host.message"; payload: unknown; to?: string };

// ── Incoming ──────────────────────────────────────────────────────────────────

export interface LobbyCreatedEnvelope {
  type: "lobby.created";
  lobbyId: string;
  payload: { code: string; hostId: string };
}
export interface LobbyJoinedEnvelope {
  type: "lobby.joined";
  lobbyId: string;
  payload: { code: string; hostId: string };
}
export interface PlayerJoinedEnvelope {
  type: "player.joined";
  lobbyId: string;
  payload: { playerId: string };
}
export interface PlayerLeftEnvelope {
  type: "player.left";
  lobbyId?: string;
  payload: { playerId: string };
}
export interface HostChangedEnvelope {
  type: "host.changed";
  lobbyId: string;
  payload: { hostId: string };
}
export interface GuestMessageEnvelope {
  type: "guest.message";
  lobbyId: string;
  from: string;
  payload: unknown;
}
export interface HostMessageEnvelope {
  type: "host.message";
  lobbyId: string;
  from: string;
  payload: unknown;
}
export interface ErrorEnvelope {
  type: "error";
  payload: { code: string };
}

export type IncomingEnvelope =
  | LobbyCreatedEnvelope
  | LobbyJoinedEnvelope
  | PlayerJoinedEnvelope
  | PlayerLeftEnvelope
  | HostChangedEnvelope
  | GuestMessageEnvelope
  | HostMessageEnvelope
  | ErrorEnvelope;

// ── Event map ─────────────────────────────────────────────────────────────────

type RelayEventMap = {
  [K in IncomingEnvelope["type"]]: Extract<IncomingEnvelope, { type: K }>;
} & {
  open: void;
  close: void;
};

type Listener<T> = (data: T) => void;

// ── RelayClient ───────────────────────────────────────────────────────────────

export class RelayClient {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener<unknown>>>();
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (this.ws) return;
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener("open", () => this.emit("open", undefined));
    this.ws.addEventListener("close", () => {
      this.ws = null;
      this.emit("close", undefined);
    });
    this.ws.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data as string) as IncomingEnvelope;
        this.emit(msg.type, msg);
      } catch {
        // ignore malformed
      }
    });
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  send(msg: OutgoingMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  on<K extends keyof RelayEventMap>(
    event: K,
    listener: Listener<RelayEventMap[K]>
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as Listener<unknown>);
    return () => this.off(event, listener);
  }

  off<K extends keyof RelayEventMap>(
    event: K,
    listener: Listener<RelayEventMap[K]>
  ): void {
    this.listeners.get(event)?.delete(listener as Listener<unknown>);
  }

  private emit(event: string, data: unknown): void {
    this.listeners.get(event)?.forEach((fn) => fn(data));
  }
}
