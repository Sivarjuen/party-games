import { Scene } from "phaser";
import { RelayClient } from "../../net/relayClient";

const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? "ws://localhost:3000";

export class LobbyScene extends Scene {
  private relay!: RelayClient;

  // DOM elements
  private statusEl!: HTMLDivElement;
  private codeInput!: HTMLInputElement;
  private createBtn!: HTMLButtonElement;
  private joinBtn!: HTMLButtonElement;
  private joinRow!: HTMLDivElement;
  private overlay!: HTMLDivElement;

  constructor() {
    super("LobbyScene");
  }

  create(): void {
    this.relay = new RelayClient(RELAY_URL);
    this.buildUI();
    this.bindRelayEvents();
    this.relay.connect();
  }

  // ── UI ──────────────────────────────────────────────────────────────────────

  private buildUI(): void {
    this.overlay = document.createElement("div");
    Object.assign(this.overlay.style, {
      position: "fixed",
      inset: "0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "16px",
      fontFamily: "Consolas, monospace",
      color: "#fff",
      zIndex: "10",
    });

    const title = document.createElement("h1");
    title.textContent = "Multi Cursor";
    Object.assign(title.style, { margin: "0 0 8px", fontSize: "2rem" });

    this.statusEl = document.createElement("div");
    this.statusEl.textContent = "Connecting…";
    Object.assign(this.statusEl.style, { fontSize: "0.9rem", opacity: "0.7" });

    this.createBtn = this.makeButton("Create Lobby");
    this.createBtn.disabled = true;
    this.createBtn.addEventListener("click", () => {
      this.relay.send({ type: "lobby.create" });
    });

    this.joinRow = document.createElement("div");
    Object.assign(this.joinRow.style, { display: "flex", gap: "8px" });

    this.codeInput = document.createElement("input");
    Object.assign(this.codeInput.style, {
      padding: "8px 12px",
      fontSize: "1rem",
      borderRadius: "6px",
      border: "1px solid #555",
      background: "#1a1a2e",
      color: "#fff",
      width: "120px",
      textTransform: "uppercase",
      letterSpacing: "0.15em",
    });
    this.codeInput.placeholder = "LOBBY CODE";
    this.codeInput.maxLength = 6;

    this.joinBtn = this.makeButton("Join");
    this.joinBtn.disabled = true;
    this.joinBtn.addEventListener("click", () => {
      const code = this.codeInput.value.trim().toUpperCase();
      if (code) this.relay.send({ type: "lobby.join", payload: { code } });
    });

    this.joinRow.append(this.codeInput, this.joinBtn);
    this.overlay.append(title, this.statusEl, this.createBtn, this.joinRow);
    document.body.appendChild(this.overlay);
  }

  private makeButton(label: string): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = label;
    Object.assign(btn.style, {
      padding: "10px 24px",
      fontSize: "1rem",
      borderRadius: "8px",
      border: "none",
      background: "#5a3fa0",
      color: "#fff",
      cursor: "pointer",
      fontFamily: "Consolas, monospace",
      transition: "background 0.15s",
    });
    btn.addEventListener("mouseenter", () => {
      if (!btn.disabled) btn.style.background = "#7b5ec4";
    });
    btn.addEventListener("mouseleave", () => {
      btn.style.background = btn.disabled ? "#333" : "#5a3fa0";
    });
    return btn;
  }

  private setStatus(text: string): void {
    this.statusEl.textContent = text;
  }

  private enableButtons(): void {
    this.createBtn.disabled = false;
    this.joinBtn.disabled = false;
    this.createBtn.style.background = "#5a3fa0";
    this.joinBtn.style.background = "#5a3fa0";
  }

  // ── Relay events ────────────────────────────────────────────────────────────

  private bindRelayEvents(): void {
    this.relay.on("open", () => {
      this.setStatus("Connected — create or join a lobby");
      this.enableButtons();
    });

    this.relay.on("close", () => {
      this.setStatus("Disconnected");
      this.createBtn.disabled = true;
      this.joinBtn.disabled = true;
    });

    this.relay.on("lobby.created", (msg) => {
      this.transitionToGame({
        relay: this.relay,
        lobbyId: msg.lobbyId,
        code: msg.payload.code,
        hostId: msg.payload.hostId,
        myId: msg.payload.hostId, // creator is always host
        isHost: true,
      });
    });

    this.relay.on("lobby.joined", (msg) => {
      // myId is not directly in the envelope — we'll derive it after
      // player.joined fires for others. We pass a placeholder and resolve
      // it in MainScene via the first host.message we receive.
      this.transitionToGame({
        relay: this.relay,
        lobbyId: msg.lobbyId,
        code: msg.payload.code,
        hostId: msg.payload.hostId,
        myId: "", // resolved in MainScene
        isHost: false,
      });
    });

    this.relay.on("error", (msg) => {
      this.setStatus(`Error: ${msg.payload.code}`);
    });
  }

  private transitionToGame(data: GameSceneData): void {
    this.overlay.remove();
    this.scene.start("MainScene", data);
  }

  shutdown(): void {
    this.overlay?.remove();
  }
}

export interface GameSceneData {
  relay: RelayClient;
  lobbyId: string;
  code: string;
  hostId: string;
  myId: string;
  isHost: boolean;
}
