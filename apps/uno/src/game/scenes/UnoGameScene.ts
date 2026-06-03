import Phaser from 'phaser';
import { CardRenderer } from '@party/cards';
import type { Card } from '@party/cards';
import { dealInitialHands, advanceTurn, reshuffleIfNeeded, checkWin } from '../state/gameLoop';
import { UnoRules } from '../rules/UnoRules';
import { UnoAI } from '../ai/UnoAI';
import { getTableLayout, getLayoutProvider } from '../layout/tableLayout';
import type { SlotConfig, TableLayoutProvider } from '../layout/tableLayout';
import { HudUI } from '../ui/HudUI';
import { ColorPickerUI } from '../ui/ColorPickerUI';
import { WinOverlayUI } from '../ui/WinOverlayUI';
import type { UnoGameState, UnoPlayer } from '../state/UnoGameState';
import { unoCardOptions, unoBackOptions } from '../rendering/cardAssets';
import { getDeviceContext } from '../layout/deviceContext';
import type { LayoutMode, InputMode } from '../layout/deviceContext';

const TEXT_RESOLUTION = window.devicePixelRatio || 1;
import { DEBUG } from '../layout/deviceContext';

const AI_DELAY_MS = 1200;

// ── Height-relative sizing constants ────────────────────────────────────────
const CARD_RATIO      = 750 / 1050;

// Landscape sizing fractions
const CARD_H_FRAC     = 0.30;
const OPP_CARD_H_FRAC = 0.15;
const OVERLAP_FRAC    = 0.38;
const PEEK_FRAC       = 0.25;

// Portrait sizing fractions
const PORT_CARD_H_FRAC     = 0.22;
const PORT_OPP_CARD_H_FRAC = 0.08;
const PORT_OVERLAP_FRAC    = 0.45;
const PORT_DISCARD_H_FRAC  = 0.32;

/** Compute card dimensions for landscape mode */
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

/** Compute card dimensions for portrait mode */
function portCardSizes(H: number) {
  const ch = H * PORT_CARD_H_FRAC;
  const cw = ch * CARD_RATIO;
  const och = H * PORT_OPP_CARD_H_FRAC;
  const ocw = och * CARD_RATIO;
  const dh = H * PORT_DISCARD_H_FRAC;
  const dw = dh * CARD_RATIO;
  return {
    playerW: cw, playerH: ch,
    oppW: ocw, oppH: och,
    playerStep: cw * PORT_OVERLAP_FRAC,
    oppStep: ocw * 0.4,
    discardW: dw, discardH: dh,
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
  private playerIds!: string[];

  // Layout
  layoutMode: LayoutMode = 'landscape';
  inputMode: InputMode = 'mouse';
  private layoutProvider!: TableLayoutProvider;

  private handRenderers: Map<string, CardRenderer[]> = new Map();
  private discardPileRenderers: CardRenderer[] = [];
  private discardPileTransforms: Array<{ rotation: number; offsetX: number; offsetY: number; wildColor: string | null }> = [];
  private _drawPileBack: CardRenderer | null = null;
  private drawPileHitArea: Phaser.GameObjects.Rectangle | null = null;
  private bg!: Phaser.GameObjects.Rectangle;
  private resetBg!: Phaser.GameObjects.Rectangle;
  private resetLabel!: Phaser.GameObjects.Text;
  private _debugAdd!: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text };
  private _debugRem!: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text };

  private hud!: HudUI;
  private processingTurn = false;

  // Portrait hand scrub state
  private _scrubOffset = 0;
  private _scrubHitZone: Phaser.GameObjects.Rectangle | null = null;
  private _legalCardIds: Set<string> = new Set();
  private _isLongPressing = false;
  private _scrubFadeLeft: Phaser.GameObjects.Graphics | null = null;
  private _scrubFadeRight: Phaser.GameObjects.Graphics | null = null;
  private _drawButton: Phaser.GameObjects.Container | null = null;

  constructor() {
    super('UnoGameScene');
  }

  preload(): void {
    for (let i = 0; i <= 9; i++) {
      this.load.image(`card-${i}`, `/assets/cards/${i}.png`);
    }
    this.load.image('card-skip', '/assets/cards/skip.png');
    this.load.image('card-rev', '/assets/cards/rev.png');
    this.load.image('card-plus2', '/assets/cards/plus2.png');
    this.load.image('card-plus4', '/assets/cards/plus4.png');
    this.load.image('card-wild', '/assets/cards/wild.png');
    this.load.svg('card-back', '/assets/backgrounds/card-back.svg', { width: 750, height: 1050 });
    this.load.image('turn-icon', '/assets/ui/turn_icon.png');
  }

  init(data: UnoSceneData): void {
    const playerCount = data?.playerCount ?? 6;
    const humanIndex  = data?.humanIndex  ?? 0;
    this.state = dealInitialHands(playerCount, humanIndex);
    this.humanPlayerId = this.state.players.find((p) => p.type === 'human')?.id ?? 'player-0';
    this.playerIds = this.state.players.map((p) => p.id);
  }

  create(): void {
    const W = this.scale.width;
    const H = Math.max(600, this.scale.height);

    this.bg = this.add.rectangle(W / 2, H / 2, W, H, 0x1a472a);

    const ctx = getDeviceContext(W, H);
    this.layoutMode = ctx.layoutMode;
    this.inputMode = ctx.inputMode;
    this.layoutProvider = getLayoutProvider(W, H);
    this.slots = getTableLayout(this.playerIds, this.humanPlayerId, this.layoutProvider);

    if (DEBUG) console.log(`[UNO] Device context: layout=${ctx.layoutMode}, input=${ctx.inputMode}, mobile=${ctx.isMobile} (${W}x${H})`);

    // Central area objects
    this.drawPileHitArea = this.add.rectangle(0, 0, 10, 10, 0xffffff, 0).setDepth(6);

    this._layoutCentralArea(W, H);

    for (const slot of this.slots) {
      this._renderHand(slot, W, H);
    }

    this.hud = new HudUI(this);
    this.hud.initPlayerLabels(this.slots, W, H, this.humanPlayerId);
    this._syncPlayerLabels();

    // Debug buttons
    if (DEBUG) {
      this.resetBg = this.add.rectangle(0, 0, 140, 40, 0x333333).setDepth(999).setInteractive({ useHandCursor: true });
      this.resetLabel = this.add.text(0, 0, '↺ Reset', {
        fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#ffffff', resolution: TEXT_RESOLUTION,
      }).setOrigin(0.5, 0.5).setDepth(1000);
      this.resetBg.on('pointerover', () => this.resetBg.setFillStyle(0x555555));
      this.resetBg.on('pointerout',  () => this.resetBg.setFillStyle(0x333333));
      this.resetBg.on('pointerdown', () => this.scene.restart());

      const addBg = this.add.rectangle(0, 0, 60, 40, 0x336633).setDepth(999).setInteractive({ useHandCursor: true });
      const addLabel = this.add.text(0, 0, '+1', {
        fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#ffffff', resolution: TEXT_RESOLUTION,
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

      const remBg = this.add.rectangle(0, 0, 60, 40, 0x663333).setDepth(999).setInteractive({ useHandCursor: true });
      const remLabel = this.add.text(0, 0, '-1', {
        fontFamily: 'Fredoka, sans-serif', fontSize: '18px', color: '#ffffff', resolution: TEXT_RESOLUTION,
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

      this._debugAdd = { bg: addBg, label: addLabel };
      this._debugRem = { bg: remBg, label: remLabel };
      this._positionReset(W, H);
    }

    this.scale.on('resize', (gs: Phaser.Structs.Size) => this._onResize(gs.width, gs.height));

    this._startTurn();
  }

  private _onResize(W: number, H: number): void {
    if (H < 600) return;

    const ctx = getDeviceContext(W, H);
    const newProvider = getLayoutProvider(W, H);
    const layoutChanged = ctx.layoutMode !== this.layoutMode;

    this.layoutMode = ctx.layoutMode;
    this.inputMode = ctx.inputMode;

    if (layoutChanged) {
      if (DEBUG) console.log(`[UNO] Layout mode changed: ${this.layoutMode} → ${ctx.layoutMode} (${W}x${H})`);
      this.layoutProvider = newProvider;
      // Re-assign slots for the new layout
      this.slots = getTableLayout(this.playerIds, this.humanPlayerId, this.layoutProvider);
      this.hud.destroy();
      this.hud = new HudUI(this);
      this.hud.initPlayerLabels(this.slots, W, H, this.humanPlayerId);
      this._syncPlayerLabels();
    }

    if (DEBUG) {
      const ratio = W / H;
      console.log(`[UNO] Resize: ${Math.round(W)}x${Math.round(H)} | W:H ratio = ${ratio.toFixed(3)}`);
    }

    this.bg.setPosition(W / 2, H / 2).setSize(W, H);
    this._layoutCentralArea(W, H);
    this._fullRedraw(W, H);
    this._positionReset(W, H);
  }

  private _positionReset(W: number, H: number): void {
    if (!this.resetBg) return;
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
    const central = this.layoutProvider.getCentralArea(W, H);

    if (this.layoutMode === 'portrait') {
      // Portrait: horizontal draw pile below discard
      const s = portCardSizes(H);
      const drawPile = central.drawPile!;

      this.drawPileHitArea!.setVisible(true);
      this.drawPileHitArea!.setPosition(drawPile.x, drawPile.y).setSize(s.playerH, s.playerW); // rotated dimensions

      if (this._drawPileBack) this._drawPileBack.destroy();
      this._drawPileBack = new CardRenderer(this, { id: 'draw-pile', color: null, type: 'number' },
        unoBackOptions({ width: s.playerW * 0.55, height: s.playerH * 0.55 }),
      );
      this._drawPileBack.container.setPosition(drawPile.x, drawPile.y).setDepth(4);
      this._drawPileBack.container.setRotation(Math.PI / 2); // horizontal

      this._renderDiscardTop(W, H);
    } else {
      // Landscape: draw pile + discard pile
      const { playerW, playerH } = cardSizes(H);
      const drawPile = central.drawPile!;

      this.drawPileHitArea!.setVisible(true);
      this.drawPileHitArea!.setPosition(drawPile.x, drawPile.y).setSize(playerW, playerH);

      if (this._drawPileBack) this._drawPileBack.destroy();
      this._drawPileBack = new CardRenderer(this, { id: 'draw-pile', color: null, type: 'number' },
        unoBackOptions({ width: playerW, height: playerH }),
      );
      this._drawPileBack.container.setPosition(drawPile.x, drawPile.y).setDepth(4);

      this._renderDiscardTop(W, H);
    }
  }

  private _renderDiscardTop(W: number, H: number): void {
    this.discardPileRenderers.forEach((r) => r.destroy());
    this.discardPileRenderers = [];

    const pile = this.state.discardPile;
    if (pile.length === 0) return;

    const central = this.layoutProvider.getCentralArea(W, H);
    const discardPos = central.discardPile;

    // Card size for discard pile
    let cardW: number, cardH: number;
    if (this.layoutMode === 'portrait') {
      const bounds = this.layoutProvider.getSlotBounds('bottom', W, H);
      cardH = bounds.height * 1.05;
      cardW = cardH * CARD_RATIO;
    } else {
      const s = cardSizes(H);
      cardW = s.playerW;
      cardH = s.playerH;
    }

    // Ensure transforms array matches pile length
    if (this.discardPileTransforms.length > pile.length) {
      this.discardPileTransforms = this.discardPileTransforms.slice(0, pile.length);
    }
    while (this.discardPileTransforms.length < pile.length) {
      const isFirst = this.discardPileTransforms.length === 0;
      this.discardPileTransforms.push({
        rotation: isFirst ? 0 : (Math.random() - 0.5) * 0.3,
        offsetX: isFirst ? 0 : (Math.random() - 0.5) * 8,
        offsetY: isFirst ? 0 : (Math.random() - 0.5) * 8,
        wildColor: null,
      });
    }

    const VISIBLE_COUNT = 20;
    const startIdx = Math.max(0, pile.length - VISIBLE_COUNT);

    for (let i = startIdx; i < pile.length; i++) {
      const card = pile[i];
      const isTop = i === pile.length - 1;
      const transform = this.discardPileTransforms[i];
      const wildColor = isTop ? (this.state.chosenWildColor ?? transform.wildColor) : transform.wildColor;

      const r = new CardRenderer(this, card, unoCardOptions(card, {
        width: cardW,
        height: cardH,
        chosenWildColor: wildColor,
      }));

      r.container.setPosition(
        discardPos.x + transform.offsetX,
        discardPos.y + transform.offsetY,
      );
      r.container.setRotation(transform.rotation);
      r.container.setDepth(5 + (i - startIdx));
      this.discardPileRenderers.push(r);
    }
  }

  // ── Hand rendering ────────────────────────────────────────────────────────

  private _renderHand(slot: SlotConfig, W: number, H: number): void {
    // If re-rendering the human hand, clear any active long press
    if (slot.playerId === this.humanPlayerId && this._isLongPressing) {
      this._isLongPressing = false;
    }

    const existing = this.handRenderers.get(slot.playerId) ?? [];
    existing.forEach((r) => r.destroy());

    const player = this.state.players.find((p) => p.id === slot.playerId);
    if (!player || player.hand.count === 0) {
      this.handRenderers.set(slot.playerId, []);
      return;
    }

    if (this.layoutMode === 'portrait') {
      this._renderHandPortrait(slot, player, W, H);
    } else {
      this._renderHandLandscape(slot, player, W, H);
    }
  }

  private _renderHandLandscape(slot: SlotConfig, player: UnoPlayer, W: number, H: number): void {
    const count = player.hand.count;
    const pos = slot.position;
    const s = cardSizes(H);
    const renderers: CardRenderer[] = [];

    if (pos === 'bottom') {
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

        const baseY = y;
        const liftPx = this.scale.height * 0.06;
        r.container.on('pointerover', () => {
          this.tweens.killTweensOf(r.container);
          this.tweens.add({ targets: r.container, y: baseY - liftPx, duration: 120, ease: 'Power2' });
        });
        r.container.on('pointerout', () => {
          this.tweens.killTweensOf(r.container);
          const restY = r.container.getData('restY') ?? baseY;
          this.tweens.add({ targets: r.container, y: restY, duration: 120, ease: 'Power2' });
        });
        r.container.setData('baseY', baseY);
        r.container.setData('restY', baseY);

        renderers.push(r);
      });

    } else if (pos === 'top-center' || pos === 'top-left' || pos === 'top-right') {
      const topSlots = this.slots.filter((sl) => sl.position.startsWith('top'));
      const topIdx = topSlots.findIndex((sl) => sl.playerId === slot.playerId);
      const bounds = this.layoutProvider.getSlotBounds(pos, W, H, topSlots.length, topIdx);
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
      const bounds = this.layoutProvider.getSlotBounds(pos, W, H);
      const maxStep = count > 1 ? (bounds.height - s.oppW) / (count - 1) : 0;
      const step = Math.min(s.oppStep, maxStep);
      const totalSpread = step * (count - 1);
      const cy = H / 2;
      const x = s.oppH / 2 - s.oppSidePeek;

      player.hand.cards.forEach((card, i) => {
        const y = cy - totalSpread / 2 + i * step;
        const r = new CardRenderer(this, card, { faceDown: true, width: s.oppW, height: s.oppH });
        r.container.setPosition(x, y).setRotation(Math.PI / 2).setDepth(10 + i);
        renderers.push(r);
      });

    } else if (pos === 'right') {
      const bounds = this.layoutProvider.getSlotBounds(pos, W, H);
      const maxStep = count > 1 ? (bounds.height - s.oppW) / (count - 1) : 0;
      const step = Math.min(s.oppStep, maxStep);
      const totalSpread = step * (count - 1);
      const cy = H / 2;
      const x = W - s.oppH / 2 + s.oppSidePeek;

      player.hand.cards.forEach((card, i) => {
        const y = cy - totalSpread / 2 + i * step;
        const r = new CardRenderer(this, card, { faceDown: true, width: s.oppW, height: s.oppH });
        r.container.setPosition(x, y).setRotation(-Math.PI / 2).setDepth(10 + i);
        renderers.push(r);
      });
    }

    this.handRenderers.set(slot.playerId, renderers);
  }

  private _renderHandPortrait(slot: SlotConfig, player: UnoPlayer, W: number, H: number): void {
    const count = player.hand.count;
    const pos = slot.position;
    const s = portCardSizes(H);
    const renderers: CardRenderer[] = [];

    if (pos === 'bottom') {
      // Portrait player hand — horizontally scrollable strip, tap any card to play
      const bounds = this.layoutProvider.getSlotBounds('bottom', W, H);
      const cardH = bounds.height * 1.05;
      const cardW = cardH * CARD_RATIO;
      const cy = bounds.y + bounds.height / 2 + cardH * 0.08;

      // Destroy old scrub hit zone
      this._scrubHitZone?.destroy();

      // Create hit zone for drag — sits above cards to capture scrub from anywhere
      this._scrubHitZone = this.add.rectangle(W / 2, cy, W, bounds.height * 1.5, 0x000000, 0)
        .setInteractive({ draggable: true }).setDepth(200);

      let dragStartX = 0;
      let dragStartOffset = 0;
      let hasDragged = false;
      let longPressTimer: Phaser.Time.TimerEvent | null = null;
      let isLongPressing = false;
      let longPressRenderer: CardRenderer | null = null;
      let longPressOrigY = 0;
      let longPressOrigDepth = 0;

      this._scrubHitZone.on('dragstart', (pointer: Phaser.Input.Pointer) => {
        dragStartX = pointer.x;
        hasDragged = false;
        isLongPressing = false;
        longPressRenderer = null;
        dragStartOffset = this._scrubOffset;

        // Start long press timer
        longPressTimer = this.time.delayedCall(300, () => {
          // Find which card is under the pointer
          for (let i = renderers.length - 1; i >= 0; i--) {
            const r = renderers[i];
            const container = r.container;
            const halfW = cardW / 2;
            const halfH = cardH / 2;
            if (pointer.x >= container.x - halfW && pointer.x <= container.x + halfW &&
                pointer.y >= container.y - halfH && pointer.y <= container.y + halfH) {
              isLongPressing = true;
              this._isLongPressing = true;
              longPressRenderer = r;
              longPressOrigY = container.y;
              longPressOrigDepth = container.depth;
              // Lift and bring to front
              container.setDepth(250);
              this.tweens.add({
                targets: container,
                y: longPressOrigY - cardH * 0.3,
                scaleX: 1.15,
                scaleY: 1.15,
                duration: 150,
                ease: 'Power2',
              });
              break;
            }
          }
        });
      });

      this._scrubHitZone.on('drag', (pointer: Phaser.Input.Pointer) => {
        const delta = pointer.x - dragStartX;
        if (Math.abs(delta) > 5 && !hasDragged) {
          hasDragged = true;
          // Cancel long press timer if not yet triggered
          if (longPressTimer) { longPressTimer.destroy(); longPressTimer = null; }
        } else if (Math.abs(delta) > 5) {
          if (longPressTimer) { longPressTimer.destroy(); longPressTimer = null; }
        }
        // Don't scroll if long pressing
        if (!isLongPressing && hasDragged) {
          this._scrubOffset = dragStartOffset + (pointer.x - dragStartX) * 2.2;
          this._positionScrubCards(W, H);
        }
      });

      this._scrubHitZone.on('dragend', (pointer: Phaser.Input.Pointer) => {
        // Cancel long press timer
        if (longPressTimer) { longPressTimer.destroy(); longPressTimer = null; }

        // If long pressing, return card to original position (don't play)
        if (isLongPressing && longPressRenderer) {
          longPressRenderer.container.setDepth(longPressOrigDepth);
          this.tweens.killTweensOf(longPressRenderer.container);
          this.tweens.add({
            targets: longPressRenderer.container,
            y: longPressOrigY,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 150,
            ease: 'Power2',
          });
          isLongPressing = false;
          this._isLongPressing = false;
          longPressRenderer = null;
          return;
        }

        if (!hasDragged) {
          // It was a tap — find which card was tapped and emit pointerdown on it
          for (let i = renderers.length - 1; i >= 0; i--) {
            const r = renderers[i];
            const container = r.container;
            const halfW = cardW / 2;
            const halfH = cardH / 2;
            if (pointer.x >= container.x - halfW && pointer.x <= container.x + halfW &&
                pointer.y >= container.y - halfH && pointer.y <= container.y + halfH) {
              container.emit('pointerdown');
              return;
            }
          }
        }
      });

      player.hand.cards.forEach((card, i) => {
        const r = new CardRenderer(this, card, {
          ...unoCardOptions(card, { width: cardW, height: cardH }),
          interactive: true,
        });
        r.container.setDepth(110 + i);
        renderers.push(r);
      });

      this.handRenderers.set(slot.playerId, renderers);
      this._positionScrubCards(W, H);
      return;

    } else if (pos === 'top') {
      // Top opponent — horizontal row, pushed off top edge
      const bounds = this.layoutProvider.getSlotBounds(pos, W, H);
      const step = Math.min(s.oppStep, count > 1 ? (bounds.width - s.oppW) / (count - 1) : 0);
      const totalW = step * (count - 1);
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2 - s.oppH * 0.3;

      player.hand.cards.forEach((card, i) => {
        const x = cx - totalW / 2 + i * step;
        const r = new CardRenderer(this, card, unoBackOptions({ width: s.oppW, height: s.oppH }));
        r.container.setPosition(x, cy).setRotation(Math.PI).setDepth(10 + i);
        renderers.push(r);
      });

    } else if (pos.startsWith('left') || pos.startsWith('right')) {
      // Side opponents — vertical stack, pushed off side edges
      const bounds = this.layoutProvider.getSlotBounds(pos, W, H);
      const step = Math.min(s.oppStep, count > 1 ? (bounds.height - s.oppW) / (count - 1) : 0);
      const totalH = step * (count - 1);
      const edgeOffset = s.oppH * 0.3;
      const cx = pos.startsWith('left')
        ? bounds.x + bounds.width / 2 - edgeOffset
        : bounds.x + bounds.width / 2 + edgeOffset;
      const cy = bounds.y + bounds.height / 2;
      const rotation = pos.startsWith('left') ? Math.PI / 2 : -Math.PI / 2;

      player.hand.cards.forEach((card, i) => {
        const y = cy - totalH / 2 + i * step;
        const r = new CardRenderer(this, card, unoBackOptions({ width: s.oppW, height: s.oppH }));
        r.container.setPosition(cx, y).setRotation(rotation).setDepth(10 + i);
        renderers.push(r);
      });
    }

    this.handRenderers.set(slot.playerId, renderers);
  }

  /** Position cards in the portrait hand based on current scroll offset. */
  private _positionScrubCards(W: number, H: number): void {
    const renderers = this.handRenderers.get(this.humanPlayerId) ?? [];
    if (renderers.length === 0) return;

    const bounds = this.layoutProvider.getSlotBounds('bottom', W, H);
    const cardH = bounds.height * 1.05;
    const cardW = cardH * CARD_RATIO;
    const cy = bounds.y + bounds.height / 2 + cardH * 0.08;

    // Fixed gap
    const step = cardW * 0.48;
    const totalWidth = step * (renderers.length - 1);

    // Clamp offset so end cards can't go past center
    const maxOffset = totalWidth / 2;
    this._scrubOffset = Phaser.Math.Clamp(this._scrubOffset, -maxOffset, maxOffset);

    const startX = W / 2 - totalWidth / 2 + this._scrubOffset;

    for (let i = 0; i < renderers.length; i++) {
      const r = renderers[i];
      const x = startX + i * step;
      const liftUp = this._legalCardIds.has(r.card.id) ? H * 0.04 : 0;
      r.container.setPosition(x, cy - liftUp);
      r.container.setScale(1.0);
      r.container.setDepth(110 + i);
    }

    // Update edge fade indicators
    this._updateScrubFades(W, H);
  }

  /** Create or update fade gradients on left/right edges of the hand zone. */
  private _updateScrubFades(W: number, H: number): void {
    const bounds = this.layoutProvider.getSlotBounds('bottom', W, H);
    const fadeW = 55;
    const legalLift = H * 0.04;
    const fadeY = bounds.y - legalLift;
    const fadeH = bounds.height + legalLift;

    // Left fade — always visible
    if (!this._scrubFadeLeft) {
      this._scrubFadeLeft = this.add.graphics().setDepth(190).setScrollFactor(0);
    }
    this._scrubFadeLeft.clear();
    this._scrubFadeLeft.fillGradientStyle(0x1a472a, 0x1a472a, 0x1a472a, 0x1a472a, 0.8, 0, 0.8, 0);
    this._scrubFadeLeft.fillRect(0, fadeY, fadeW, fadeH);

    // Right fade — always visible
    if (!this._scrubFadeRight) {
      this._scrubFadeRight = this.add.graphics().setDepth(190).setScrollFactor(0);
    }
    this._scrubFadeRight.clear();
    this._scrubFadeRight.fillGradientStyle(0x1a472a, 0x1a472a, 0x1a472a, 0x1a472a, 0, 0.8, 0, 0.8);
    this._scrubFadeRight.fillRect(W - fadeW, fadeY, fadeW, fadeH);
  }

  private _fullRedraw(W?: number, H?: number): void {
    const w = W ?? this.scale.width;
    const h = Math.max(600, H ?? this.scale.height);

    // Clean up portrait-specific elements before redraw
    this._scrubHitZone?.destroy();
    this._scrubHitZone = null;
    this._scrubFadeLeft?.destroy();
    this._scrubFadeLeft = null;
    this._scrubFadeRight?.destroy();
    this._scrubFadeRight = null;
    this._drawButton?.destroy();
    this._drawButton = null;

    for (const slot of this.slots) this._renderHand(slot, w, h);
    this._renderDiscardTop(w, h);
    this.hud.update(this.state, this.slots);

    // Re-enable input if it's the human's turn
    if (this.state.phase === 'playing' && !this.processingTurn) {
      const current = this.state.players[this.state.currentPlayerIndex];
      if (current.type === 'human') {
        this._enableHumanInput();
      }
    }
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
      const playerSlot = this.slots.find((s) => s.playerId === this.humanPlayerId);
      if (playerSlot) {
        this._renderHand(playerSlot, this.scale.width, Math.max(600, this.scale.height));
      }
      this._runAiTurn(current.id);
    }
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

      const newHandCount = newState.players.find((p) => p.id === playerId)?.hand.count ?? 0;
      const cardsDrawn = newHandCount - prevHandCount + (playedCard ? 1 : 0);

      this.state = newState;

      const continueAfterAnim = () => {
        this._fullRedraw();
        this.processingTurn = false;

        const aiPlayer = this.state.players.find((p) => p.id === playerId);
        if (aiPlayer && aiPlayer.hand.count === 1) {
          this.hud.showUnoCall();
        }

        if (this.state.phase === 'game-over') { this._showWinOverlay(); return; }
        const next = this.state.players[this.state.currentPlayerIndex];
        if (next.type === 'ai') this._runAiTurn(next.id); else this._startTurn();
      };

      if (playedCard) {
        const playedSlot = this.slots.find((sl) => sl.playerId === playerId);
        if (playedSlot) {
          this._renderHand(playedSlot, this.scale.width, Math.max(600, this.scale.height));
        }
        this.hud.update(this.state, this.slots);
        this._animateOpponentCard(playerId, playedCard, continueAfterAnim);
      } else if (cardsDrawn > 0) {
        this._animateDrawVisual(playerId, cardsDrawn, continueAfterAnim);
      } else {
        continueAfterAnim();
      }
    });
  }

  /** Visual-only draw animation (state already committed). Shows cards one at a time. */
  private _animateDrawVisual(playerId: string, count: number, onComplete: () => void): void {
    if (count <= 0) { onComplete(); return; }

    const W = this.scale.width;
    const H = this.scale.height;
    const s = this.layoutMode === 'portrait' ? portCardSizes(H) : cardSizes(H);

    // Figure out how many cards to show in the hand so far
    const player = this.state.players.find((p) => p.id === playerId);
    const totalCards = player?.hand.count ?? 0;
    const visibleCount = totalCards - count; // cards visible before this draw starts
    
    // Re-render hand showing only the cards drawn so far
    const slot = this.slots.find((sl) => sl.playerId === playerId);
    if (slot) {
      this._renderHand(slot, W, H);
      // Hide cards that haven't been "drawn" yet visually
      const renderers = this.handRenderers.get(playerId) ?? [];
      for (let i = visibleCount; i < renderers.length; i++) {
        renderers[i].container.setVisible(false);
      }
    }

    const target = this._getHandEndPosition(playerId, W, H);

    // Start position: from draw pile
    const central = this.layoutProvider.getCentralArea(W, H);
    const startX = central.drawPile!.x;
    const startY = central.drawPile!.y;

    const tempCard = new CardRenderer(this, { id: 'temp', color: null, type: 'number' },
      unoBackOptions({ width: s.oppW, height: s.oppH }),
    );
    tempCard.container.setPosition(startX, startY);
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
        // Show the card that just arrived
        const renderers = this.handRenderers.get(playerId) ?? [];
        if (renderers[visibleCount]) {
          renderers[visibleCount].container.setVisible(true);
        }
        this._animateDrawVisual(playerId, count - 1, onComplete);
      },
    });
  }

  /** Animate a card from the opponent's slot edge to the discard pile. */
  private _animateOpponentCard(playerId: string, card: Card, onComplete: () => void): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const central = this.layoutProvider.getCentralArea(W, H);
    const discardPos = central.discardPile;
    const s = this.layoutMode === 'portrait' ? portCardSizes(H) : cardSizes(H);

    const slot = this.slots.find((sl) => sl.playerId === playerId);
    if (!slot) { onComplete(); return; }

    // Determine start position based on slot
    let startX = W / 2;
    let startY = 0;
    let startRotation = 0;
    const bounds = this.layoutProvider.getSlotBounds(slot.position, W, H);

    if (this.layoutMode === 'portrait') {
      // Portrait: opponents come from their slot center
      startX = bounds.x + bounds.width / 2;
      startY = bounds.y + bounds.height / 2;
      if (slot.position === 'top') {
        startY = -s.oppH / 2;
      } else if (slot.position.startsWith('left')) {
        startX = -s.oppH / 2;
        startRotation = Math.PI / 2;
      } else if (slot.position.startsWith('right')) {
        startX = W + s.oppH / 2;
        startRotation = -Math.PI / 2;
      }
    } else {
      // Landscape
      switch (slot.position) {
        case 'top-center':
          startY = -s.oppH / 2;
          break;
        case 'top-left':
          startY = -s.oppH / 2;
          startRotation = -Math.PI / 6;
          break;
        case 'top-right':
          startY = -s.oppH / 2;
          startRotation = Math.PI / 6;
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
      }
      if (slot.position.startsWith('top')) {
        const topSlots = this.slots.filter((sl) => sl.position.startsWith('top'));
        const topIdx = topSlots.findIndex((sl) => sl.playerId === playerId);
        const topBounds = this.layoutProvider.getSlotBounds(slot.position, W, H, topSlots.length, topIdx);
        startX = topBounds.x + topBounds.width / 2;
      }
    }

    // Use discard card size for the animation
    let animW: number, animH: number;
    if (this.layoutMode === 'portrait') {
      const bounds = this.layoutProvider.getSlotBounds('bottom', W, H);
      animH = bounds.height * 1.05;
      animW = animH * CARD_RATIO;
    } else {
      const ls = cardSizes(H);
      animW = ls.playerW;
      animH = ls.playerH;
    }

    const tempCard = new CardRenderer(this, card, unoCardOptions(card, {
      width: animW, height: animH, chosenWildColor: this.state.chosenWildColor,
    }));
    tempCard.container.setPosition(startX, startY);
    tempCard.container.setRotation(startRotation);
    tempCard.container.setDepth(200);

    const pileTransform = this._preGeneratePileTransform(this.state.chosenWildColor);

    this.tweens.add({
      targets: tempCard.container,
      x: discardPos.x + pileTransform.offsetX,
      y: discardPos.y + pileTransform.offsetY,
      rotation: pileTransform.rotation,
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

    if (this.layoutMode === 'portrait') {
      // Portrait: tap any card to play it
      this._legalCardIds.clear();
      renderers.forEach((r) => {
        const legal = UnoRules.isPlayable(r.card, topCard, this.state.activeDrawStack, this.state.chosenWildColor);
        r.setHighlighted(legal);

        if (legal) {
          this._legalCardIds.add(r.card.id);
        }

        r.container.off('pointerdown');
        r.container.on('pointerdown', () => {
          if (!legal) { this._flashCard(r); return; }
          this._disableHumanInput();
          this._humanPlayCard(r.card);
        });
      });

      // Reposition to apply legal card lift with animation
      const W = this.scale.width;
      const H = Math.max(600, this.scale.height);
      const bounds = this.layoutProvider.getSlotBounds('bottom', W, H);
      const cardH = bounds.height * 1.05;
      const cy = bounds.y + bounds.height / 2 + cardH * 0.08;
      const liftAmount = H * 0.04;

      renderers.forEach((r) => {
        const isLegal = this._legalCardIds.has(r.card.id);
        const targetY = cy - (isLegal ? liftAmount : 0);
        this.tweens.killTweensOf(r.container);
        this.tweens.add({
          targets: r.container,
          y: targetY,
          duration: 200,
          ease: 'Power2',
        });
      });

      // Show draw pile as tappable if no legal moves
      this._drawButton?.destroy();
      this._drawButton = null;
      if (!hasLegal) {
        this.drawPileHitArea?.setInteractive({ useHandCursor: true });
        this._drawPileBack?.setHighlighted(true);
        this.drawPileHitArea?.on('pointerdown', () => { this._disableHumanInput(); this._humanDraw(); });
      } else {
        this.drawPileHitArea?.disableInteractive();
        this._drawPileBack?.setHighlighted(false);
      }

    } else {
      // Landscape: hover + click
      renderers.forEach((r) => {
        const legal = UnoRules.isPlayable(r.card, topCard, this.state.activeDrawStack, this.state.chosenWildColor);
        r.setHighlighted(legal);

        if (legal) {
          const liftUp = this.scale.height * 0.014;
          r.container.y -= liftUp;
          r.container.setData('restY', r.container.y);
        }

        r.container.on('pointerdown', () => {
          if (!legal) { this._flashCard(r); return; }
          this._disableHumanInput();
          this._humanPlayCard(r.card);
        });
      });

      // Landscape draw pile interaction
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
  }

  private _disableHumanInput(): void {
    // Animate legal cards back down in portrait mode
    if (this.layoutMode === 'portrait' && this._legalCardIds.size > 0) {
      const renderers = this.handRenderers.get(this.humanPlayerId) ?? [];
      const H = Math.max(600, this.scale.height);
      const bounds = this.layoutProvider.getSlotBounds('bottom', this.scale.width, H);
      const cardH = bounds.height * 1.05;
      const cy = bounds.y + bounds.height / 2 + cardH * 0.08;

      renderers.forEach((r) => {
        if (this._legalCardIds.has(r.card.id)) {
          this.tweens.killTweensOf(r.container);
          this.tweens.add({
            targets: r.container,
            y: cy,
            duration: 200,
            ease: 'Power2',
          });
        }
      });
    }

    this._legalCardIds.clear();
    (this.handRenderers.get(this.humanPlayerId) ?? []).forEach((r) => {
      r.setHighlighted(false);
      r.container.off('pointerdown');
    });
    this.drawPileHitArea?.removeAllListeners();
    this._drawPileBack?.setHighlighted(false);
    this._drawButton?.destroy();
    this._drawButton = null;
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

    const renderers = this.handRenderers.get(this.humanPlayerId) ?? [];
    const cardRenderer = renderers.find((r) => r.card.id === card.id);

    if (!cardRenderer) {
      this._commitPlayCard(card);
      return;
    }

    cardRenderer.container.removeAllListeners();
    cardRenderer.container.disableInteractive();
    this.tweens.killTweensOf(cardRenderer.container);

    const pileTransform = this._preGeneratePileTransform(this.state.chosenWildColor);
    const central = this.layoutProvider.getCentralArea(W, H);
    const dp = central.discardPile;

    this.tweens.add({
      targets: cardRenderer.container,
      x: dp.x + pileTransform.offsetX,
      y: dp.y + pileTransform.offsetY,
      rotation: pileTransform.rotation,
      scaleX: 1,
      scaleY: 1,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this._commitPlayCard(card);
        // Destroy after commit so the card stays visible until discard pile re-renders
        cardRenderer.destroy();
      },
    });
    cardRenderer.container.setDepth(200);
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

    if (player.hand.count === 1) {
      this.hud.showUnoCall();
    }

    // In portrait mode, animate remaining cards closing the gap
    if (this.layoutMode === 'portrait') {
      // Remove the played card's renderer from the list
      const renderers = this.handRenderers.get(this.humanPlayerId) ?? [];
      const idx = renderers.findIndex((r) => r.card.id === card.id);
      if (idx >= 0) {
        renderers.splice(idx, 1);
      }
      this.handRenderers.set(this.humanPlayerId, renderers);

      // Re-render discard pile immediately so there's no flash
      const W = this.scale.width;
      const H = Math.max(600, this.scale.height);
      this._renderDiscardTop(W, H);
      this.hud.update(this.state, this.slots);

      // Animate remaining cards to new positions
      const bounds = this.layoutProvider.getSlotBounds('bottom', W, H);
      const cardH = bounds.height * 1.05;
      const cardW = cardH * CARD_RATIO;
      const step = cardW * 0.48;
      const totalWidth = step * (renderers.length - 1);
      const maxOffset = totalWidth / 2;
      this._scrubOffset = Phaser.Math.Clamp(this._scrubOffset, -maxOffset, maxOffset);
      const startX = W / 2 - totalWidth / 2 + this._scrubOffset;
      const cy = bounds.y + bounds.height / 2 + cardH * 0.08;

      renderers.forEach((r, i) => {
        const targetX = startX + i * step;
        this.tweens.killTweensOf(r.container);
        this.tweens.add({
          targets: r.container,
          x: targetX,
          y: cy,
          duration: 250,
          ease: 'Power2',
        });
        r.container.setDepth(110 + i);
      });

      // Do a full redraw after animation to sync everything
      this.time.delayedCall(260, () => {
        this._fullRedraw();
        if (this.state.phase === 'game-over') { this._showWinOverlay(); return; }
        this.state = advanceTurn(this.state);
        this._startTurn();
      });
    } else {
      this._fullRedraw();
      if (this.state.phase === 'game-over') { this._showWinOverlay(); return; }
      this.state = advanceTurn(this.state);
      this._startTurn();
    }
  }

  private _humanDraw(): void {
    this.state = reshuffleIfNeeded(this.state);
    const drawn = this.state.drawPile[this.state.drawPile.length - 1] ?? null;
    if (!drawn) { this.state = advanceTurn(this.state); this._fullRedraw(); this._startTurn(); return; }

    if (this.state.activeDrawStack > 0) {
      const count = this.state.activeDrawStack;
      this._animateDrawSequence(this.humanPlayerId, count, true, () => {
        this.state = { ...this.state, activeDrawStack: 0, skipNext: false };
        this.state = advanceTurn(this.state);
        this._fullRedraw(); this._startTurn();
      });
      return;
    }

    this._animateDrawCard(this.humanPlayerId, true, () => {
      this._fullRedraw();
      const topCard = this.state.discardPile[this.state.discardPile.length - 1];
      if (topCard && UnoRules.isPlayable(drawn, topCard, this.state.activeDrawStack, this.state.chosenWildColor)) {
        this._enableHumanInput();
      } else {
        this.state = advanceTurn(this.state); this._startTurn();
      }
    });
  }

  /** Scroll the portrait hand to show the last card (rightmost). Returns a promise that resolves when done. */
  private _scrollHandToEnd(): Promise<void> {
    if (this.layoutMode !== 'portrait') return Promise.resolve();

    const renderers = this.handRenderers.get(this.humanPlayerId) ?? [];
    if (renderers.length === 0) return Promise.resolve();

    const bounds = this.layoutProvider.getSlotBounds('bottom', this.scale.width, this.scale.height);
    const cardH = bounds.height * 1.05;
    const cardW = cardH * CARD_RATIO;
    const step = cardW * 0.48;
    const totalWidth = step * (renderers.length - 1);
    const targetOffset = -(totalWidth / 2);

    // If already at end, no animation needed
    if (Math.abs(this._scrubOffset - targetOffset) < 1) {
      this._scrubOffset = targetOffset;
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const wrapper = { value: this._scrubOffset };
      this.tweens.add({
        targets: wrapper,
        value: targetOffset,
        duration: 300,
        ease: 'Power2',
        onUpdate: () => {
          this._scrubOffset = wrapper.value;
          this._positionScrubCards(this.scale.width, Math.max(600, this.scale.height));
        },
        onComplete: () => {
          this._scrubOffset = targetOffset;
          resolve();
        },
      });
    });
  }

  /** Animate drawing a single card from draw pile (or top of screen in portrait) to hand. */
  private _animateDrawCard(playerId: string, isHuman: boolean, onComplete: () => void): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const s = this.layoutMode === 'portrait' ? portCardSizes(H) : cardSizes(H);

    this.state = reshuffleIfNeeded(this.state);
    const card = this.state.drawPile[this.state.drawPile.length - 1];
    if (!card) { onComplete(); return; }
    this.state = { ...this.state, drawPile: this.state.drawPile.slice(0, -1) };
    this.state.players.find((p) => p.id === playerId)?.hand.add(card);

    // Scroll to end first (animated), then run the draw animation
    const doAnimation = () => {
      const target = this._getHandEndPosition(playerId, W, H);

      let cardW: number, cardH: number;
      if (isHuman && this.layoutMode === 'portrait') {
        // Match the actual hand card size
        const bounds = this.layoutProvider.getSlotBounds('bottom', W, H);
        cardH = bounds.height * 1.05;
        cardW = cardH * CARD_RATIO;
      } else {
        cardW = isHuman ? s.playerW : s.oppW;
        cardH = isHuman ? s.playerH : s.oppH;
      }

      // Start position
      const central = this.layoutProvider.getCentralArea(W, H);
      const startX = central.drawPile!.x;
      const startY = central.drawPile!.y;

      const tempCardOpts = isHuman
        ? unoCardOptions(card, { width: cardW, height: cardH })
        : unoBackOptions({ width: cardW, height: cardH });
      const tempCard = new CardRenderer(this, card, tempCardOpts);
      tempCard.container.setPosition(startX, startY);
      tempCard.container.setDepth(200);

      this.tweens.add({
        targets: tempCard.container,
        x: target.x,
        y: target.y,
        rotation: target.rotation,
        duration: 450,
        ease: 'Power2',
        onComplete: () => {
          tempCard.destroy();
          // Show the card now that animation is done
          if (isHuman) {
            const handRenderers = this.handRenderers.get(this.humanPlayerId) ?? [];
            const lastRenderer = handRenderers[handRenderers.length - 1];
            if (lastRenderer) lastRenderer.container.setVisible(true);
          }
          const slot = this.slots.find((sl) => sl.playerId === playerId);
          if (slot) {
            this._renderHand(slot, this.scale.width, this.scale.height);
          }
          onComplete();
        },
      });
    };

    if (isHuman) {
      // Re-render hand so renderers include the new card, then scroll to end
      const slot = this.slots.find((sl) => sl.playerId === playerId);
      if (slot) {
        this._renderHand(slot, W, H);
      }
      // Hide the new card during scroll + draw animation
      const handRenderers = this.handRenderers.get(this.humanPlayerId) ?? [];
      const lastRenderer = handRenderers[handRenderers.length - 1];
      if (lastRenderer) lastRenderer.container.setVisible(false);

      this._scrollHandToEnd().then(doAnimation);
    } else {
      doAnimation();
    }
  }

  private _animateDrawSequence(playerId: string, count: number, isHuman: boolean, onComplete: () => void): void {
    if (count <= 0) { onComplete(); return; }
    this._animateDrawCard(playerId, isHuman, () => {
      this._animateDrawSequence(playerId, count - 1, isHuman, onComplete);
    });
  }

  private _preGeneratePileTransform(wildColor?: string | null): { rotation: number; offsetX: number; offsetY: number; wildColor: string | null } {
    const transform = {
      rotation: (Math.random() - 0.5) * 0.3,
      offsetX: (Math.random() - 0.5) * 8,
      offsetY: (Math.random() - 0.5) * 8,
      wildColor: wildColor ?? null,
    };
    this.discardPileTransforms.push(transform);
    return transform;
  }

  /** Get the position where the next card will be added to a player's hand. */
  private _getHandEndPosition(playerId: string, W: number, H: number): { x: number; y: number; rotation: number } {
    const slot = this.slots.find((sl) => sl.playerId === playerId);
    if (!slot) return { x: W / 2, y: H / 2, rotation: 0 };

    const player = this.state.players.find((p) => p.id === playerId);
    const count = player?.hand.count ?? 1;
    const pos = slot.position;

    if (this.layoutMode === 'portrait') {
      const s = portCardSizes(H);
      if (pos === 'bottom') {
        const bounds = this.layoutProvider.getSlotBounds('bottom', W, H);
        const cardH = bounds.height * 1.05;
        const cardW = cardH * CARD_RATIO;
        const step = cardW * 0.48;
        const totalWidth = step * (count - 1);
        const startX = W / 2 - totalWidth / 2 + this._scrubOffset;
        const cy = bounds.y + bounds.height / 2 + cardH * 0.08;
        const x = startX + (count - 1) * step;
        return { x, y: cy, rotation: 0 };
      } else if (pos === 'top') {
        const bounds = this.layoutProvider.getSlotBounds(pos, W, H);
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        return { x: cx, y: cy, rotation: Math.PI };
      } else {
        // Side slots
        const bounds = this.layoutProvider.getSlotBounds(pos, W, H);
        const cx = bounds.x + bounds.width / 2;
        const step = Math.min(s.oppStep, count > 1 ? (bounds.height - s.oppW) / (count - 1) : 0);
        const totalH = step * (count - 1);
        const cy = bounds.y + bounds.height / 2;
        const y = cy - totalH / 2 + (count - 1) * step;
        const rotation = pos.startsWith('left') ? Math.PI / 2 : -Math.PI / 2;
        return { x: cx, y, rotation };
      }
    } else {
      // Landscape
      const s = cardSizes(H);
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
        const bounds = this.layoutProvider.getSlotBounds(pos, W, H);
        const maxStep = count > 1 ? (bounds.height - s.oppW) / (count - 1) : 0;
        const step = Math.min(s.oppStep, maxStep);
        const totalSpread = step * (count - 1);
        const cy = H / 2;
        const x = s.oppH / 2 - s.oppSidePeek;
        const y = cy - totalSpread / 2 + (count - 1) * step;
        return { x, y, rotation: Math.PI / 2 };
      } else if (pos === 'right') {
        const bounds = this.layoutProvider.getSlotBounds(pos, W, H);
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
        const bounds = this.layoutProvider.getSlotBounds(pos, W, H, topSlots.length, topIdx);
        const maxStep = count > 1 ? (bounds.width - s.oppW) / (count - 1) : 0;
        const step = Math.min(s.oppStep, maxStep);
        const totalSpread = step * (count - 1);
        const cx = bounds.x + bounds.width / 2;
        const x = cx - totalSpread / 2 + (count - 1) * step;
        const y = s.oppH / 2 - s.oppPeek;
        return { x, y, rotation: Math.PI };
      }
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
