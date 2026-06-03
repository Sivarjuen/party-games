import Phaser from 'phaser';

const TEXT_RESOLUTION = window.devicePixelRatio || 1;

export class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super('PlayerSelectScene');
  }

  preload(): void {
    this.load.svg('card-back', '/assets/backgrounds/card-back.svg', { width: 750, height: 1050 });
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    const isPortrait = H > W;

    this.add.rectangle(W / 2, H / 2, W, H, 0x1a472a);

    // Card back image as central logo
    const logo = this.add.image(W / 2, H * 0.35, 'card-back');
    const logoSize = isPortrait ? W * 0.5 : H * 0.4;
    const logoScale = logoSize / Math.max(logo.width, logo.height);
    logo.setScale(logoScale);

    // Font sizes relative to the smaller dimension
    const baseFontSize = Math.min(W, H) * 0.045;
    const btnFontSize = Math.min(W, H) * 0.055;

    // "Select number of players" text
    this.add
      .text(W / 2, H * 0.68, 'Select number of players', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: `${Math.round(baseFontSize)}px`,
        color: '#ffffff',
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);

    // Player count buttons — adapt to screen width
    const counts = [2, 3, 4, 5, 6];
    const maxBtnArea = W * 0.85; // use 85% of screen width for buttons
    const gap = Math.max(8, W * 0.02);
    const btnW = (maxBtnArea - gap * (counts.length - 1)) / counts.length;
    const btnH = btnW * 0.7;
    const startX = W / 2 - maxBtnArea / 2 + btnW / 2;
    const btnY = H * 0.80;

    counts.forEach((n, i) => {
      const bx = startX + i * (btnW + gap);

      const bg = this.add
        .rectangle(bx, btnY, btnW, btnH, 0x5a3fa0, 1)
        .setInteractive({ useHandCursor: true });

      // Round the button corners
      bg.setStrokeStyle(2, 0x7b5ec4);

      this.add
        .text(bx, btnY, String(n), {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: `${Math.round(btnFontSize)}px`,
          color: '#ffffff',
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5, 0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x7b5ec4));
      bg.on('pointerout', () => bg.setFillStyle(0x5a3fa0));
      bg.on('pointerdown', () => {
        this.scene.start('UnoGameScene', { playerCount: n, humanIndex: 0 });
      });
    });

    // Rebuild layout on resize
    this.scale.on('resize', () => {
      this.scene.restart();
    });
  }
}
