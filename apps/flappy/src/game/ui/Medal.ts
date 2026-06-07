import { MEDAL_TIERS } from '../constants';

export function getMedalForScore(score: number): { name: string; color: number } | null {
  for (const tier of MEDAL_TIERS) {
    if (score >= tier.threshold) {
      return { name: tier.name, color: tier.color };
    }
  }
  return null;
}
