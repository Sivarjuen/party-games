import { Scene } from 'phaser';
import { PipePair } from '../entities/PipePair';
import { PIPE_SPAWN_INTERVAL, GAP_PROGRESSION, PIPE_COLOR_TIERS } from '../constants';
import { randomPipeGapCenter } from '../../utils/random';

export class PipeSpawner {
  private scene: Scene;
  private pipes: PipePair[] = [];
  private timer: number = 0;
  private groundTop: number;
  private active: boolean = false;
  private pipeCount: number = 0;
  private score: number = 0;

  constructor(scene: Scene, groundTop: number) {
    this.scene = scene;
    this.groundTop = groundTop;
  }

  start(): void {
    this.active = true;
    this.timer = 0;
  }

  stop(): void {
    this.active = false;
  }

  reset(): void {
    for (const pipe of this.pipes) {
      pipe.destroy();
    }
    this.pipes = [];
    this.timer = 0;
    this.active = false;
    this.pipeCount = 0;
    this.score = 0;
  }

  setScore(score: number): void {
    this.score = score;
  }

  private getGapForCurrentPipe(): number {
    for (const [threshold, gap] of GAP_PROGRESSION) {
      if (this.pipeCount < threshold) {
        return gap;
      }
    }
    // Fallback (should never reach here due to Infinity)
    return GAP_PROGRESSION[GAP_PROGRESSION.length - 1][1];
  }

  private getPipeColors(): { body: number; cap: number } {
    const tiers = PIPE_COLOR_TIERS;
    const cycleLength = 175;
    const effectiveScore = this.score < cycleLength
      ? this.score
      : (this.score - cycleLength) % cycleLength;

    // Find the highest tier the effective score qualifies for
    let body = tiers[0][1];
    let cap = tiers[0][2];
    for (const [threshold, bodyColor, capColor] of tiers) {
      if (effectiveScore >= threshold) {
        body = bodyColor;
        cap = capColor;
      }
    }
    return { body, cap };
  }

  spawn(): void {
    const x = this.scene.scale.width + 50;
    const gap = this.getGapForCurrentPipe();
    const gapCenter = randomPipeGapCenter() * this.groundTop;
    const { body, cap } = this.getPipeColors();
    const pipe = new PipePair(this.scene, x, gapCenter, this.groundTop, gap, body, cap);
    this.pipes.push(pipe);
    this.pipeCount++;
  }

  update(delta: number): void {
    if (this.active) {
      this.timer += delta;
      if (this.timer >= PIPE_SPAWN_INTERVAL) {
        this.timer -= PIPE_SPAWN_INTERVAL;
        this.spawn();
      }
    }

    // Update all pipes
    for (const pipe of this.pipes) {
      pipe.update(delta);
    }

    // Remove off-screen pipes
    this.pipes = this.pipes.filter((pipe) => {
      if (pipe.isOffScreen()) {
        pipe.destroy();
        return false;
      }
      return true;
    });
  }

  getPipes(): PipePair[] {
    return this.pipes;
  }
}
