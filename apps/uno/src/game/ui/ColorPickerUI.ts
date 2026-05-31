import Phaser from 'phaser';

const TEXT_RESOLUTION = window.devicePixelRatio || 1;

const COLORS: Array<{ name: string; hex: number; label: string }> = [
  { name: 'red',    hex: 0xe74c3c, label: 'Red'    },
  { name: 'blue',   hex: 0x3498db, label: 'Blue'   },
  { name: 'green',  hex: 0x2ecc71, label: 'Green'  },
  { name: 'yellow', hex: 0xf1c40f, label: 'Yellow' },
];

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
    const isPortrait = canvasHeight / canvasWidth >= 1.2;

    // Semi-transparent backdrop
    const backdrop = scene.add
      .rectangle(0, 0, canvasWidth, canvasHeight, 0x000000, 0.6)
      .setOrigin(0, 0)
      .setInteractive(); // blocks clicks through

    const buttons: Phaser.GameObjects.GameObject[] = [];

    if (isPortrait) {
      // Portrait: 2×2 grid
      const btnW = canvasWidth * 0.35;
      const btnH = canvasHeight * 0.08;
      const gapX = 20;
      const gapY = 20;

      const prompt = scene.add
        .text(cx, cy - btnH - gapY - 20, 'Choose a color', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '28px',
          color: '#ffffff',
          fontStyle: 'bold',
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5, 1);
      buttons.push(prompt);

      COLORS.forEach((c, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const bx = cx + (col === 0 ? -(btnW / 2 + gapX / 2) : (btnW / 2 + gapX / 2));
        const by = cy + row * (btnH + gapY);

        const bg = scene.add
          .rectangle(bx, by, btnW, btnH, c.hex)
          .setInteractive({ useHandCursor: true });

        const label = scene.add
          .text(bx, by, c.label, {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            fontStyle: 'bold',
            resolution: TEXT_RESOLUTION,
          })
          .setOrigin(0.5, 0.5);

        bg.on('pointerover', () => bg.setScale(1.05));
        bg.on('pointerout', () => bg.setScale(1));
        bg.on('pointerdown', () => this._pick(c.name));

        buttons.push(bg, label);
      });
    } else {
      // Landscape: horizontal row
      const btnW = 160;
      const btnH = 100;
      const gap = 20;
      const totalW = COLORS.length * btnW + (COLORS.length - 1) * gap;

      const prompt = scene.add
        .text(cx, cy - btnH - 30, 'Choose a color', {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '32px',
          color: '#ffffff',
          fontStyle: 'bold',
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5, 1);
      buttons.push(prompt);

      COLORS.forEach((c, i) => {
        const bx = cx - totalW / 2 + i * (btnW + gap) + btnW / 2;
        const by = cy;

        const bg = scene.add
          .rectangle(bx, by, btnW, btnH, c.hex)
          .setInteractive({ useHandCursor: true });

        const label = scene.add
          .text(bx, by, c.label, {
            fontFamily: 'Fredoka, sans-serif',
            fontSize: '22px',
            color: '#ffffff',
            fontStyle: 'bold',
            resolution: TEXT_RESOLUTION,
          })
          .setOrigin(0.5, 0.5);

        bg.on('pointerover', () => bg.setScale(1.08));
        bg.on('pointerout', () => bg.setScale(1));
        bg.on('pointerdown', () => this._pick(c.name));

        buttons.push(bg, label);
      });
    }

    this.container = scene.add
      .container(0, 0, [backdrop, ...buttons])
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
