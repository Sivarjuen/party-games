import type Phaser from 'phaser';
import type { Card } from '../types';

const HIGHLIGHT_BORDER = 0xff9900;

export interface CardRenderOptions {
  /** Phaser texture key for the card face image. Required if not faceDown. */
  assetKey?: string;
  /** Phaser texture key for the card back image. Required if faceDown. */
  backAssetKey?: string;
  /** Fill color shown behind transparent areas of the card image. */
  fillColor?: number;
  faceDown?: boolean;
  interactive?: boolean;
  /** Card width in pixels. Default: 120. */
  width?: number;
  /** Card height in pixels. Default: 180. */
  height?: number;
}

export class CardRenderer {
  private _container: Phaser.GameObjects.Container;
  private _card: Card;
  private _faceDown: boolean;
  private _highlighted: boolean = false;
  private _w: number;
  private _h: number;
  private _borderGfx: Phaser.GameObjects.Graphics;
  private _colorBg: Phaser.GameObjects.Graphics;
  private _sprite: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, card: Card, options: CardRenderOptions = {}) {
    this._card = card;
    this._faceDown = options.faceDown ?? false;
    this._w = options.width ?? 120;
    this._h = options.height ?? 180;

    const w = this._w;
    const h = this._h;

    this._container = scene.add.container(0, 0);

    // Border graphics (only visible when highlighted)
    this._borderGfx = scene.add.graphics();
    this._container.add(this._borderGfx);

    // Color background (shows through transparent areas of the card image)
    this._colorBg = scene.add.graphics();
    this._container.add(this._colorBg);

    // Card image sprite — scale uniformly to fit within w×h (no distortion)
    const textureKey = this._faceDown
      ? (options.backAssetKey ?? 'card-back')
      : (options.assetKey ?? 'card-back');
    this._sprite = scene.add.image(0, 0, textureKey);
    const fitScale = Math.min(w / this._sprite.width, h / this._sprite.height);
    this._sprite.setScale(fitScale * 2.2);
    // this._sprite.setSize(1, 1);
    this._container.add(this._sprite);

    // Draw color fill behind the image (for transparent card art)
    // Offset down a few pixels to align with asset visual
    if (!this._faceDown && options.fillColor !== undefined) {
      this._colorBg.fillStyle(options.fillColor, 1);
      this._colorBg.fillRect(-w / 2, -h / 2 + 3, w, h);
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

  setHighlighted(highlighted: boolean): void {
    if (this._highlighted === highlighted) return;
    this._highlighted = highlighted;
    this._redraw();
  }

  destroy(): void {
    this._container.destroy(true);
  }

  private _redraw(): void {
    const w = this._w;
    const h = this._h;
    const scale = h / 180;

    this._borderGfx.clear();

    if (this._highlighted) {
      const outerBorder = Math.round(6 * scale);
      const cornerRadius = Math.round(16 * scale);
      this._borderGfx.fillStyle(HIGHLIGHT_BORDER, 1);
      this._borderGfx.fillRoundedRect(
        -w / 2 - outerBorder, -h / 2 - outerBorder,
        w + outerBorder * 2, h + outerBorder * 2,
        cornerRadius,
      );
    }
  }
}
