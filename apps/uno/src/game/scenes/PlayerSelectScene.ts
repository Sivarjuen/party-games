import Phaser from 'phaser';

const TEXT_RESOLUTION = window.devicePixelRatio || 1;

export class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super('PlayerSelectScene');
  }

  preload(): void {
    this.load.image('card-back', '/assets/backgrounds/back.png');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;

    this.add.rectangle(W / 2, H / 2, W, H, 0x1a472a);

    // Card back image as central logo
    const logo = this.add.image(W / 2, H * 0.38, 'card-back');
    // Scale to roughly 30% of screen height
    const targetH = H * 0.4;
    const scale = targetH / logo.height;
    logo.setScale(scale);

    // "Select number of players" text near bottom
    this.add
      .text(W / 2, H * 0.75, 'Select number of players', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '28px',
        color: '#ffffff',
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);

    // Player count buttons near bottom
    const counts = [2, 3, 4, 5, 6];
    const btnW = 100;
    const gap = 20;
    const totalW = counts.length * btnW + (counts.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + btnW / 2;
    const btnY = H * 0.84;

    counts.forEach((n, i) => {
      const bx = startX + i * (btnW + gap);

      const bg = this.add
        .rectangle(bx, btnY, btnW, 70, 0x5a3fa0)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(bx, btnY, String(n), {
          fontFamily: 'Fredoka, sans-serif',
          fontSize: '32px',
          color: '#ffffff',
          fontStyle: 'bold',
          resolution: TEXT_RESOLUTION,
        })
        .setOrigin(0.5, 0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x7b5ec4));
      bg.on('pointerout', () => bg.setFillStyle(0x5a3fa0));
      bg.on('pointerdown', () => {
        this.scene.start('UnoGameScene', { playerCount: n, humanIndex: 0 });
      });
    });
  }
}
