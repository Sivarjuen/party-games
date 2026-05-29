import type { BoundingBox } from '@party/cards';

export type SlotPosition =
  | 'bottom'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'left'
  | 'right';

export interface SlotConfig {
  position: SlotPosition;
  playerId: string;
  /** Rotation applied to the entire hand fan (radians). */
  handRotation: number;
}

/**
 * Slot assignments by player count (human always at 'bottom').
 * Opponents are distributed around the table.
 *
 * | Players | Non-human slots                              |
 * |---------|----------------------------------------------|
 * | 2       | top-center                                   |
 * | 3       | top-left, top-right                          |
 * | 4       | top-center, left, right                      |
 * | 5       | top-left, top-right, left, right             |
 * | 6       | top-left, top-center, top-right, left, right |
 */
const OPPONENT_SLOTS: Record<number, SlotPosition[]> = {
  2: ['top-center'],
  3: ['top-left', 'top-right'],
  4: ['top-center', 'left', 'right'],
  5: ['top-left', 'top-right', 'left', 'right'],
  6: ['top-left', 'top-center', 'top-right', 'left', 'right'],
};

/** Rotation of the hand fan per slot so cards face the center. */
const SLOT_ROTATION: Record<SlotPosition, number> = {
  'bottom': 0,
  'top-center': Math.PI,
  'top-left': Math.PI,
  'top-right': Math.PI,
  'left': Math.PI / 2,
  'right': -Math.PI / 2,
};

export function getTableLayout(
  playerCount: number,
  humanIndex: number,
): SlotConfig[] {
  if (playerCount < 2 || playerCount > 6) {
    throw new Error(`Invalid player count: ${playerCount}`);
  }

  const opponentSlots = OPPONENT_SLOTS[playerCount];
  const slots: SlotConfig[] = [];

  // Human is always at bottom (index 0 in the players array after randomisation,
  // but we use humanIndex to find them)
  slots.push({
    position: 'bottom',
    playerId: `player-${humanIndex}`,
    handRotation: SLOT_ROTATION['bottom'],
  });

  // Assign opponents to remaining slots
  let opponentIdx = 0;
  for (let i = 0; i < playerCount; i++) {
    if (i === humanIndex) continue;
    const pos = opponentSlots[opponentIdx++];
    slots.push({
      position: pos,
      playerId: `player-${i}`,
      handRotation: SLOT_ROTATION[pos],
    });
  }

  return slots;
}

const MARGIN = 0;
const HAND_HEIGHT = 220;   // tall enough for 180px cards + arc dip
const SIDE_HAND_WIDTH = 220;

export function getSlotBounds(
  slot: SlotPosition,
  canvasWidth: number,
  canvasHeight: number,
): BoundingBox {
  const cx = canvasWidth / 2;

  switch (slot) {
    case 'bottom':
      return {
        x: MARGIN,
        y: canvasHeight - HAND_HEIGHT - MARGIN,
        width: canvasWidth - MARGIN * 2,
        height: HAND_HEIGHT,
      };
    case 'top-center':
      return {
        x: cx - canvasWidth * 0.25,
        y: MARGIN,
        width: canvasWidth * 0.5,
        height: HAND_HEIGHT,
      };
    case 'top-left':
      return {
        x: SIDE_HAND_WIDTH + MARGIN * 2,
        y: MARGIN,
        width: canvasWidth * 0.22,
        height: HAND_HEIGHT,
      };
    case 'top-right':
      return {
        x: canvasWidth - SIDE_HAND_WIDTH - MARGIN * 2 - canvasWidth * 0.22,
        y: MARGIN,
        width: canvasWidth * 0.22,
        height: HAND_HEIGHT,
      };
    case 'left':
      return {
        x: MARGIN,
        y: canvasHeight * 0.18,
        width: SIDE_HAND_WIDTH,
        height: canvasHeight * 0.64,
      };
    case 'right':
      return {
        x: canvasWidth - MARGIN - SIDE_HAND_WIDTH,
        y: canvasHeight * 0.18,
        width: SIDE_HAND_WIDTH,
        height: canvasHeight * 0.64,
      };
  }
}

export function getCentralAreaPositions(
  canvasWidth: number,
  canvasHeight: number,
): { drawPile: { x: number; y: number }; discardPile: { x: number; y: number } } {
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;
  const gap = 140; // half-gap between draw and discard centres
  return {
    drawPile:    { x: cx - gap, y: cy },
    discardPile: { x: cx,       y: cy },
  };
}
