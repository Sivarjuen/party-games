import Phaser from 'phaser';
import type { UnoGameState } from '../state/UnoGameState';
import type { SlotConfig, TableLayoutProvider } from '../layout/tableLayout';
import { getSlotBounds, getCentralAreaPositions, getLayoutProvider } from '../layout/tableLayout';
import { getLayoutMode } from '../layout/deviceContext';

const TEXT_RESOLUTION = window.devicePixelRatio || 1;

export class HudUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Direction icon (replaces text)
  private directionIcon: Phaser.GameObjects.Image;
  private directionTween: Phaser.Tweens.Tween | null = null;
  private currentDirection: 1 | -1 = 1;

  private drawStackBg: Phaser.GameObjects.Arc;
  private drawStackText: Phaser.GameObjects.Text;
  private unoCallText: Phaser.GameObjects.Text;
  private unoCallTween: Phaser.Tweens.Tween | null = null;
  private playerLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private slots: SlotConfig[] = [];
  private humanPlayerId: string = '';

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(50);

    // Turn direction icon — spinning clockwise by default
    this.directionIcon = scene.add.image(0, 0, 'turn-icon')
      .setDisplaySize(48, 48)
      .setAlpha(0.85);

    this._startSpin(1);

    this.drawStackBg = scene.add.circle(0, 0, 28, 0xffffff).setVisible(false);
    this.drawStackText = scene.add
      .text(0, 0, '', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '22px',
        color: '#000000',
        fontStyle: 'bold',
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.container.add([this.directionIcon, this.drawStackBg, this.drawStackText]);

    // UNO! call text — shown briefly when a player reaches 1 card
    this.unoCallText = scene.add
      .text(0, 0, 'UNO!', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '100px',
        color: '#f02a2aff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 16,
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false)
      .setDepth(300);
    this.container.add(this.unoCallText);
  }

  initPlayerLabels(slots: SlotConfig[], _W: number, _H: number, humanPlayerId?: string): void {
    this.slots = slots;
    if (humanPlayerId) this.humanPlayerId = humanPlayerId;
    for (const slot of slots) {
      const label = this.scene.add
        .text(0, 0, slot.playerId, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '18px',
          color: '#cccccc',
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5, 0)
        .setDepth(1);
      this.playerLabels.set(slot.playerId, label);
    }
    this.reposition(_W, _H);
  }

  updatePlayerLabel(playerId: string, name: string): void {
    this.playerLabels.get(playerId)?.setText(name);
  }

  reposition(W: number, H: number): void {
    const layoutMode = getLayoutMode(W, H);
    const provider = getLayoutProvider(W, H);

    // Direction icon
    if (layoutMode === 'portrait') {
      this.directionIcon.setPosition(44, 44);
    } else {
      this.directionIcon.setPosition(44, H - 44);
    }

    if (layoutMode === 'portrait') {
      this._repositionPortrait(W, H, provider);
    } else {
      this._repositionLandscape(W, H);
    }
  }

  private _repositionLandscape(W: number, H: number): void {
    const { drawPile, discardPile } = getCentralAreaPositions(W, H);
    const playerCardH = H * 0.30;
    this.drawStackBg.setPosition(drawPile.x, drawPile.y);
    this.drawStackText.setPosition(drawPile.x, drawPile.y);

    const topSlots = this.slots.filter((s) => s.position.startsWith('top'));

    for (const slot of this.slots) {
      const label = this.playerLabels.get(slot.playerId);
      if (!label) continue;

      let bounds;
      if (slot.position.startsWith('top')) {
        const topIdx = topSlots.findIndex((s) => s.playerId === slot.playerId);
        bounds = getSlotBounds(slot.position, W, H, topSlots.length, topIdx);
      } else {
        bounds = getSlotBounds(slot.position, W, H);
      }

      const cx = bounds.x + bounds.width / 2;
      let labelY: number;
      let labelX: number = cx;
      let labelRotation = 0;

      if (slot.position === 'bottom') {
        labelX = discardPile.x;
        labelY = discardPile.y - playerCardH / 2 - 60;
      } else if (slot.position.startsWith('top')) {
        labelY = H * 0.14;
      } else if (slot.position === 'left') {
        const oppH = H * 0.15;
        const oppSidePeek = oppH * 0.20;
        const cardX = oppH / 2 - oppSidePeek;
        labelX = cardX + oppH * 0.7 + 20;
        labelY = H / 2;
        labelRotation = Math.PI / 2;
      } else {
        const oppH = H * 0.15;
        const oppSidePeek = oppH * 0.20;
        const cardX = W - oppH / 2 + oppSidePeek;
        labelX = cardX - oppH * 0.7 - 20;
        labelY = H / 2;
        labelRotation = -Math.PI / 2;
      }
      label.setPosition(labelX, labelY);
      label.setRotation(labelRotation);
    }
  }

  private _repositionPortrait(W: number, H: number, provider: TableLayoutProvider): void {
    const central = provider.getCentralArea(W, H);
    const discardPile = central.discardPile;

    // Draw stack counter — position on the draw pile in portrait
    const drawPilePos = central.drawPile;
    if (drawPilePos) {
      this.drawStackBg.setPosition(drawPilePos.x, drawPilePos.y);
      this.drawStackText.setPosition(drawPilePos.x, drawPilePos.y);
    } else {
      this.drawStackBg.setPosition(discardPile.x, discardPile.y - H * 0.12);
      this.drawStackText.setPosition(discardPile.x, discardPile.y - H * 0.12);
    }

    for (const slot of this.slots) {
      const label = this.playerLabels.get(slot.playerId);
      if (!label) continue;

      const bounds = provider.getSlotBounds(slot.position, W, H);
      let labelX: number;
      let labelY: number;
      let labelRotation = 0;

      if (slot.position === 'bottom') {
        // Human label — below the top opponent name
        labelX = discardPile.x;
        labelY = H * 0.16;
      } else if (slot.position === 'top') {
        // Top opponent — label just below cards
        labelX = bounds.x + bounds.width / 2;
        labelY = bounds.y + bounds.height - H * 0.02;
      } else if (slot.position.startsWith('left')) {
        // Left side — label to the right of the cards, rotated vertical
        labelX = bounds.x + bounds.width + 4;
        labelY = bounds.y + bounds.height / 2;
        labelRotation = -Math.PI / 2;
      } else {
        // Right side — label to the left of the cards, rotated vertical
        labelX = bounds.x - 4;
        labelY = bounds.y + bounds.height / 2;
        labelRotation = Math.PI / 2;
      }

      label.setPosition(labelX, labelY);
      label.setRotation(labelRotation);
      label.setOrigin(0.5, 0.5);
    }
  }

  update(state: UnoGameState, _slots: SlotConfig[]): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    // Don't reposition if below minimum height
    if (H >= 600) {
      this.reposition(W, H);
    }

    // Update direction spin if changed
    if (state.direction !== this.currentDirection) {
      this.currentDirection = state.direction;
      this._startSpin(state.direction);
    }

    // Draw stack counter
    if (state.activeDrawStack > 0) {
      this.drawStackBg.setVisible(true);
      this.drawStackText.setText(`+${state.activeDrawStack}`).setVisible(true);
    } else {
      this.drawStackBg.setVisible(false);
      this.drawStackText.setVisible(false);
    }

    // Check if any player just reached 1 card
    // (called externally via showUnoCall when appropriate)

    // Highlight active label
    const currentPlayer = state.players[state.currentPlayerIndex];
    this.playerLabels.forEach((label, pid) => {
      const isActive = pid === currentPlayer.id;
      const isHuman = pid === this.humanPlayerId;

      if (isHuman) {
        if (isActive) {
          label.setText('YOUR TURN').setVisible(true);
          label.setFontSize(28);
          label.setColor('#ffdd00');
          label.setFontStyle('bold');
          label.setOrigin(0.5, 1);
        } else {
          label.setVisible(false);
        }
      } else {
        label.setColor(isActive ? '#ffdd00' : '#cccccc');
        label.setFontStyle(isActive ? 'bold' : 'normal');
      }
    });
  }

  private _startSpin(direction: 1 | -1): void {
    if (this.directionTween) {
      this.directionTween.destroy();
      this.directionTween = null;
    }

    // Flip the icon horizontally for counter-clockwise
    this.directionIcon.setFlipX(direction === -1);

    // Continuous slow rotation
    const spinDirection = direction === 1 ? 1 : -1;
    this.directionIcon.setRotation(0);
    this.directionTween = this.scene.tweens.add({
      targets: this.directionIcon,
      rotation: spinDirection * Math.PI * 2,
      duration: 4000,
      repeat: -1,
      ease: 'Linear',
    });
  }

  /** Flash "UNO!" text when a player reaches 1 card. */
  showUnoCall(): void {
    if (this.unoCallTween) {
      this.unoCallTween.destroy();
      this.unoCallTween = null;
    }

    // Position: same spot as draw stack, but shift up if draw stack is visible
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const { discardPile: dp } = getCentralAreaPositions(W, H);
    this.unoCallText.setPosition(dp.x, dp.y);

    this.unoCallText.setVisible(true).setAlpha(1).setScale(0.5);
    this.unoCallTween = this.scene.tweens.add({
      targets: this.unoCallText,
      scale: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      yoyo: false,
      onComplete: () => {
        this.scene.time.delayedCall(800, () => {
          this.scene.tweens.add({
            targets: this.unoCallText,
            alpha: 0,
            duration: 400,
            onComplete: () => {
              this.unoCallText.setVisible(false);
            },
          });
        });
      },
    });
  }

  destroy(): void {
    if (this.directionTween) this.directionTween.destroy();
    this.container.destroy(true);
    this.playerLabels.forEach((label) => label.destroy());
  }
}
