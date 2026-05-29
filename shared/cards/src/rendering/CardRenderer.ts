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
const OUTLINE_COLOR = 0x000000;

// Default sizes (used if width/height not provided)
const DEFAULT_WIDTH = 120;
const DEFAULT_HEIGHT = 180;

export interface CardRenderOptions {
  faceDown?: boolean;
  interactive?: boolean;
  dimmed?: boolean;
  /** Card width in pixels. Default: 120. */
  width?: number;
  /** Card height in pixels. Default: 180. */
  height?: number;
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
  private _card: Card;
  private _faceDown: boolean;
  private _dimmed: boolean;
  private _highlighted: boolean = false;
  private _w: number;
  private _h: number;

  constructor(scene: Phaser.Scene, card: Card, options: CardRenderOptions = {}) {
    this._card = card;
    this._faceDown = options.faceDown ?? false;
    this._dimmed = options.dimmed ?? false;
    this._w = options.width ?? DEFAULT_WIDTH;
    this._h = options.height ?? DEFAULT_HEIGHT;

    const w = this._w;
    const h = this._h;
    const scale = h / 180; // scale factor relative to base 180px height

    this._bg = scene.add.graphics();
    this._container = scene.add.container(0, 0);
    this._container.add(this._bg);

    if (!this._faceDown) {
      const label = cardLabel(card);
      const pad = 8 * scale;

      // Center — large
      const centerSize = Math.round(40 * scale);
      const centerLabel = scene.add.text(0, 0, label, {
        fontFamily: 'Consolas, monospace',
        fontSize: `${centerSize}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0.5, 0.5);

      // Top-left — small
      const cornerSize = Math.round(20 * scale);
      const tlLabel = scene.add.text(-w / 2 + pad * 1.1, -h / 2 + pad, label, {
        fontFamily: 'Consolas, monospace',
        fontSize: `${cornerSize}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(0, 0);

      // Bottom-right
      const brLabel = scene.add.text(w / 2 - pad * 1.1, h / 2 - pad, label, {
        fontFamily: 'Consolas, monospace',
        fontSize: `${cornerSize}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      }).setOrigin(1, 1);

      this._container.add([centerLabel, tlLabel, brLabel]);
    }

    if (options.interactive) {
      this._container.setSize(w, h);
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

  get width(): number { return this._w; }
  get height(): number { return this._h; }

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

    const w = this._w;
    const h = this._h;
    const scale = h / 180;
    const cornerRadius = 6 * scale;

    const fillColor = this._faceDown
      ? FACE_DOWN_COLOR
      : (this._card.color ? COLOR_MAP[this._card.color] ?? WILD_COLOR : WILD_COLOR);

    // Outer ring (highlight or outline)
    const outerBorder = Math.round(7 * scale);
    if (this._highlighted) {
      this._bg.fillStyle(HIGHLIGHT_BORDER, 1);
    } else {
      this._bg.fillStyle(OUTLINE_COLOR, 1);
    }
    this._bg.fillRoundedRect(
      -w / 2 - outerBorder, -h / 2 - outerBorder,
      w + outerBorder * 2, h + outerBorder * 2,
      cornerRadius + outerBorder,
    );

    // White border
    const innerBorder = Math.round(5 * scale);
    this._bg.fillStyle(BORDER_COLOR, 1);
    this._bg.fillRoundedRect(
      -w / 2 - innerBorder, -h / 2 - innerBorder,
      w + innerBorder * 2, h + innerBorder * 2,
      cornerRadius + innerBorder,
    );

    // Card body
    this._bg.fillStyle(fillColor, 1);
    this._bg.fillRoundedRect(-w / 2, -h / 2, w, h, cornerRadius);

    // Face-down pattern
    if (this._faceDown) {
      this._bg.lineStyle(Math.max(1, scale), 0x3a3a5c, 0.6);
      const inset = 4 * scale;
      this._bg.strokeRoundedRect(
        -w / 2 + inset, -h / 2 + inset,
        w - inset * 2, h - inset * 2,
        3 * scale,
      );
    }

    this._container.setAlpha(1);
  }
}
