/**
 * Portrait (vertical/mobile) table layout.
 *
 * Opponent placement by player count:
 *   2 players: 1 top
 *   3 players: 1 left, 1 right
 *   4 players: 1 left, 1 top, 1 right
 *   5 players: 2 left, 2 right
 *   6 players: 2 left, 1 top, 2 right
 *
 * No visible draw pile — drawn cards animate from top of screen.
 * Discard pile is large and centered.
 * Hand is large at the bottom with scrub-to-browse interaction.
 */
import type { BoundingBox } from '@party/cards';
import type { SlotPosition, TableLayoutProvider, CentralArea } from './types';

// ── Opponent slot assignments ───────────────────────────────────────────────

const OPPONENT_SLOTS: Record<number, SlotPosition[]> = {
  2: ['top'],
  3: ['left-top', 'right-top'],
  4: ['left-top', 'top', 'right-top'],
  5: ['left-bottom', 'left-top', 'right-top', 'right-bottom'],
  6: ['left-bottom', 'left-top', 'top', 'right-top', 'right-bottom'],
};

// ── Slot rotations (cards face center) ──────────────────────────────────────

const SLOT_ROTATION: Record<string, number> = {
  'bottom': 0,
  'top': Math.PI,
  'left-top': Math.PI / 2,
  'left-bottom': Math.PI / 2,
  'right-top': -Math.PI / 2,
  'right-bottom': -Math.PI / 2,
};

// ── Layout constants ────────────────────────────────────────────────────────

/** Fraction of screen height reserved for the player's hand area at bottom. */
const HAND_ZONE_FRAC = 0.28;

/** Fraction of screen width reserved for each side column. */
const SIDE_ZONE_FRAC = 0.14;

/** Top slot peeks off the top edge by this many pixels. */
const TOP_OFFSET = -20;

/** Height of opponent card area on the sides. */
const SIDE_SLOT_HEIGHT_FRAC = 0.15;

/** Gap between stacked side slots. */
const SIDE_GAP = 8;

export const portraitLayout: TableLayoutProvider = {
  getOpponentSlots(playerCount: number): SlotPosition[] {
    return OPPONENT_SLOTS[playerCount] ?? OPPONENT_SLOTS[6];
  },

  getSlotRotation(slot: SlotPosition): number {
    return SLOT_ROTATION[slot] ?? 0;
  },

  getSlotBounds(
    slot: SlotPosition,
    W: number,
    H: number,
  ): BoundingBox {
    const handZoneH = H * HAND_ZONE_FRAC;
    const sideW = W * SIDE_ZONE_FRAC;
    const slotH = H * SIDE_SLOT_HEIGHT_FRAC;

    switch (slot) {
      case 'bottom':
        return {
          x: 0,
          y: H - handZoneH,
          width: W,
          height: handZoneH,
        };

      case 'top':
        return {
          x: sideW,
          y: TOP_OFFSET,
          width: W - sideW * 2,
          height: slotH,
        };

      case 'left-top':
        return {
          x: 0,
          y: H * 0.14,
          width: sideW,
          height: slotH,
        };

      case 'left-bottom':
        return {
          x: 0,
          y: H * 0.14 + H * 0.40 - slotH,
          width: sideW,
          height: slotH,
        };

      case 'right-top':
        return {
          x: W - sideW,
          y: H * 0.14,
          width: sideW,
          height: slotH,
        };

      case 'right-bottom':
        return {
          x: W - sideW,
          y: H * 0.14 + H * 0.40 - slotH,
          width: sideW,
          height: slotH,
        };

      default:
        return { x: 0, y: 0, width: W, height: H };
    }
  },

  getCentralArea(W: number, H: number): CentralArea {
    const handZoneH = H * HAND_ZONE_FRAC;

    // Play area sits between the top of the screen and the hand zone
    const playAreaTop = H * 0.20;
    const playAreaBottom = H - handZoneH;
    const cy = (playAreaTop + playAreaBottom) / 2 - H * 0.11;
    const cx = W / 2;

    // Draw pile sits below the discard pile, rotated horizontally
    const discardH = H * 0.30;
    const drawPileY = cy + discardH / 2 + H * 0.09;

    return {
      drawPile: { x: cx, y: drawPileY },
      discardPile: { x: cx, y: cy },
    };
  },
};
