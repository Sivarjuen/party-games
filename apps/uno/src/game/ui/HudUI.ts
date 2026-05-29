import Phaser from 'phaser';
import type { UnoGameState } from '../state/UnoGameState';
import type { SlotConfig } from '../layout/tableLayout';
import { getSlotBounds } from '../layout/tableLayout';

const W = 1920;
const H = 1080;

export class HudUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Turn arrow
  private turnArrow: Phaser.GameObjects.Triangle;
  // Direction indicator text
  private directionText: Phaser.GameObjects.Text;
  // Draw stack counter
  private drawStackBg: Phaser.GameObjects.Rectangle;
  private drawStackText: Phaser.GameObjects.Text;
  // Player name labels
  private playerLabels: Map<string, Phaser.GameObjects.Text> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(50);

    // Direction indicator (top-right corner)
    this.directionText = scene.add
      .text(W - 20, 20, '↻ Clockwise', {
        fontFamily: 'Consolas, monospace',
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(1, 0)
      .setAlpha(0.8);

    // Draw stack counter (near center)
    this.drawStackBg = scene.add
      .rectangle(W / 2, H / 2 - 120, 160, 50, 0xcc0000)
      .setVisible(false);
    this.drawStackText = scene.add
      .text(W / 2, H / 2 - 120, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5)
      .setVisible(false);

    // Turn arrow (small triangle, repositioned each update)
    this.turnArrow = scene.add.triangle(0, 0, 0, 0, 20, 10, 0, 20, 0xffdd00)
      .setDepth(51)
      .setVisible(false);

    this.container.add([
      this.directionText,
      this.drawStackBg,
      this.drawStackText,
      this.turnArrow,
    ]);
  }

  /**
   * Creates or updates player name labels for each slot.
   * Call once after layout is known.
   */
  initPlayerLabels(slots: SlotConfig[], canvasWidth: number, canvasHeight: number): void {
    for (const slot of slots) {
      const bounds = getSlotBounds(slot.position, canvasWidth, canvasHeight);
      const cx = bounds.x + bounds.width / 2;

      let labelY: number;
      if (slot.position === 'bottom') {
        labelY = bounds.y - 24;
      } else if (slot.position.startsWith('top')) {
        labelY = bounds.y + bounds.height + 8;
      } else if (slot.position === 'left') {
        labelY = bounds.y - 24;
      } else {
        labelY = bounds.y - 24;
      }

      const label = this.scene.add
        .text(cx, labelY, slot.playerId, {
          fontFamily: 'Consolas, monospace',
          fontSize: '18px',
          color: '#cccccc',
        })
        .setOrigin(0.5, 0)
        .setDepth(51);

      this.playerLabels.set(slot.playerId, label);
      this.container.add(label);
    }
  }

  updatePlayerLabel(playerId: string, name: string): void {
    this.playerLabels.get(playerId)?.setText(name);
  }

  update(state: UnoGameState, slots: SlotConfig[]): void {
    // Direction indicator
    const dir = state.direction === 1 ? '↻ Clockwise' : '↺ Counter-clockwise';
    this.directionText.setText(dir);

    // Draw stack counter
    if (state.activeDrawStack > 0) {
      this.drawStackBg.setVisible(true);
      this.drawStackText
        .setText(`Draw +${state.activeDrawStack}`)
        .setVisible(true);
    } else {
      this.drawStackBg.setVisible(false);
      this.drawStackText.setVisible(false);
    }

    // Turn arrow — point at the active player's slot
    const currentPlayer = state.players[state.currentPlayerIndex];
    const activeSlot = slots.find((s) => s.playerId === currentPlayer.id);
    if (activeSlot) {
      const bounds = getSlotBounds(activeSlot.position, W, H);
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;

      // Place arrow near the slot
      let ax = cx;
      let ay = cy;
      switch (activeSlot.position) {
        case 'bottom': ay = bounds.y - 30; break;
        case 'top-center':
        case 'top-left':
        case 'top-right': ay = bounds.y + bounds.height + 10; break;
        case 'left': ax = bounds.x + bounds.width + 10; break;
        case 'right': ax = bounds.x - 10; break;
      }

      this.turnArrow.setPosition(ax, ay).setVisible(true);
    }

    // Highlight active player label
    this.playerLabels.forEach((label, pid) => {
      const isActive = pid === currentPlayer.id;
      label.setColor(isActive ? '#ffdd00' : '#cccccc');
      label.setFontStyle(isActive ? 'bold' : 'normal');
    });
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
