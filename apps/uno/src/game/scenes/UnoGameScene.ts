import Phaser from 'phaser';
import { CardRenderer, fanLayout } from '@party/cards';
import type { Card } from '@party/cards';
import { dealInitialHands, advanceTurn, reshuffleIfNeeded, checkWin } from '../state/gameLoop';
import { UnoRules } from '../rules/UnoRules';
import { UnoAI } from '../ai/UnoAI';
import { getTableLayout, getSlotBounds, getCentralAreaPositions } from '../layout/tableLayout';
import type { SlotConfig } from '../layout/tableLayout';
import { HudUI } from '../ui/HudUI';
import { ColorPickerUI } from '../ui/ColorPickerUI';
import { WinOverlayUI } from '../ui/WinOverlayUI';
import type { UnoGameState, UnoPlayer } from '../state/UnoGameState';

const W = 1920;
const H = 1080;
const AI_DELAY_MS = 600;

export interface UnoSceneData {
  playerCount: number;
  humanIndex: number;
}

export class UnoGameScene extends Phaser.Scene {
  private state!: UnoGameState;
  private slots!: SlotConfig[];
  private humanPlayerId!: string;

  // Rendering
  private handRenderers: Map<string, CardRenderer[]> = new Map();
  private discardPileRenderer: CardRenderer | null = null;
  private drawPileHitArea: Phaser.GameObjects.Rectangle | null = null;

  private hud!: HudUI;
  private processingTurn = false;

  constructor() {
    super('UnoGameScene');
  }

  init(data: UnoSceneData): void {
    const playerCount = data?.playerCount ?? 4;
    const humanIndex = data?.humanIndex ?? 0;
    this.state = dealInitialHands(playerCount, humanIndex);
    this.humanPlayerId = this.state.players.find((p) => p.type === 'human')?.id ?? 'player-0';
    this.slots = getTableLayout(playerCount, humanIndex);
  }

  create(): void {
    // Green felt background
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a472a);

    // Central area
    this._renderCentralArea();

    // Player hands
    for (const slot of this.slots) {
      this._renderHand(slot);
    }

    // HUD
    this.hud = new HudUI(this);
    this.hud.initPlayerLabels(this.slots, W, H);
    this._syncPlayerLabels();

    // Start first turn
    this._startTurn();

    // ── Debug reset button ────────────────────────────────────────────────
    const resetBg = this.add.rectangle(W - 80, H - 30, 140, 40, 0x333333)
      .setDepth(999)
      .setInteractive({ useHandCursor: true });
    const resetLabel = this.add.text(W - 80, H - 30, '↺ Reset', {
      fontFamily: 'Consolas, monospace',
      fontSize: '18px',
      color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(1000);
    resetBg.on('pointerover', () => resetBg.setFillStyle(0x555555));
    resetBg.on('pointerout',  () => resetBg.setFillStyle(0x333333));
    resetBg.on('pointerdown', () => this.scene.restart());
    void resetLabel;
  }

  // ── Turn management ───────────────────────────────────────────────────────

  private _startTurn(): void {
    if (this.state.phase === 'game-over') return;

    this.hud.update(this.state, this.slots);

    const current = this.state.players[this.state.currentPlayerIndex];

    if (current.type === 'human') {
      this._enableHumanInput();
    } else {
      this._disableHumanInput();
      this._runAiTurn(current.id);
    }
  }

  private _runAiTurn(playerId: string): void {
    if (this.processingTurn) return;
    this.processingTurn = true;

    UnoAI.processAiTurn(this.state, playerId, AI_DELAY_MS).then((newState) => {
      this.state = newState;
      this._fullRedraw();
      this.processingTurn = false;

      if (this.state.phase === 'game-over') {
        this._showWinOverlay();
        return;
      }

      // Chain AI turns
      const next = this.state.players[this.state.currentPlayerIndex];
      if (next.type === 'ai') {
        this._runAiTurn(next.id);
      } else {
        this._startTurn();
      }
    });
  }

  // ── Human input ───────────────────────────────────────────────────────────

  private _enableHumanInput(): void {
    const topCard = this.state.discardPile[this.state.discardPile.length - 1];
    if (!topCard) return;

    const renderers = this.handRenderers.get(this.humanPlayerId) ?? [];
    const humanPlayer = this.state.players.find((p) => p.id === this.humanPlayerId);
    if (!humanPlayer) return;

    const hasLegalMove = UnoRules.getLegalMoves(
      humanPlayer.hand.cards,
      topCard,
      this.state.activeDrawStack,
      this.state.chosenWildColor,
    ).length > 0;

    renderers.forEach((r) => {
      const legal = UnoRules.isPlayable(
        r.card,
        topCard,
        this.state.activeDrawStack,
        this.state.chosenWildColor,
      );
      r.setDimmed(!legal);
      r.setHighlighted(legal);

      r.container.setInteractive({ useHandCursor: true });
      r.container.removeAllListeners();

      r.container.on('pointerover', () => {
        if (legal) {
          this.tweens.add({ targets: r.container, y: r.container.y - 20, duration: 100, ease: 'Power1' });
        }
      });
      r.container.on('pointerout', () => {
        if (legal) {
          this.tweens.add({ targets: r.container, y: r.container.y + 20, duration: 100, ease: 'Power1' });
        }
      });
      r.container.on('pointerdown', () => {
        if (!legal) {
          this._flashCard(r);
          return;
        }
        this._disableHumanInput();
        this._humanPlayCard(r.card);
      });
    });

    // Draw pile — only enabled when no legal moves exist
    this.drawPileHitArea?.removeAllListeners();
    if (!hasLegalMove) {
      this.drawPileHitArea?.setInteractive({ useHandCursor: true });
      this.drawPileHitArea?.on('pointerdown', () => {
        this._disableHumanInput();
        this._humanDraw();
      });
    } else {
      this.drawPileHitArea?.disableInteractive();
    }
  }

  private _disableHumanInput(): void {
    const renderers = this.handRenderers.get(this.humanPlayerId) ?? [];
    renderers.forEach((r) => {
      r.setDimmed(false);
      r.setHighlighted(false);
      r.container.removeAllListeners();
      r.container.disableInteractive();
    });
    this.drawPileHitArea?.removeAllListeners();
  }

  private _humanPlayCard(card: Card): void {
    if (card.type === 'wild' || card.type === 'wild-draw-four') {
      // Show color picker first
      this.state = {
        ...this.state,
        phase: 'color-pick',
      };
      new ColorPickerUI(this, W, H, (color) => {
        this.state = { ...this.state, chosenWildColor: color, phase: 'playing' };
        this._commitPlayCard(card);
      });
    } else {
      this._commitPlayCard(card);
    }
  }

  private _commitPlayCard(card: Card): void {
    // Remove from hand
    const player = this.state.players.find((p) => p.id === this.humanPlayerId);
    if (!player) return;
    player.hand.remove(card.id);

    this.state = {
      ...this.state,
      discardPile: [...this.state.discardPile, card],
      chosenWildColor: (card.type === 'wild' || card.type === 'wild-draw-four')
        ? this.state.chosenWildColor
        : null,
    };

    // Apply effect
    this.state = UnoRules.applyEffect(card, this.state);

    // Check win
    this.state = checkWin(this.state);
    this._fullRedraw();

    if (this.state.phase === 'game-over') {
      this._showWinOverlay();
      return;
    }

    this.state = advanceTurn(this.state);
    this._startTurn();
  }

  private _humanDraw(): void {
    this.state = reshuffleIfNeeded(this.state);

    const drawn = this.state.drawPile[this.state.drawPile.length - 1] ?? null;
    if (!drawn) {
      // Nothing to draw
      this.state = advanceTurn(this.state);
      this._fullRedraw();
      this._startTurn();
      return;
    }

    // Handle draw stack
    if (this.state.activeDrawStack > 0) {
      const count = this.state.activeDrawStack;
      for (let i = 0; i < count; i++) {
        this.state = reshuffleIfNeeded(this.state);
        const c = this.state.drawPile[this.state.drawPile.length - 1];
        if (!c) break;
        this.state = { ...this.state, drawPile: this.state.drawPile.slice(0, -1) };
        const humanPlayer = this.state.players.find((p) => p.id === this.humanPlayerId);
        humanPlayer?.hand.add(c);
      }
      this.state = { ...this.state, activeDrawStack: 0, skipNext: true };
      this.state = advanceTurn(this.state);
      this._fullRedraw();
      this._startTurn();
      return;
    }

    // Draw one card
    this.state = { ...this.state, drawPile: this.state.drawPile.slice(0, -1) };
    const humanPlayer = this.state.players.find((p) => p.id === this.humanPlayerId);
    humanPlayer?.hand.add(drawn);

    this._fullRedraw();

    // Check if drawn card is playable
    const topCard = this.state.discardPile[this.state.discardPile.length - 1];
    if (topCard && UnoRules.isPlayable(drawn, topCard, this.state.activeDrawStack, this.state.chosenWildColor)) {
      // Let player optionally play it
      this._enableHumanInput();
    } else {
      this.state = advanceTurn(this.state);
      this._startTurn();
    }
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private _renderCentralArea(): void {
    const { drawPile, discardPile } = getCentralAreaPositions(W, H);

    // Draw pile — face-down stack visual
    const dpGfx = this.add.graphics();
    dpGfx.fillStyle(0x1a1a2e, 1);
    dpGfx.fillRoundedRect(drawPile.x - 60, drawPile.y - 90, 120, 180, 8);
    dpGfx.lineStyle(2, 0x555577, 1);
    dpGfx.strokeRoundedRect(drawPile.x - 60, drawPile.y - 90, 120, 180, 8);

    const dpLabel = this.add
      .text(drawPile.x, drawPile.y, 'DRAW', {
        fontFamily: 'Consolas, monospace',
        fontSize: '16px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 0.5);

    // Hit area for draw pile
    this.drawPileHitArea = this.add
      .rectangle(drawPile.x, drawPile.y, 120, 180, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    // Discard pile label
    this.add
      .text(discardPile.x, discardPile.y + 120, 'DISCARD', {
        fontFamily: 'Consolas, monospace',
        fontSize: '14px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 0);

    void dpLabel; // used for layout reference

    this._renderDiscardTop();
  }

  private _renderDiscardTop(): void {
    this.discardPileRenderer?.destroy();
    this.discardPileRenderer = null;

    const topCard = this.state.discardPile[this.state.discardPile.length - 1];
    if (!topCard) return;

    const { discardPile } = getCentralAreaPositions(W, H);
    const r = new CardRenderer(this, topCard, { faceDown: false });
    r.container.setPosition(discardPile.x, discardPile.y);
    this.discardPileRenderer = r;
  }

  private _renderHand(slot: SlotConfig): void {
    // Destroy existing renderers for this slot
    const existing = this.handRenderers.get(slot.playerId) ?? [];
    existing.forEach((r) => r.destroy());

    const player = this.state.players.find((p) => p.id === slot.playerId);
    if (!player) return;

    const bounds = getSlotBounds(slot.position, W, H);
    const isHuman = slot.playerId === this.humanPlayerId;
    void isHuman; // used only in the bottom branch below
    const count = player.hand.count;

    if (count === 0) {
      this.handRenderers.set(slot.playerId, []);
      return;
    }

    const CARD_W = 120;
    const CARD_H = 180;
    const step = CARD_W * 0.38;
    const renderers: CardRenderer[] = [];

    const pos = slot.position;

    if (pos === 'left' || pos === 'right') {
      // ── Side slots: straight vertical line, cards rotated 90° to face center
      // Use same step as horizontal (CARD_W * 0.38) since cards are rotated —
      // their visual footprint along the vertical axis equals their width.
      const totalSpread = step * (count - 1);
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const cardRotation = pos === 'left' ? Math.PI / 2 : -Math.PI / 2;

      player.hand.cards.forEach((card, i) => {
        const x = cx;
        const y = cy - totalSpread / 2 + i * step;

        const r = new CardRenderer(this, card, { faceDown: true });
        r.container.setPosition(x, y);
        r.container.setRotation(cardRotation);
        r.container.setDepth(10 + i);
        renderers.push(r);
      });

    } else if (pos === 'top-center' || pos === 'top-left' || pos === 'top-right') {
      // ── Top slots: straight horizontal line, cards flipped to face center
      const totalSpread = step * (count - 1);
      const cx = bounds.x + bounds.width / 2;
      const anchorY = bounds.y + CARD_H / 2;
      const startX = cx - totalSpread / 2;

      player.hand.cards.forEach((card, i) => {
        const x = startX + i * step;

        const r = new CardRenderer(this, card, { faceDown: true });
        r.container.setPosition(x, anchorY);
        r.container.setRotation(Math.PI);
        r.container.setDepth(10 + i);
        renderers.push(r);
      });

    } else {
      // ── Bottom slot (human): standard horizontal fan ──────────────────────
      const transforms = fanLayout(count, bounds);

      player.hand.cards.forEach((card, i) => {
        const t = transforms[i];
        const r = new CardRenderer(this, card, {
          faceDown: false,
          interactive: true,
        });
        r.container.setPosition(t.x, t.y);
        r.container.setRotation(t.rotation);
        r.container.setDepth(10 + i);
        renderers.push(r);
      });
    }

    this.handRenderers.set(slot.playerId, renderers);
  }

  private _fullRedraw(): void {
    // Re-render all hands
    for (const slot of this.slots) {
      this._renderHand(slot);
    }
    // Re-render discard top
    this._renderDiscardTop();
    // Update HUD
    this.hud.update(this.state, this.slots);
  }

  private _syncPlayerLabels(): void {
    for (const player of this.state.players as UnoPlayer[]) {
      this.hud.updatePlayerLabel(player.id, player.name);
    }
  }

  // ── Feedback ──────────────────────────────────────────────────────────────

  private _flashCard(r: CardRenderer): void {
    this.tweens.add({
      targets: r.container,
      x: r.container.x + 8,
      duration: 40,
      yoyo: true,
      repeat: 3,
      ease: 'Linear',
    });
  }

  private _showWinOverlay(): void {
    const winner = this.state.players.find((p) => p.id === this.state.winnerId) as UnoPlayer | undefined;
    const name = winner?.name ?? 'Unknown';
    new WinOverlayUI(this, W, H, name);
  }
}
