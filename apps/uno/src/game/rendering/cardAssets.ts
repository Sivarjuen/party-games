import type { Card } from '@party/cards';
import type { CardRenderOptions } from '@party/cards';

// ── Uno color map ─────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, number> = {
  red: 0xe74c3c,
  blue: 0x3498db,
  green: 0x2ecc71,
  yellow: 0xf1c40f,
};
const WILD_COLOR = 0x2c2c2c;

/**
 * Maps an Uno card to its asset texture key.
 */
export function getCardAssetKey(card: Card): string {
  switch (card.type) {
    case 'number': return `card-${card.value ?? 0}`;
    case 'skip': return 'card-skip';
    case 'reverse': return 'card-rev';
    case 'draw-two': return 'card-plus2';
    case 'wild': return 'card-wild';
    case 'wild-draw-four': return 'card-plus4';
    default: return 'card-0';
  }
}

/**
 * Returns the fill color for an Uno card.
 * For wild cards, uses the chosen color if provided, otherwise black.
 */
export function getCardFillColor(card: Card, chosenWildColor?: string | null): number {
  if (card.color === null) {
    if (chosenWildColor && COLOR_MAP[chosenWildColor]) {
      return COLOR_MAP[chosenWildColor];
    }
    return WILD_COLOR;
  }
  return COLOR_MAP[card.color] ?? WILD_COLOR;
}

/**
 * Builds CardRenderOptions for an Uno card (face-up).
 */
export function unoCardOptions(
  card: Card,
  opts: { width?: number; height?: number; interactive?: boolean; chosenWildColor?: string | null } = {},
): CardRenderOptions {
  return {
    assetKey: getCardAssetKey(card),
    backAssetKey: 'card-back',
    fillColor: getCardFillColor(card, opts.chosenWildColor),
    faceDown: false,
    width: opts.width,
    height: opts.height,
    interactive: opts.interactive,
  };
}

/**
 * Builds CardRenderOptions for a face-down Uno card.
 */
export function unoBackOptions(
  opts: { width?: number; height?: number } = {},
): CardRenderOptions {
  return {
    backAssetKey: 'card-back',
    faceDown: true,
    width: opts.width,
    height: opts.height,
  };
}
