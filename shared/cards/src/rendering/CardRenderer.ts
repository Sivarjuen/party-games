import type Phaser from 'phaser';
import type { Card } from '../types';

// ── Color map ─────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, number> = {
  red: 0xe74c3c,
  blue: 0x3498db,
  green: 0x2ecc71,
  yellow: 0xf1c40f,
};
const WILD_COLOR = 0x2c2c2c;
const FACE_DOWN_COLOR = 0x1a1a2e;
const BORDER_COLOR = 0xffffff;
const HIGHLIGHT_BORDER = 0xff9900;
const DIMMED_BORDER = 0x666666;

const CARD_WIDTH = 120;
const CARD_HEIGHT = 180;
const CORNER_RADIUS = 10;

export interface CardRenderOptions {
  faceDown?: boolean;
  interactive?: boolean;
  dimmed?: boolean;
}

function cardLabel(card: Card): string {
  switch (card.type) {
    case 'number': return String(card.value ?? '?');
    case 'skip': return 'Skip';
    case 'reverse': return 'Rev';
    case 'draw-two': return '+2';
    case 'wild': return 'Wild';
    case 'wild-draw-four': return '+4';
    default: return '?';
  }
}

export class CardRenderer {
  private _container: Phaser.GameObjects.Container;
  private _bg: Phaser.GameObjects.Graphics;
  private _labelCenter: Phaser.GameObjects.Text | null = null;
  private _labelTL: Phaser.GameObjects.Text | null = null;
  private _labelBR: Phaser.GameObjects.Text | null = null;
  private _card: Card;
  private _faceDown: boolean;
  private _dimmed: boolean;
  private _highlighted: boolean = false;

  constructor(scene: Phaser.Scene, card: Card, options: CardRenderOptions = {}) {
    this._card = card;
    this._faceDown = options.faceDown ?? false;
    this._dimmed = options.dimmed ?? false;

    this._bg = scene.add.graphics();
    this._container = scene.add.container(0, 0);
    this._container.add(this._bg);

    if (!this._faceDown) {
      const label = cardLabel(card);
      const PAD = 8;
      const half = CARD_HEIGHT / 2;
      const halfW = CARD_WIDTH / 2;

      // Center — large
      this._labelCenter = scene.add.text(0, 0, label, {
        fontFamily: 'Consolas, monospace',
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);

      // Top-left — small
      this._labelTL = scene.add.text(-halfW + PAD, -half + PAD, label, {
        fontFamily: 'Consolas, monospace',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0, 0);

      // Bottom-right — small, mirrored anchor (no rotation to avoid 6/9 ambiguity)
      this._labelBR = scene.add.text(halfW - PAD, half - PAD, label, {
        fontFamily: 'Consolas, monospace',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(1, 1);

      this._container.add([this._labelCenter, this._labelTL, this._labelBR]);
    }

    if (options.interactive) {
      this._container.setSize(CARD_WIDTH, CARD_HEIGHT);
      this._container.setInteractive();
    }

    this._redraw();
  }

  get container(): Phaser.GameObjects.Container {
    return this._container;
  }

  get card(): Card {
    return this._card;
  }

  static get width(): number { return CARD_WIDTH; }
  static get height(): number { return CARD_HEIGHT; }

  setDimmed(dimmed: boolean): void {
    if (this._dimmed === dimmed) return;
    this._dimmed = dimmed;
    this._redraw();
  }

  setHighlighted(highlighted: boolean): void {
    if (this._highlighted === highlighted) return;
    this._highlighted = highlighted;
    this._redraw();
  }

  destroy(): void {
    this._container.destroy(true);
  }

  private _redraw(): void {
    this._bg.clear();

    const fillColor = this._faceDown
      ? FACE_DOWN_COLOR
      : (this._card.color ? COLOR_MAP[this._card.color] ?? WILD_COLOR : WILD_COLOR);

    const borderColor = this._highlighted ? HIGHLIGHT_BORDER
      : this._dimmed ? DIMMED_BORDER
      : BORDER_COLOR;
    const borderWidth = this._highlighted ? 3 : 1.5;

    // Border
    this._bg.fillStyle(borderColor, 1);
    this._bg.fillRoundedRect(
      -CARD_WIDTH / 2 - borderWidth,
      -CARD_HEIGHT / 2 - borderWidth,
      CARD_WIDTH + borderWidth * 2,
      CARD_HEIGHT + borderWidth * 2,
      CORNER_RADIUS + borderWidth,
    );

    // Card body
    this._bg.fillStyle(fillColor, 1);
    this._bg.fillRoundedRect(
      -CARD_WIDTH / 2,
      -CARD_HEIGHT / 2,
      CARD_WIDTH,
      CARD_HEIGHT,
      CORNER_RADIUS,
    );

    // Face-down pattern: simple cross lines
    if (this._faceDown) {
      this._bg.lineStyle(2, 0x3a3a5c, 0.6);
      this._bg.strokeRoundedRect(
        -CARD_WIDTH / 2 + 6,
        -CARD_HEIGHT / 2 + 6,
        CARD_WIDTH - 12,
        CARD_HEIGHT - 12,
        4,
      );
    }

    // Dimming overlay — removed, use border/highlight only
    this._container.setAlpha(1);
  }
}
