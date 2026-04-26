import { Scene, GameObjects } from "phaser";
import type { RelayClient } from "../../net/relayClient";
import type { GameSceneData } from "./LobbyScene";

// ── Cursor payload types ──────────────────────────────────────────────────────

interface CursorMovePayload {
  type: "cursor.move";
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
}

interface PresenceStatePayload {
  type: "presence.state";
  cursors: Record<string, { x: number; y: number }>;
}

type GamePayload = CursorMovePayload | PresenceStatePayload;

// ── Remote player state ───────────────────────────────────────────────────────

interface RemotePlayer {
  targetX: number;
  targetY: number;
  dot: GameObjects.Arc;
  label: GameObjects.Text;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const W = 1920;
const H = 1080;
const SEND_INTERVAL_MS = 50; // 20 Hz — no rate limiting on server
const LOCAL_COLOR = 0x44ff88;
const REMOTE_COLORS = [0xff4444, 0x44aaff, 0xffaa00, 0xcc44ff, 0xff88cc];

export class MainScene extends Scene {
  // Relays
  private relay!: RelayClient;
  private lobbyId!: string;
  private myId!: string;
  private hostId!: string;
  private isHost!: boolean;

  // Presence (host only — authoritative map)
  private authoritative = new Map<string, { x: number; y: number }>();

  // Remote cursors (all players)
  private remotePlayers = new Map<string, RemotePlayer>();
  private colorIndex = 0;

  // Local cursor
  private localDot!: GameObjects.Arc;
  private localX = 0.5;
  private localY = 0.5;
  private sendTimer = 0;

  // HUD
  private hudText!: GameObjects.Text;
  private statusText!: GameObjects.Text;

  // Cleanup
  private unsubscribers: Array<() => void> = [];
  private _onMouseMove: ((e: MouseEvent) => void) | null = null;

  constructor() {
    super("MainScene");
  }

  init(data: GameSceneData): void {
    this.relay = data.relay;
    this.lobbyId = data.lobbyId;
    this.hostId = data.hostId;
    this.myId = data.myId;
    this.isHost = data.isHost;
  }

  create(): void {
    this.add.rectangle(W / 2, H / 2, W, H, 0x180e23);

    // Local cursor dot
    this.localDot = this.add.circle(W / 2, H / 2, 10, LOCAL_COLOR).setDepth(10);

    // HUD
    this.hudText = this.add
      .text(20, 20, "", { fontFamily: "Consolas", fontSize: 22, color: "#ffffff" })
      .setAlpha(0.8)
      .setDepth(20);

    this.statusText = this.add
      .text(W / 2, H - 40, "", {
        fontFamily: "Consolas",
        fontSize: 18,
        color: "#aaaaaa",
        align: "center",
      })
      .setOrigin(0.5, 1)
      .setDepth(20);

    this.updateHUD();

    this.game.canvas.style.cursor = "none";

    // Track mouse via native event so we always get updates regardless of
    // Phaser's input hit-testing. Coordinates are converted to game-space.
    const canvas = this.game.canvas;
    this._onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = W / rect.width;
      const scaleY = H / rect.height;
      const gx = (e.clientX - rect.left) * scaleX;
      const gy = (e.clientY - rect.top) * scaleY;
      this.localDot.setPosition(gx, gy);
      this.localX = gx / W;
      this.localY = gy / H;
      if (this.isHost) {
        this.authoritative.set(this.myId, { x: this.localX, y: this.localY });
      }
    };
    canvas.addEventListener("mousemove", this._onMouseMove);

    // Seed host's own position so guests see it immediately
    if (this.isHost) {
      this.authoritative.set(this.myId, { x: 0.5, y: 0.5 });
    }

    this.bindRelayEvents();
  }

  update(_time: number, delta: number): void {
    this.sendTimer += delta;
    if (this.sendTimer >= SEND_INTERVAL_MS) {
      this.sendTimer = 0;
      this.sendCursorUpdate();
    }

    // Interpolate remote cursors — frame-rate independent, snaps when close
    const t = 1 - Math.pow(0.01, delta / 150); // reaches ~99% in ~150ms
    this.remotePlayers.forEach((player) => {
      const dx = player.targetX - player.dot.x;
      const dy = player.targetY - player.dot.y;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) {
        player.dot.setPosition(player.targetX, player.targetY);
      } else {
        player.dot.setPosition(player.dot.x + dx * t, player.dot.y + dy * t);
      }
      player.label.setPosition(player.dot.x + 14, player.dot.y - 14);
    });
  }

  // ── Relay events ──────────────────────────────────────────────────────────

  private bindRelayEvents(): void {
    const offJoined = this.relay.on("player.joined", (msg) => {
      if (msg.lobbyId !== this.lobbyId) return;
      const pid = msg.payload.playerId;
      if (!this.remotePlayers.has(pid)) {
        this.spawnRemotePlayer(pid);
        this.updateHUD();
      }
      // Host: seed their position so they appear immediately
      if (this.isHost && !this.authoritative.has(pid)) {
        this.authoritative.set(pid, { x: 0.5, y: 0.5 });
      }
    });

    const offLeft = this.relay.on("player.left", (msg) => {
      const pid = msg.payload.playerId;
      this.removeRemotePlayer(pid);
      this.authoritative.delete(pid);
      this.updateHUD();
    });

    const offHostChanged = this.relay.on("host.changed", (msg) => {
      if (msg.lobbyId !== this.lobbyId) return;
      this.hostId = msg.payload.hostId;
      this.isHost = this.myId === this.hostId;
      this.updateHUD();
    });

    this.unsubscribers.push(offJoined, offLeft, offHostChanged);

    if (this.isHost) {
      this.bindHostEvents();
    } else {
      this.bindGuestEvents();
    }
  }

  private bindHostEvents(): void {
    const offGuest = this.relay.on("guest.message", (msg) => {
      if (msg.lobbyId !== this.lobbyId) return;
      const payload = msg.payload as GamePayload;
      if (payload.type !== "cursor.move") return;

      const pid = msg.from;
      this.authoritative.set(pid, { x: payload.x, y: payload.y });

      if (!this.remotePlayers.has(pid)) {
        this.spawnRemotePlayer(pid);
        this.updateHUD();
      }

      // Update the remote player's lerp target directly
      const player = this.remotePlayers.get(pid);
      if (player) {
        player.targetX = payload.x * W;
        player.targetY = payload.y * H;
      }
    });
    this.unsubscribers.push(offGuest);
  }

  private bindGuestEvents(): void {
    const offHost = this.relay.on("host.message", (msg) => {
      if (msg.lobbyId !== this.lobbyId) return;
      const payload = msg.payload as GamePayload;
      if (payload.type !== "presence.state") return;

      const cursors = payload.cursors;

      // Resolve our own ID: we are the key that is not the host
      // and not already tracked as a remote player.
      if (this.myId === "") {
        for (const pid of Object.keys(cursors)) {
          if (pid !== this.hostId && !this.remotePlayers.has(pid)) {
            this.myId = pid;
            break;
          }
        }
      }

      for (const [pid, pos] of Object.entries(cursors)) {
        // Skip ourselves
        if (pid === this.myId) continue;

        if (!this.remotePlayers.has(pid)) {
          this.spawnRemotePlayer(pid);
          this.updateHUD();
        }

        const player = this.remotePlayers.get(pid)!;
        player.targetX = pos.x * W;
        player.targetY = pos.y * H;
      }

      // Remove players no longer present
      this.remotePlayers.forEach((_p, pid) => {
        if (!(pid in cursors)) {
          this.removeRemotePlayer(pid);
          this.updateHUD();
        }
      });
    });
    this.unsubscribers.push(offHost);
  }

  // ── Sending ───────────────────────────────────────────────────────────────

  private sendCursorUpdate(): void {
    if (this.isHost) {
      // Always include latest local position and broadcast to all guests
      this.authoritative.set(this.myId, { x: this.localX, y: this.localY });
      this.broadcastPresence();
    } else {
      this.relay.send({
        type: "guest.message",
        payload: { type: "cursor.move", x: this.localX, y: this.localY } satisfies CursorMovePayload,
      });
    }
  }

  private broadcastPresence(): void {
    const cursors: Record<string, { x: number; y: number }> = {};
    this.authoritative.forEach((pos, id) => {
      cursors[id] = pos;
    });
    const payload: PresenceStatePayload = { type: "presence.state", cursors };
    this.relay.send({ type: "host.message", payload });
  }

  // ── Remote player management ──────────────────────────────────────────────

  private spawnRemotePlayer(id: string): void {
    const color = REMOTE_COLORS[this.colorIndex % REMOTE_COLORS.length];
    this.colorIndex++;

    const dot = this.add.circle(W / 2, H / 2, 10, color).setDepth(9);
    const label = this.add
      .text(W / 2 + 14, H / 2 - 14, this.shortId(id), {
        fontFamily: "Consolas",
        fontSize: 14,
        color: "#" + color.toString(16).padStart(6, "0"),
      })
      .setDepth(9);

    this.remotePlayers.set(id, { targetX: W / 2, targetY: H / 2, dot, label });
  }

  private removeRemotePlayer(id: string): void {
    const player = this.remotePlayers.get(id);
    if (!player) return;
    player.dot.destroy();
    player.label.destroy();
    this.remotePlayers.delete(id);
  }

  // ── HUD ───────────────────────────────────────────────────────────────────

  private updateHUD(): void {
    const role = this.isHost ? "HOST" : "GUEST";
    const players = this.remotePlayers.size + 1;
    this.hudText.setText(
      `Lobby: ${this.lobbyId.slice(0, 6).toUpperCase()}  |  Role: ${role}  |  Players: ${players}`
    );
    this.statusText.setText(
      this.isHost ? "You are the host — move your cursor" : "Connected — move your cursor"
    );
  }

  private shortId(id: string): string {
    return id.slice(0, 6);
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────

  shutdown(): void {
    this.unsubscribers.forEach((fn) => fn());
    this.unsubscribers = [];
    if (this._onMouseMove) {
      this.game.canvas.removeEventListener("mousemove", this._onMouseMove);
      this._onMouseMove = null;
    }
    this.game.canvas.style.cursor = "";
  }
}
