/**
 * fanLayout — positions N cards in a tightly overlapping fan.
 *
 * Cards are spread horizontally with a fixed step between centres so they
 * always overlap. The whole fan is centred within the bounding box.
 * A gentle rotation arc is applied (centre card = 0, edges = ±halfArc).
 */

export interface CardTransform {
  x: number;
  y: number;
  rotation: number; // radians
}

export interface BoundingBox {
  x: number;      // left edge
  y: number;      // top edge
  width: number;
  height: number;
}

export interface FanOptions {
  /** Total rotation arc in radians. Default: Math.PI / 10 (~18°). */
  arcAngle?: number;
  /**
   * Pixel step between card centres. Defaults to cardWidth * 0.38 so cards
   * overlap by ~62%. Pass a larger value for more spread.
   */
  cardStep?: number;
  /** Card width in pixels — used to compute default step. Default: 120. */
  cardWidth?: number;
}

const DEFAULT_ARC_ANGLE = Math.PI / 10;  // ~18° total
const DEFAULT_CARD_WIDTH = 240;
const DEFAULT_OVERLAP_FACTOR = 0.38;     // step = cardWidth * this

export function fanLayout(
  count: number,
  bounds: BoundingBox,
  options?: FanOptions,
): CardTransform[] {
  if (count === 0) return [];

  const cx = bounds.x + bounds.width / 2;
  const cy = bounds.y + bounds.height / 2;

  if (count === 1) {
    return [{ x: cx, y: cy, rotation: 0 }];
  }

  const arcAngle = options?.arcAngle ?? DEFAULT_ARC_ANGLE;
  const cardWidth = options?.cardWidth ?? DEFAULT_CARD_WIDTH;
  const step = options?.cardStep ?? cardWidth * DEFAULT_OVERLAP_FACTOR;
  const halfArc = arcAngle / 2;

  // Total width of the fan
  const totalSpread = step * (count - 1);
  const startX = cx - totalSpread / 2;

  const transforms: CardTransform[] = [];

  for (let i = 0; i < count; i++) {
    // t: -1 (leftmost) → +1 (rightmost)
    const t = (2 * i) / (count - 1) - 1;

    const x = startX + i * step;
    const y = cy + Math.abs(t)**2 * 18;
    const rotation = t * halfArc;

    transforms.push({ x, y, rotation });
  }

  return transforms;
}
