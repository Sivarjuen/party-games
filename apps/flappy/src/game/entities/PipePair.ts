import { GameObjects, Scene } from 'phaser';
import { PIPE_WIDTH, PIPE_SPEED } from '../constants';

export class PipePair {
  private graphics: GameObjects.Graphics;
  public x: number;
  public gapCenterY: number;
  public scored: boolean = false;
  private groundTop: number;
  private gap: number;
  private bodyColor: number;
  private capColor: number;

  constructor(scene: Scene, x: number, gapCenterY: number, groundTop: number, gap: number, bodyColor: number, capColor: number) {
    this.x = x;
    this.gapCenterY = gapCenterY;
    this.groundTop = groundTop;
    this.gap = gap;
    this.bodyColor = bodyColor;
    this.capColor = capColor;
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(3);
    this.draw();
  }

  update(delta: number): void {
    const dt = delta / 1000;
    this.x -= PIPE_SPEED * dt;
    this.draw();
  }

  isOffScreen(): boolean {
    return this.x + PIPE_WIDTH / 2 < 0;
  }

  getTopPipeBounds(): Phaser.Geom.Rectangle {
    const topPipeBottom = this.gapCenterY - this.gap / 2;
    return new Phaser.Geom.Rectangle(
      this.x - PIPE_WIDTH / 2,
      0,
      PIPE_WIDTH,
      topPipeBottom
    );
  }

  getBottomPipeBounds(): Phaser.Geom.Rectangle {
    const bottomPipeTop = this.gapCenterY + this.gap / 2;
    return new Phaser.Geom.Rectangle(
      this.x - PIPE_WIDTH / 2,
      bottomPipeTop,
      PIPE_WIDTH,
      this.groundTop - bottomPipeTop
    );
  }

  destroy(): void {
    this.graphics.destroy();
  }

  private draw(): void {
    this.graphics.clear();

    const halfW = PIPE_WIDTH / 2;
    const topPipeBottom = this.gapCenterY - this.gap / 2;
    const bottomPipeTop = this.gapCenterY + this.gap / 2;

    // Top pipe
    this.graphics.fillStyle(this.bodyColor);
    this.graphics.fillRect(this.x - halfW, 0, PIPE_WIDTH, topPipeBottom);
    // Top pipe cap
    this.graphics.fillStyle(this.capColor);
    this.graphics.fillRect(this.x - halfW - 5, topPipeBottom - 30, PIPE_WIDTH + 10, 30);

    // Bottom pipe
    this.graphics.fillStyle(this.bodyColor);
    this.graphics.fillRect(this.x - halfW, bottomPipeTop, PIPE_WIDTH, this.groundTop - bottomPipeTop);
    // Bottom pipe cap
    this.graphics.fillStyle(this.capColor);
    this.graphics.fillRect(this.x - halfW - 5, bottomPipeTop, PIPE_WIDTH + 10, 30);
  }
}
