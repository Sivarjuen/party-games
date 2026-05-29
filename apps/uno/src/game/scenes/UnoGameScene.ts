import Phaser from 'phaser';
import { CardRenderer } from '@party/cards';
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
import { unoCardOptions, unoBackOptions } from '../rendering/cardAssets';

const AI_DELAY_MS = 1200;

// ── Height-relative sizing constants ────────────────────────────────────────
// All expressed as fractions of screen height (H).
const CARD_H_FRAC     = 0.30;   // player card height = 30% of H
const CARD_RATIO      = 670 / 1043;  // width:height from actual card assets
const OPP_CARD_H_FRAC = 0.15;   // opponent card height = 15% of H
const OVERLAP_FRAC    = 0.38;   // step = cardWidth * this
const PEEK_FRAC       = 0.25;   // 25% of card hangs off-screen

/** Compute all card dimensions from screen height */
function cardSizes(H: number) {
  const ch = H * CARD_H_FRAC;
  const cw = ch * CARD_RATIO;
  const och = H * OPP_CARD_H_FRAC;
  const ocw = och * CARD_RATIO;
  return {
    playerW: cw, playerH: ch,
    oppW: ocw, oppH: och,
    playerStep: cw * OVERLAP_FRAC,
    oppStep: ocw * OVERLAP_FRAC,
    playerPeek: ch * PEEK_FRAC,
    oppPeek: och * PEEK_FRAC,
    oppSidePeek: ocw * PEEK_FRAC,
  };
}

export interface UnoSceneData {
  playerCount: number;
  humanIndex: number;
}

export class UnoGameScene extends Phaser.Scene {
  private state!: UnoGameState;
  private slots!: SlotConfig[];
  private humanPlayerId!: string;

  private handRenderers: Map<string, CardRenderer[]> = new Map();
  private discardPileRenderer: CardRenderer | null = null;
  private _drawPileBack: CardRenderer | null = null;
  private drawPileHitArea: Phaser.GameObjects.Rectangle | null = null;
  private bg!: Phaser.GameObjects.Rectangle;
  private resetBg!: Phaser.GameObjects.Rectangle;
  private resetLabel!: Phaser.GameObjects.Text;
  private _debugAdd!: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text };
  private _debugRem!: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text };

  private hud!: HudUI;
  private processingTurn = false;

  constructor() {
    super('UnoGameScene');
  }

  preload(): void {
    // Card face assets
    for (let i = 0; i <= 9; i++) {
      this.load.image(`card-${i}`, `/assets/cards/${i}.png`);
    }
    this.load.image('card-skip', '/assets/cards/skip.png');
    this.load.image('card-rev', '/assets/cards/rev.png');
    this.load.image('card-plus2', '/assets/cards/plus2.png');
    this.load.image('card-plus4', '/assets/cards/plus4.png');
    this.load.image('card-wild', '/assets/cards/wild.png');

    // Card back
    this.load.image('card-back', '/assets/backgrounds/back.png');

    // Turn icon
    this.load.image('turn-icon', '/assets/ui/turn_icon.png');
  }

  init(data: UnoSceneData): void {
    const playerCount = data?.playerCount ?? 6;  // DEV: default to 6 for testing
    const humanIndex  = data?.humanIndex  ?? 0;
    this.state = dealInitialHands(playerCount, humanIndex);
    this.humanPlayerId = this.state.players.find((p) => p.type === 'human')?.id ?? 'player-0';
    // Pass player IDs in actual play order so table layout matches turn sequence
    const playerIds = this.state.players.map((p) => p.id);
    this.slots = getTableLayout(playerIds, this.humanPlayerId);
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.bg = this.add.rectangle(W / 2, H / 2, W, H, 0x1a472a);

    // Central area objects (created once, repositioned on resize)
    this.drawPileHitArea = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setDepth(6);

    this._layoutCentralArea(W, H);

    for (const slot of this.slots) {
      this._renderHand(slot, W, H);
    }

    this.hud = new HudUI(this);
    this.hud.initPlayerLabels(this.slots, W, H, this.humanPlayerId);
    this._syncPlayerLabels();

    // Debug reset
    this.resetBg = this.add.rectangle(0, 0, 140, 40, 0x333333).setDepth(999).setInteractive({ useHandCursor: true });
    this.resetLabel = this.add.text(0, 0, '↺ Reset', {
      fontFamily: 'Consolas, monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(1000);
    this.resetBg.on('pointerover', () => this.resetBg.setFillStyle(0x555555));
    this.resetBg.on('pointerout',  () => this.resetBg.setFillStyle(0x333333));
    this.resetBg.on('pointerdown', () => this.scene.restart());
    this._positionReset(W, H);

    // Debug +1 card to all players
    const addBg = this.add.rectangle(0, 0, 60, 40, 0x336633).setDepth(999).setInteractive({ useHandCursor: true });
    const addLabel = this.add.text(0, 0, '+1', {
      fontFamily: 'Consolas, monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(1000);
    addBg.on('pointerover', () => addBg.setFillStyle(0x448844));
    addBg.on('pointerout',  () => addBg.setFillStyle(0x336633));
    addBg.on('pointerdown', () => {
      for (const p of this.state.players) {
        this.state = reshuffleIfNeeded(this.state);
        const card = this.state.drawPile[this.state.drawPile.length - 1];
        if (card) {
          this.state = { ...this.state, drawPile: this.state.drawPile.slice(0, -1) };
          p.hand.add(card);
        }
      }
      this._fullRedraw();
    });

    // Debug -1 card from all players
    const remBg = this.add.rectangle(0, 0, 60, 40, 0x663333).setDepth(999).setInteractive({ useHandCursor: true });
    const remLabel = this.add.text(0, 0, '-1', {
      fontFamily: 'Consolas, monospace', fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5, 0.5).setDepth(1000);
    remBg.on('pointerover', () => remBg.setFillStyle(0x884444));
    remBg.on('pointerout',  () => remBg.setFillStyle(0x663333));
    remBg.on('pointerdown', () => {
      for (const p of this.state.players) {
        if (p.hand.count > 1) {
          const card = p.hand.cards[p.hand.cards.length - 1];
          p.hand.remove(card.id);
          this.state = { ...this.state, drawPile: [...this.state.drawPile, card] };
        }
      }
      this._fullRedraw();
    });

    // Store debug buttons for repositioning
    this._debugAdd = { bg: addBg, label: addLabel };
    this._debugRem = { bg: remBg, label: remLabel };
    this._positionReset(W, H);

    this.scale.on('resize', (gs: Phaser.Structs.Size) => this._onResize(gs.width, gs.height));
    this._startTurn();
  }

  private _onResize(W: number, H: number): void {
    this.bg.setPosition(W / 2, H / 2).setSize(W, H);
    this._layoutCentralArea(W, H);
    this._fullRedraw(W, H);
    this._positionReset(W, H);
  }

  private _positionReset(W: number, H: number): void {
    this.resetBg.setPosition(W - 80, H - 30);
    this.resetLabel.setPosition(W - 80, H - 30);
    if (this._debugAdd) {
      this._debugAdd.bg.setPosition(W - 180, H - 30);
      this._debugAdd.label.setPosition(W - 180, H - 30);
    }
    if (this._debugRem) {
      this._debugRem.bg.setPosition(W - 250, H - 30);
      this._debugRem.label.setPosition(W - 250, H - 30);
    }
  }

  // ── Central area ──────────────────────────────────────────────────────────

  private _layoutCentralArea(W: number, H: number): void {
    const { playerW, playerH } = cardSizes(H);
    const { drawPile, discardPile } = getCentralAreaPositions(W, H);

    // Draw pile — card back image
    this.drawPileHitArea!.setPosition(drawPile.x, drawPile.y).setSize(playerW, playerH);

    // Render draw pile card back
    if (this._drawPileBack) this._drawPileBack.destroy();
    this._drawPileBack = new CardRenderer(this, { id: 'draw-pile', color: null, type: 'number' },
      unoBackOptions({ width: playerW, height: playerH }),
    );
    this._drawPileBack.container.setPosition(drawPile.x, drawPile.y).setDepth(4);

    void discardPile;
    this._renderDiscardTop(W, H);
  }

  private _renderDiscardTop(W: number, H: number): void {
    this.discardPileRenderer?.destroy();
    this.discardPileRenderer = null;

    const topCard = this.state.discardPile[this.state.discardPile.length - 1];
    if (!topCard) return;

    const { playerW, playerH } = cardSizes(H);
    const { discardPile } = getCentralAreaPositions(W, H);
    const r = new CardRenderer(this, topCard, unoCardOptions(topCard, {
      width: playerW,
      height: playerH,
      chosenWildColor: this.state.chosenWildColor,
    }));
    r.container.setPosition(discardPile.x, discardPile.y).setDepth(7);
    this.discardPileRenderer = r;
  }

  // ── Hand rendering ────────────────────────────────────────────────────────

  private _renderHand(slot: SlotConfig, W: number, H: number): void {
    const existing = this.handRenderers.get(slot.playerId) ?? [];
    existing.forEach((r) => r.destroy());

    const player = this.state.players.find((p) => p.id === slot.playerId);
    if (!player || player.hand.count === 0) {
      this.handRenderers.set(slot.playerId, []);
      return;
    }

    const count = player.hand.count;
    const pos = slot.position;
    const s = cardSizes(H);
    const renderers: CardRenderer[] = [];

    if (pos === 'bottom') {
      // Player hand — straight line, peeking from bottom, clamped to 75% of screen width
      const maxWidth = W * 0.75;
      const maxStep = count > 1 ? (maxWidth - s.playerW) / (count - 1) : 0;
      const step = Math.min(s.playerStep, maxStep);
      const totalSpread = step * (count - 1);
      const cx = W / 2;
      const y = H - s.playerH / 2 + s.playerPeek;

      player.hand.cards.forEach((card, i) => {
        const x = cx - totalSpread / 2 + i * step;
        const r = new CardRenderer(this, card, {
          ...unoCardOptions(card, { width: s.playerW, height: s.playerH }),
          interactive: true,
        });
        r.container.setPosition(x, y).setDepth(10 + i);

        // Always enable hover (peek card up) regardless of whose turn it is
        const baseY = y;
        const liftPx = this.scale.height * 0.06;
        r.container.on('pointerover', () => {
          this.tweens.killTweensOf(r.container);
          this.tweens.add({ targets: r.container, y: baseY - liftPx, duration: 120, ease: 'Power2' });
        });
        r.container.on('pointerout', () => {
          this.tweens.killTweensOf(r.container);
          this.tweens.add({ targets: r.container, y: baseY, duration: 120, ease: 'Power2' });
        });

        renderers.push(r);
      });

    } else if (pos === 'top-center' || pos === 'top-left' || pos === 'top-right') {
      // Top opponents — straight line, peeking from top
      // Cards are clamped within their slot bounds — step tightens if too many cards
      const topSlots = this.slots.filter((sl) => sl.position.startsWith('top'));
      const topIdx = topSlots.findIndex((sl) => sl.playerId === slot.playerId);
      const bounds = getSlotBounds(pos, W, H, topSlots.length, topIdx);
      const maxStep = count > 1 ? (bounds.width - s.oppW) / (count - 1) : 0;
      const step = Math.min(s.oppStep, maxStep);
      const totalSpread = step * (count - 1);
      const cx = bounds.x + bounds.width / 2;
      const y = s.oppH / 2 - s.oppPeek;

      player.hand.cards.forEach((card, i) => {
        const x = cx - totalSpread / 2 + i * step;
        const r = new CardRenderer(this, card, unoBackOptions({ width: s.oppW, height: s.oppH }));
        r.container.setPosition(x, y).setRotation(Math.PI).setDepth(10 + i);
        renderers.push(r);
      });

    } else if (pos === 'left') {
      // Left opponent — vertical line, peeking from left, clamped to slot height
      const bounds = getSlotBounds(pos, W, H);
      const maxStep = count > 1 ? (bounds.height - s.oppW) / (count - 1) : 0;
      const step = Math.min(s.oppStep, maxStep);
      const totalSpread = step * (count - 1);
      const cy = H / 2;
      const x = s.oppH / 2 - s.oppSidePeek;

      player.hand.cards.forEach((card, i) => {
        const y = cy - totalSpread / 2 + i * step;
        const r = new CardRenderer(this, card, {
          faceDown: true, width: s.oppW, height: s.oppH,
        });
        r.container.setPosition(x, y).setRotation(Math.PI / 2).setDepth(10 + i);
        renderers.push(r);
      });

    } else if (pos === 'right') {
      // Right opponent — vertical line, peeking from right, clamped to slot height
      const bounds = getSlotBounds(pos, W, H);
      const maxStep = count > 1 ? (bounds.height - s.oppW) / (count - 1) : 0;
      const step = Math.min(s.oppStep, maxStep);
      const totalSpread = step * (count - 1);
      const cy = H / 2;
      const x = W - s.oppH / 2 + s.oppSidePeek;

      player.hand.cards.forEach((card, i) => {
        const y = cy - totalSpread / 2 + i * step;
        const r = new CardRenderer(this, card, {
          faceDown: true, width: s.oppW, height: s.oppH,
        });
        r.container.setPosition(x, y).setRotation(-Math.PI / 2).setDepth(10 + i);
        renderers.push(r);
      });
    }

    this.handRenderers.set(slot.playerId, renderers);
  }

  private _fullRedraw(W?: number, H?: number): void {
    const w = W ?? this.scale.width;
    const h = H ?? this.scale.height;
    for (const slot of this.slots) this._renderHand(slot, w, h);
    this._renderDiscardTop(w, h);
    this.hud.update(this.state, this.slots);
  }

  // ── Turn management ───────────────────────────────────────────────────────

  private _startTurn(): void {
    if (this.state.phase === 'game-over') return;
    this.hud.update(this.state, this.slots);
    const current = this.state.players[this.state.currentPlayerIndex];
    if (current.type === 'human') this._enableHumanInput();
    else { this._disableHumanInput(); this._runAiTurn(current.id); }
  }

  private _runAiTurn(playerId: string): void {
    if (this.processingTurn) return;
    this.processingTurn = true;

    const prevDiscardCount = this.state.discardPile.length;
    const prevHandCount = this.state.players.find((p) => p.id === playerId)?.hand.count ?? 0;

    UnoAI.processAiTurn(this.state, playerId, AI_DELAY_MS).then((newState) => {
      const playedCard = newState.discardPile.length > prevDiscardCount
        ? newState.discardPile[newState.discardPile.length - 1]
        : null;

      // Detect how many cards were drawn by this player
      const newHandCount = newState.players.find((p) => p.id === playerId)?.hand.count ?? 0;
      const cardsDrawn = newHandCount - prevHandCount + (playedCard ? 1 : 0); // +1 if they drew then played

      this.state = newState;

      const continueAfterAnim = () => {
        this._fullRedraw();
        this.processingTurn = false;
        if (this.state.phase === 'game-over') { this._showWinOverlay(); return; }
        const next = this.state.players[this.state.currentPlayerIndex];
        if (next.type === 'ai') this._runAiTurn(next.id); else this._startTurn();
      };

      if (playedCard) {
        // Redraw opponent hands immediately (card count decreases as animation starts)
        for (const slot of this.slots) {
          if (slot.playerId !== this.humanPlayerId) {
            this._renderHand(slot, this.scale.width, this.scale.height);
          }
        }
        this.hud.update(this.state, this.slots);
        // Animate card from opponent's edge to discard pile
        this._animateOpponentCard(playerId, playedCard, continueAfterAnim);
      } else if (cardsDrawn > 0) {
        // AI drew cards — animate draw from pile to their hand
        // State already updated, just show the visual
        this._animateDrawVisual(playerId, cardsDrawn, continueAfterAnim);
      } else {
        continueAfterAnim();
      }
    });
  }

  /** Visual-only draw animation (state already committed). */
  private _animateDrawVisual(playerId: string, count: number, onComplete: () => void): void {
    if (count <= 0) { onComplete(); return; }

    const W = this.scale.width;
    const H = this.scale.height;
    const { drawPile } = getCentralAreaPositions(W, H);
    const s = cardSizes(H);
    const target = this._getHandEndPosition(playerId, W, H);

    const tempCard = new CardRenderer(this, { id: 'temp', color: null, type: 'number' }, {
      faceDown: true,
      width: s.oppW,
      height: s.oppH,
    });
    tempCard.container.setPosition(drawPile.x, drawPile.y);
    tempCard.container.setDepth(200);

    this.tweens.add({
      targets: tempCard.container,
      x: target.x,
      y: target.y,
      rotation: target.rotation,
      duration: 250,
      ease: 'Power2',
      onComplete: () => {
        tempCard.destroy();
        this._animateDrawVisual(playerId, count - 1, onComplete);
      },
    });
  }

  /** Animate a card from the opponent's slot edge to the discard pile. */
  private _animateOpponentCard(playerId: string, card: Card, onComplete: () => void): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const { discardPile } = getCentralAreaPositions(W, H);
    const s = cardSizes(H);

    // Find the slot for this player
    const slot = this.slots.find((sl) => sl.playerId === playerId);
    if (!slot) { onComplete(); return; }

    // Determine start position (off-screen edge of their slot)
    let startX = W / 2;
    let startY = 0;
    let startRotation = 0;

    switch (slot.position) {
      case 'top-center':
        startY = -s.oppH / 2;
        startRotation = 0;
        break;
      case 'top-left':
        startY = -s.oppH / 2;
        startRotation = -Math.PI / 6; // angled toward center
        break;
      case 'top-right':
        startY = -s.oppH / 2;
        startRotation = Math.PI / 6; // angled toward center
        break;
      case 'left':
        startX = -s.oppH / 2;
        startY = H / 2;
        startRotation = Math.PI / 2;
        break;
      case 'right':
        startX = W + s.oppH / 2;
        startY = H / 2;
        startRotation = -Math.PI / 2;
        break;
      default:
        break;
    }

    // For top slots, use the slot's center x
    if (slot.position.startsWith('top')) {
      const topSlots = this.slots.filter((sl) => sl.position.startsWith('top'));
      const topIdx = topSlots.findIndex((sl) => sl.playerId === playerId);
      const bounds = getSlotBounds(slot.position, W, H, topSlots.length, topIdx);
      startX = bounds.x + bounds.width / 2;
    }

    // Create a temporary card renderer at the start position (face-up, showing the played card)
    const tempCard = new CardRenderer(this, card, unoCardOptions(card, {
      width: s.playerW, height: s.playerH, chosenWildColor: this.state.chosenWildColor,
    }));
    tempCard.container.setPosition(startX, startY);
    tempCard.container.setRotation(startRotation);
    tempCard.container.setDepth(200);

    // Tween to discard pile
    this.tweens.add({
      targets: tempCard.container,
      x: discardPile.x,
      y: discardPile.y,
      rotation: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        tempCard.destroy();
        onComplete();
      },
    });
  }

  // ── Human input ───────────────────────────────────────────────────────────

  private _enableHumanInput(): void {
    const topCard = this.state.discardPile[this.state.discardPile.length - 1];
    if (!topCard) return;
    const humanPlayer = this.state.players.find((p) => p.id === this.humanPlayerId);
    if (!humanPlayer) return;

    const hasLegal = UnoRules.getLegalMoves(
      humanPlayer.hand.cards, topCard, this.state.activeDrawStack, this.state.chosenWildColor,
    ).length > 0;

    const renderers = this.handRenderers.get(this.humanPlayerId) ?? [];
    renderers.forEach((r) => {
      const legal = UnoRules.isPlayable(r.card, topCard, this.state.activeDrawStack, this.state.chosenWildColor);
      r.setHighlighted(legal);

      // Add click handler (hover is always active from _renderHand)
      r.container.on('pointerdown', () => {
        if (!legal) { this._flashCard(r); return; }
        this._disableHumanInput();
        this._humanPlayCard(r.card);
      });
    });

    this.drawPileHitArea?.removeAllListeners();
    if (!hasLegal) {
      this.drawPileHitArea?.setInteractive({ useHandCursor: true });
      this._drawPileBack?.setHighlighted(true);
      this.drawPileHitArea?.on('pointerdown', () => { this._disableHumanInput(); this._humanDraw(); });
    } else {
      this.drawPileHitArea?.disableInteractive();
      this._drawPileBack?.setHighlighted(false);
    }
  }

  private _disableHumanInput(): void {
    (this.handRenderers.get(this.humanPlayerId) ?? []).forEach((r) => {
      r.setHighlighted(false);
      r.container.off('pointerdown');
    });
    this.drawPileHitArea?.removeAllListeners();
    this._drawPileBack?.setHighlighted(false);
  }

  private _humanPlayCard(card: Card): void {
    const W = this.scale.width;
    const H = this.scale.height;
    if (card.type === 'wild' || card.type === 'wild-draw-four') {
      this.state = { ...this.state, phase: 'color-pick' };
      new ColorPickerUI(this, W, H, (color) => {
        this.state = { ...this.state, chosenWildColor: color, phase: 'playing' };
        this._animatePlayerCard(card);
      });
    } else {
      this._animatePlayerCard(card);
    }
  }

  /** Animate the player's card from hand to discard pile, then commit. */
  private _animatePlayerCard(card: Card): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const { discardPile } = getCentralAreaPositions(W, H);
    const s = cardSizes(H);

    // Find the renderer for this card
    const renderers = this.handRenderers.get(this.humanPlayerId) ?? [];
    const cardRenderer = renderers.find((r) => r.card.id === card.id);

    if (!cardRenderer) {
      // Fallback: no animation
      this._commitPlayCard(card);
      return;
    }

    // Stop hover from interfering
    cardRenderer.container.removeAllListeners();
    cardRenderer.container.disableInteractive();
    this.tweens.killTweensOf(cardRenderer.container);

    // Tween card to discard pile position
    this.tweens.add({
      targets: cardRenderer.container,
      x: discardPile.x,
      y: discardPile.y,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        cardRenderer.destroy();
        this._commitPlayCard(card);
      },
    });
    // Bring to front during animation
    cardRenderer.container.setDepth(200);
    void s;
  }

  private _commitPlayCard(card: Card): void {
    const player = this.state.players.find((p) => p.id === this.humanPlayerId);
    if (!player) return;
    player.hand.remove(card.id);
    this.state = {
      ...this.state,
      discardPile: [...this.state.discardPile, card],
      chosenWildColor: (card.type === 'wild' || card.type === 'wild-draw-four') ? this.state.chosenWildColor : null,
    };
    this.state = UnoRules.applyEffect(card, this.state);
    this.state = checkWin(this.state);
    this._fullRedraw();
    if (this.state.phase === 'game-over') { this._showWinOverlay(); return; }
    this.state = advanceTurn(this.state);
    this._startTurn();
  }

  private _humanDraw(): void {
    this.state = reshuffleIfNeeded(this.state);
    const drawn = this.state.drawPile[this.state.drawPile.length - 1] ?? null;
    if (!drawn) { this.state = advanceTurn(this.state); this._fullRedraw(); this._startTurn(); return; }

    if (this.state.activeDrawStack > 0) {
      // Draw stack: animate each card sequentially
      const count = this.state.activeDrawStack;
      this._animateDrawSequence(this.humanPlayerId, count, true, () => {
        this.state = { ...this.state, activeDrawStack: 0, skipNext: false };
        this.state = advanceTurn(this.state);
        this._fullRedraw(); this._startTurn();
      });
      return;
    }

    // Single draw with animation
    this._animateDrawCard(this.humanPlayerId, true, () => {
      // Card already added to hand by _animateDrawCard
      this._fullRedraw();
      const topCard = this.state.discardPile[this.state.discardPile.length - 1];
      if (topCard && UnoRules.isPlayable(drawn, topCard, this.state.activeDrawStack, this.state.chosenWildColor)) {
        this._enableHumanInput();
      } else {
        this.state = advanceTurn(this.state); this._startTurn();
      }
    });
  }

  /** Animate drawing a single card from draw pile to a player's hand end position. */
  private _animateDrawCard(playerId: string, isHuman: boolean, onComplete: () => void): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const { drawPile } = getCentralAreaPositions(W, H);
    const s = cardSizes(H);

    // Actually draw the card from state
    this.state = reshuffleIfNeeded(this.state);
    const card = this.state.drawPile[this.state.drawPile.length - 1];
    if (!card) { onComplete(); return; }
    this.state = { ...this.state, drawPile: this.state.drawPile.slice(0, -1) };
    this.state.players.find((p) => p.id === playerId)?.hand.add(card);

    // Compute target position (where the new last card will be)
    const target = this._getHandEndPosition(playerId, W, H);

    const cardW = isHuman ? s.playerW : s.oppW;
    const cardH = isHuman ? s.playerH : s.oppH;

    // Create temp card at draw pile
    const tempCard = new CardRenderer(this, card, {
      faceDown: !isHuman,
      width: cardW,
      height: cardH,
    });
    tempCard.container.setPosition(drawPile.x, drawPile.y);
    tempCard.container.setDepth(200);

    this.tweens.add({
      targets: tempCard.container,
      x: target.x,
      y: target.y,
      rotation: target.rotation,
      duration: 300,
      ease: 'Power2',
      onComplete: () => {
        tempCard.destroy();
        onComplete();
      },
    });
  }

  /** Animate drawing multiple cards sequentially. */
  private _animateDrawSequence(playerId: string, count: number, isHuman: boolean, onComplete: () => void): void {
    if (count <= 0) { onComplete(); return; }
    this._animateDrawCard(playerId, isHuman, () => {
      this._animateDrawSequence(playerId, count - 1, isHuman, onComplete);
    });
  }

  /** Get the position where the next card will be added to a player's hand. */
  private _getHandEndPosition(playerId: string, W: number, H: number): { x: number; y: number; rotation: number } {
    const s = cardSizes(H);
    const slot = this.slots.find((sl) => sl.playerId === playerId);
    if (!slot) return { x: W / 2, y: H / 2, rotation: 0 };

    const player = this.state.players.find((p) => p.id === playerId);
    const count = player?.hand.count ?? 1;
    const pos = slot.position;

    if (pos === 'bottom') {
      const maxWidth = W * 0.75;
      const maxStep = count > 1 ? (maxWidth - s.playerW) / (count - 1) : 0;
      const step = Math.min(s.playerStep, maxStep);
      const totalSpread = step * (count - 1);
      const cx = W / 2;
      const x = cx - totalSpread / 2 + (count - 1) * step;
      const y = H - s.playerH / 2 + s.playerPeek;
      return { x, y, rotation: 0 };
    } else if (pos === 'left') {
      const bounds = getSlotBounds(pos, W, H);
      const maxStep = count > 1 ? (bounds.height - s.oppW) / (count - 1) : 0;
      const step = Math.min(s.oppStep, maxStep);
      const totalSpread = step * (count - 1);
      const cy = H / 2;
      const x = s.oppH / 2 - s.oppSidePeek;
      const y = cy - totalSpread / 2 + (count - 1) * step;
      return { x, y, rotation: Math.PI / 2 };
    } else if (pos === 'right') {
      const bounds = getSlotBounds(pos, W, H);
      const maxStep = count > 1 ? (bounds.height - s.oppW) / (count - 1) : 0;
      const step = Math.min(s.oppStep, maxStep);
      const totalSpread = step * (count - 1);
      const cy = H / 2;
      const x = W - s.oppH / 2 + s.oppSidePeek;
      const y = cy - totalSpread / 2 + (count - 1) * step;
      return { x, y, rotation: -Math.PI / 2 };
    } else {
      // Top slots
      const topSlots = this.slots.filter((sl) => sl.position.startsWith('top'));
      const topIdx = topSlots.findIndex((sl) => sl.playerId === playerId);
      const bounds = getSlotBounds(pos, W, H, topSlots.length, topIdx);
      const maxStep = count > 1 ? (bounds.width - s.oppW) / (count - 1) : 0;
      const step = Math.min(s.oppStep, maxStep);
      const totalSpread = step * (count - 1);
      const cx = bounds.x + bounds.width / 2;
      const x = cx - totalSpread / 2 + (count - 1) * step;
      const y = s.oppH / 2 - s.oppPeek;
      return { x, y, rotation: Math.PI };
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private _syncPlayerLabels(): void {
    for (const player of this.state.players as UnoPlayer[]) {
      this.hud.updatePlayerLabel(player.id, player.name);
    }
  }

  private _flashCard(r: CardRenderer): void {
    this.tweens.add({ targets: r.container, x: r.container.x + 12, duration: 40, yoyo: true, repeat: 3, ease: 'Linear' });
  }

  private _showWinOverlay(): void {
    const winner = this.state.players.find((p) => p.id === this.state.winnerId) as UnoPlayer | undefined;
    new WinOverlayUI(this, this.scale.width, this.scale.height, winner?.name ?? 'Unknown');
  }
}
