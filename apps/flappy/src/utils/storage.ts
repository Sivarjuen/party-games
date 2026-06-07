import { HIGH_SCORE_KEY } from '../game/constants';

export function loadHighScore(): number {
  const stored = localStorage.getItem(HIGH_SCORE_KEY);
  return stored ? parseInt(stored, 10) : 0;
}

export function saveHighScore(score: number): void {
  const current = loadHighScore();
  if (score > current) {
    localStorage.setItem(HIGH_SCORE_KEY, score.toString());
  }
}
