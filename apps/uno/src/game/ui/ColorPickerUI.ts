import Phaser from 'phaser';

const COLORS: Array<{ name: string; hex: number; label: string }> = [
  { name: 'red',    hex: 0xe74c3c, label: 'Red'    },
  { name: 'blue',   hex: 0x3498db, label: 'Blue'   },
  { name: 'green',  hex: 0x2ecc71, label: 'Green'  },
  { name: 'yellow', hex: 0xf1c40f, label: 'Yellow' },
];

const BTN_W = 160;
const BTN_H = 100;
const GAP = 20;
const TOTAL_W = COLORS.length * BTN_W + (COLORS.length - 1) * GAP;

export class ColorPickerUI {
  private container: Phaser.GameObjects.Container;
  private onChosen: (color: string) => void;

  constructor(
    scene: Phaser.Scene,
    canvasWidth: number,
    canvasHeight: number,
    onChosen: (color: string) => void,
  ) {
    this.onChosen = onChosen;

    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    // Semi-transparent backdrop
    const backdrop = scene.add
      .rectangle(0, 0, canvasWidth, canvasHeight, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setInteractive(); // blocks clicks through

    const prompt = scene.add
      .text(cx, cy - BTN_H - 30, 'Choose a color', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 1);

    const buttons: Phaser.GameObjects.GameObject[] = [];

    COLORS.forEach((c, i) => {
      const bx = cx - TOTAL_W / 2 + i * (BTN_W + GAP) + BTN_W / 2;
      const by = cy;

      const bg = scene.add
        .rectangle(bx, by, BTN_W, BTN_H, c.hex)
        .setInteractive({ useHandCursor: true });

      const label = scene.add
        .text(bx, by, c.label, {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '22px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0.5);

      bg.on('pointerover', () => bg.setScale(1.08));
      bg.on('pointerout', () => bg.setScale(1));
      bg.on('pointerdown', () => this._pick(c.name));

      buttons.push(bg, label);
    });

    this.container = scene.add
      .container(0, 0, [backdrop, prompt, ...buttons])
      .setDepth(100);
  }

  private _pick(color: string): void {
    this.container.setVisible(false);
    this.container.destroy(true);
    this.onChosen(color);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
