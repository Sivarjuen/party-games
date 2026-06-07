import { GameObjects, Scene } from 'phaser';
import { getMedalForScore } from './Medal';

export class GameOverOverlay {
  private container: GameObjects.Container;

  constructor(scene: Scene, score: number, highScore: number) {
    const W = scene.scale.width;
    const H = scene.scale.height;

    const bg = scene.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRect(0, 0, W, H);

    const title = scene.add.text(W / 2, H * 0.25, 'GAME OVER', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '56px',
      color: '#ff4444',
      stroke: '#000000',
      strokeThickness: 4,
      resolution: 2,
    }).setOrigin(0.5, 0.5);

    const items: GameObjects.GameObject[] = [bg, title];

    const scoreText = scene.add.text(W / 2, H * 0.38, `Score: ${score}`, {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '40px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0.5);
    items.push(scoreText);

    // Medal under the score
    const medal = getMedalForScore(score);
    if (medal) {
      const medalText = scene.add.text(W / 2, H * 0.46, medal.name, {
        fontFamily: 'Fredoka, sans-serif',
        fontSize: '64px',
        resolution: 2,
      }).setOrigin(0.5, 0.5);
      items.push(medalText);
    }

    const bestText = scene.add.text(W / 2, H * 0.56, `Best: ${highScore}`, {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '36px',
      color: '#ffdd44',
      resolution: 2,
    }).setOrigin(0.5, 0.5);
    items.push(bestText);

    const restartText = scene.add.text(W / 2, H * 0.66, 'Tap to restart', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '28px',
      color: '#aaaaaa',
      resolution: 2,
    }).setOrigin(0.5, 0.5);
    items.push(restartText);

    // Blink the restart text
    scene.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.container = scene.add.container(0, 0, items);
    this.container.setDepth(20);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
