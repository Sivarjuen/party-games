import type Phaser from 'phaser';
import type { Card } from '../types';

const HIGHLIGHT_BORDER = 0xff9900;

export interface CardRenderOptions {
  /** Phaser texture key for the card face image. Required if not faceDown. */
  assetKey?: string;
  /** Phaser texture key for the card back image. Required if faceDown. */
  backAssetKey?: string;
  /** Phaser texture key for the card background image (tinted with fillColor). */
  backgroundAssetKey?: string;
  /** Fill color to tint the background image. */
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
  private _bgSprite: Phaser.GameObjects.Image | null = null;
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

    // Background sprite (tinted with fillColor, shows through transparent card art)
    if (!this._faceDown && options.backgroundAssetKey && options.fillColor !== undefined) {
      this._bgSprite = scene.add.image(0, 0, options.backgroundAssetKey);
      const bgFitScale = Math.min(w / this._bgSprite.width, h / this._bgSprite.height);
      this._bgSprite.setScale(bgFitScale);
      this._bgSprite.setTint(options.fillColor);
      this._container.add(this._bgSprite);
    }

    // Card image sprite — scale uniformly to fit within w×h
    const textureKey = this._faceDown
      ? (options.backAssetKey ?? 'card-back')
      : (options.assetKey ?? 'card-back');
    this._sprite = scene.add.image(0, 0, textureKey);
    const fitScale = Math.min(w / this._sprite.width, h / this._sprite.height);
    this._sprite.setScale(fitScale);
    this._container.add(this._sprite);

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
      const borderWidth = Math.round(4 * scale);
      const cornerRadius = Math.round(12 * scale);
      // Inset the stroke slightly so it sits on top of the card edge (no gap)
      const inset = 0;
      const halfW = w / 2 - inset;
      const halfH = h / 2 - borderWidth / 2;
      this._borderGfx.lineStyle(borderWidth, HIGHLIGHT_BORDER, 1);
      this._borderGfx.strokeRoundedRect(
        -halfW, -halfH,
        halfW * 2, halfH * 2,
        cornerRadius,
      );
    }
  }
}
