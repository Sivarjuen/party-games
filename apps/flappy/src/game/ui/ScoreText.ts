import { GameObjects, Scene } from 'phaser';
import { COLOR_SCORE } from '../constants';

export class ScoreText {
  private text: GameObjects.Text;

  constructor(scene: Scene) {
    const W = scene.scale.width;
    this.text = scene.add.text(W / 2, 80, '0', {
      fontFamily: 'Fredoka, sans-serif',
      fontSize: '72px',
      color: COLOR_SCORE,
      stroke: '#000000',
      strokeThickness: 4,
      resolution: 2,
    }).setOrigin(0.5, 0.5).setDepth(10);
  }

  setScore(score: number): void {
    this.text.setText(score.toString());

    // Pop animation
    this.text.setScale(1.3);
    this.text.scene.tweens.add({
      targets: this.text,
      scaleX: 1,
      scaleY: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });
  }

  setVisible(visible: boolean): void {
    this.text.setVisible(visible);
  }

  destroy(): void {
    this.text.destroy();
  }
}
