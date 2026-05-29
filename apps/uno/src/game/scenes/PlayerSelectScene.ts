import Phaser from 'phaser';

export class PlayerSelectScene extends Phaser.Scene {
  constructor() {
    super('PlayerSelectScene');
  }

  create(): void {
    const W = this.scale.width;
    const H = this.scale.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x1a472a);

    this.add
      .text(W / 2, H / 2 - 200, 'UNO', {
        fontFamily: 'Consolas, monospace',
        fontSize: '96px',
        color: '#ffdd00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0.5);

    this.add
      .text(W / 2, H / 2 - 80, 'Select number of players', {
        fontFamily: 'Consolas, monospace',
        fontSize: '32px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0.5);

    const counts = [2, 3, 4, 5, 6];
    const btnW = 120;
    const gap = 24;
    const totalW = counts.length * btnW + (counts.length - 1) * gap;
    const startX = W / 2 - totalW / 2 + btnW / 2;

    counts.forEach((n, i) => {
      const bx = startX + i * (btnW + gap);
      const by = H / 2 + 40;

      const bg = this.add
        .rectangle(bx, by, btnW, 80, 0x5a3fa0)
        .setInteractive({ useHandCursor: true });

      this.add
        .text(bx, by, String(n), {
          fontFamily: 'Consolas, monospace',
          fontSize: '36px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5, 0.5);

      bg.on('pointerover', () => bg.setFillStyle(0x7b5ec4));
      bg.on('pointerout', () => bg.setFillStyle(0x5a3fa0));
      bg.on('pointerdown', () => {
        this.scene.start('UnoGameScene', { playerCount: n, humanIndex: 0 });
      });
    });

    this.add
      .text(W / 2, H / 2 + 160, '(You are always Player 1)', {
        fontFamily: 'Consolas, monospace',
        fontSize: '20px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5, 0.5);
  }
}
