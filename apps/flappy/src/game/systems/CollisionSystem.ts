import { Bird } from '../entities/Bird';
import { PipePair } from '../entities/PipePair';

export class CollisionSystem {
  private groundTop: number;

  constructor(groundTop: number) {
    this.groundTop = groundTop;
  }

  check(bird: Bird, pipes: PipePair[]): boolean {
    const birdBounds = bird.getBounds();

    // Ground collision
    if (birdBounds.bottom >= this.groundTop) {
      return true;
    }

    // Ceiling collision
    if (birdBounds.top <= 0) {
      return true;
    }

    // Pipe collisions
    for (const pipe of pipes) {
      const topBounds = pipe.getTopPipeBounds();
      const bottomBounds = pipe.getBottomPipeBounds();

      if (
        Phaser.Geom.Rectangle.Overlaps(birdBounds, topBounds) ||
        Phaser.Geom.Rectangle.Overlaps(birdBounds, bottomBounds)
      ) {
        return true;
      }
    }

    return false;
  }
}
