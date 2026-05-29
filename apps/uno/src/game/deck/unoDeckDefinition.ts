import type { DeckDefinition } from '@party/cards';

/**
 * Standard 108-card Uno deck definition.
 *
 * Per color (red, blue, green, yellow):
 *   - One 0
 *   - Two each of 1–9
 *   - Two Skip
 *   - Two Reverse
 *   - Two Draw Two
 * Total per color: 1 + 18 + 2 + 2 + 2 = 25 cards × 4 colors = 100
 *
 * Colorless:
 *   - Four Wild
 *   - Four Wild Draw Four
 * Total colorless: 8
 *
 * Grand total: 108
 */

const COLORS = ['red', 'blue', 'green', 'yellow'] as const;

export const UNO_DECK_DEFINITION: DeckDefinition = [
  // Number cards per color
  ...COLORS.flatMap((color) => [
    { color, type: 'number', value: 0, count: 1 },
    ...([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((v) => ({
      color,
      type: 'number' as const,
      value: v,
      count: 2,
    })),
  ]),

  // Action cards per color
  ...COLORS.flatMap((color) => [
    { color, type: 'skip', effect: 'skip', count: 2 },
    { color, type: 'reverse', effect: 'reverse', count: 2 },
    { color, type: 'draw-two', effect: 'draw-two', count: 2 },
  ]),

  // Wild cards (colorless)
  { color: null, type: 'wild', effect: 'wild', count: 4 },
  { color: null, type: 'wild-draw-four', effect: 'wild-draw-four', count: 4 },
];
