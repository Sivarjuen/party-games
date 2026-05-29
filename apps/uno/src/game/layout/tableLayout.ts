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
 * Opponents listed in clockwise order starting from the player's left.
 *
 * Clockwise from bottom: left → top-left → top-center → top-right → right
 */
const OPPONENT_SLOTS: Record<number, SlotPosition[]> = {
  2: ['top-center'],
  3: ['left', 'top-center'],
  4: ['left', 'top-center', 'right'],
  5: ['left', 'top-left', 'top-right', 'right'],
  6: ['left', 'top-left', 'top-center', 'top-right', 'right'],
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

/**
 * Assigns table positions to players in play order (clockwise from human).
 * `playerIds` must be in the actual turn order (index 0 goes first).
 * `humanPlayerId` identifies which player sits at the bottom.
 */
export function getTableLayout(
  playerIds: string[],
  humanPlayerId: string,
): SlotConfig[] {
  const playerCount = playerIds.length;
  if (playerCount < 2 || playerCount > 6) {
    throw new Error(`Invalid player count: ${playerCount}`);
  }

  const opponentSlots = OPPONENT_SLOTS[playerCount];
  const slots: SlotConfig[] = [];

  // Find the human's position in the play order
  const humanIdx = playerIds.indexOf(humanPlayerId);

  // Human at bottom
  slots.push({
    position: 'bottom',
    playerId: humanPlayerId,
    handRotation: SLOT_ROTATION['bottom'],
  });

  // Assign opponents in clockwise play order starting from the player after human
  let opponentSlotIdx = 0;
  for (let offset = 1; offset < playerCount; offset++) {
    const idx = (humanIdx + offset) % playerCount;
    const pos = opponentSlots[opponentSlotIdx++];
    slots.push({
      position: pos,
      playerId: playerIds[idx],
      handRotation: SLOT_ROTATION[pos],
    });
  }

  return slots;
}

const TOP_OFFSET = 30;
const SIDE_OFFSET = 40;
const BOT_OFFSET = 30;
const HAND_HEIGHT = 220;
const SIDE_HAND_WIDTH = 220;
const TOP_GAP = 40; // minimum gap between top opponent sections

export function getSlotBounds(
  slot: SlotPosition,
  canvasWidth: number,
  canvasHeight: number,
  /** How many top slots are active (needed to divide space evenly). Default: 1 */
  topSlotCount?: number,
  /** Which top slot index this is (0-based left to right). Default: 0 */
  topSlotIndex?: number,
): BoundingBox {
  switch (slot) {
    case 'bottom':
      return {
        x: 0,
        y: canvasHeight - HAND_HEIGHT + BOT_OFFSET,
        width: canvasWidth,
        height: HAND_HEIGHT,
      };
    case 'top-center':
    case 'top-left':
    case 'top-right': {
      // Divide the top edge into equal sections, pushed toward corners
      const sideReserved = 40; // minimal margin from screen edge
      const availableWidth = canvasWidth - sideReserved * 2;
      const numTop = topSlotCount ?? 1;
      const idx = topSlotIndex ?? 0;
      const sectionWidth = (availableWidth - TOP_GAP * (numTop - 1)) / numTop;
      const startX = sideReserved + idx * (sectionWidth + TOP_GAP);
      return {
        x: startX,
        y: -TOP_OFFSET,
        width: sectionWidth,
        height: HAND_HEIGHT,
      };
    }
    case 'left':
      return {
        x: -SIDE_OFFSET,
        y: canvasHeight * 0.18,
        width: SIDE_HAND_WIDTH,
        height: canvasHeight * 0.64,
      };
    case 'right':
      return {
        x: canvasWidth + SIDE_OFFSET - SIDE_HAND_WIDTH,
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
  const cy = canvasHeight * 0.5;  // shifted up from center
  const gap = 260; // half-gap between draw and discard centres
  return {
    drawPile:    { x: cx - gap, y: cy },
    discardPile: { x: cx,       y: cy },
  };
}
