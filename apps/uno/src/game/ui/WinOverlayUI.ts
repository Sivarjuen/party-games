import Phaser from 'phaser';

const TEXT_RESOLUTION = window.devicePixelRatio || 1;

export class WinOverlayUI {
  private container: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    canvasWidth: number,
    canvasHeight: number,
    winnerName: string,
  ) {
    const cx = canvasWidth / 2;
    const cy = canvasHeight / 2;

    const backdrop = scene.add
      .rectangle(0, 0, canvasWidth, canvasHeight, 0x000000, 0.75)
      .setOrigin(0, 0)
      .setInteractive();

    const panel = scene.add.rectangle(cx, cy, 600, 300, 0x1a1a2e);

    const title = scene.add
      .text(cx, cy - 70, '🎉 Game Over', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '42px',
        color: '#ffdd00',
        fontStyle: 'bold',
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);

    const winMessage = winnerName === 'You' ? 'You win!' : `${winnerName} wins!`;
    const winnerText = scene.add
      .text(cx, cy, winMessage, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '30px',
        color: '#ffffff',
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);

    const btnBg = scene.add
      .rectangle(cx, cy + 90, 220, 56, 0x5a3fa0)
      .setInteractive({ useHandCursor: true });

    const btnLabel = scene.add
      .text(cx, cy + 90, 'Play Again', {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '24px',
        color: '#ffffff',
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5, 0.5);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0x7b5ec4));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x5a3fa0));
    btnBg.on('pointerdown', () => scene.scene.restart());

    this.container = scene.add
      .container(0, 0, [backdrop, panel, title, winnerText, btnBg, btnLabel])
      .setDepth(200);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
