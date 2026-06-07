import { Bird } from '../entities/Bird';
import { PipePair } from '../entities/PipePair';
import { saveHighScore, loadHighScore } from '../../utils/storage';

export class ScoreSystem {
  private _score: number = 0;
  private _highScore: number = 0;

  constructor() {
    this._highScore = loadHighScore();
  }

  get score(): number {
    return this._score;
  }

  get highScore(): number {
    return this._highScore;
  }

  reset(): void {
    this._score = 0;
  }

  /**
   * Check each pipe; if the bird has passed a pipe that hasn't scored yet, add a point.
   */
  check(bird: Bird, pipes: PipePair[]): boolean {
    let scored = false;
    for (const pipe of pipes) {
      if (!pipe.scored && bird.x > pipe.x) {
        pipe.scored = true;
        this._score++;
        scored = true;
      }
    }
    return scored;
  }

  finalize(): void {
    if (this._score > this._highScore) {
      this._highScore = this._score;
      saveHighScore(this._score);
    }
  }
}
