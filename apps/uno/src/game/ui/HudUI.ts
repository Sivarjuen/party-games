import Phaser from 'phaser';
import type { UnoGameState } from '../state/UnoGameState';
import type { SlotConfig } from '../layout/tableLayout';
import { getSlotBounds, getCentralAreaPositions } from '../layout/tableLayout';

export class HudUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Direction icon (replaces text)
  private directionIcon: Phaser.GameObjects.Image;
  private directionTween: Phaser.Tweens.Tween | null = null;
  private currentDirection: 1 | -1 = 1;

  private drawStackBg: Phaser.GameObjects.Rectangle;
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

    this.drawStackBg = scene.add.rectangle(0, 0, 160, 50, 0xcc0000).setVisible(false);
    this.drawStackText = scene.add
      .text(0, 0, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    this.container.add([this.directionIcon, this.drawStackBg, this.drawStackText]);

    // UNO! call text — shown briefly when a player reaches 1 card
    this.unoCallText = scene.add
      .text(0, 0, 'UNO!', {
        fontFamily: 'Consolas, monospace',
        fontSize: '48px',
        color: '#ff3333',
        fontStyle: 'bold',
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
          fontFamily: 'Consolas, monospace',
          fontSize: '18px',
          color: '#cccccc',
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
    // Direction icon — bottom left
    this.directionIcon.setPosition(44, H - 44);

    // Draw stack counter — to the right of the discard pile
    const { discardPile } = getCentralAreaPositions(W, H);
    const playerCardH = H * 0.30;
    const stackX = discardPile.x + playerCardH * (2 / 3) / 2 + 160;
    this.drawStackBg.setPosition(stackX, discardPile.y);
    this.drawStackText.setPosition(stackX, discardPile.y);
    // unoCallText position is set dynamically in showUnoCall based on draw stack visibility

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
        labelX = bounds.x + bounds.width;
        labelY = bounds.y + bounds.height / 2;
        labelRotation = Math.PI / 2;
      } else {
        labelX = bounds.x;
        labelY = bounds.y + bounds.height / 2;
        labelRotation = -Math.PI / 2;
      }
      label.setPosition(labelX, labelY);
      label.setRotation(labelRotation);
    }
  }

  update(state: UnoGameState, _slots: SlotConfig[]): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    this.reposition(W, H);

    // Update direction spin if changed
    if (state.direction !== this.currentDirection) {
      this.currentDirection = state.direction;
      this._startSpin(state.direction);
    }

    // Draw stack counter
    if (state.activeDrawStack > 0) {
      this.drawStackBg.setVisible(true);
      this.drawStackText.setText(`Draw +${state.activeDrawStack}`).setVisible(true);
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
    const { discardPile } = getCentralAreaPositions(W, H);
    const playerCardH = H * 0.30;
    const stackX = discardPile.x + playerCardH * (2 / 3) / 2 + 160;
    const offsetY = this.drawStackBg.visible ? -60 : 0;
    this.unoCallText.setPosition(stackX, discardPile.y + offsetY);

    this.unoCallText.setVisible(true).setAlpha(1).setScale(0.5);
    this.unoCallTween = this.scene.tweens.add({
      targets: this.unoCallText,
      scale: 1.2,
      duration: 300,
      ease: 'Back.easeOut',
      yoyo: false,
      onComplete: () => {
        this.scene.time.delayedCall(1200, () => {
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
