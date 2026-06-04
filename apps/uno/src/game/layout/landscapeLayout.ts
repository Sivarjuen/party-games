/**
 * Landscape (horizontal) table layout.
 *
 * Opponents placed on left, right, and top edges.
 * Draw pile visible to the left of discard pile.
 */
import type { BoundingBox } from '@party/cards';
import type { SlotPosition, TableLayoutProvider, CentralArea } from './types';

const TOP_OFFSET = 30;
const SIDE_OFFSET = 40;
const BOT_OFFSET = 30;
const HAND_HEIGHT = 220;
const SIDE_HAND_WIDTH = 220;
const TOP_GAP = 40;

const OPPONENT_SLOTS: Record<number, SlotPosition[]> = {
  2: ['top-center'],
  3: ['left', 'top-center'],
  4: ['left', 'top-center', 'right'],
  5: ['left', 'top-left', 'top-right', 'right'],
  6: ['left', 'top-left', 'top-center', 'top-right', 'right'],
};

const SLOT_ROTATION: Record<string, number> = {
  'bottom': 0,
  'top-center': Math.PI,
  'top-left': Math.PI,
  'top-right': Math.PI,
  'left': Math.PI / 2,
  'right': -Math.PI / 2,
};

export const landscapeLayout: TableLayoutProvider = {
  getOpponentSlots(playerCount: number): SlotPosition[] {
    return OPPONENT_SLOTS[playerCount] ?? OPPONENT_SLOTS[6];
  },

  getSlotRotation(slot: SlotPosition): number {
    return SLOT_ROTATION[slot] ?? 0;
  },

  getSlotBounds(
    slot: SlotPosition,
    canvasWidth: number,
    canvasHeight: number,
    topSlotCount?: number,
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
        const sideReserved = 40;
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
      default:
        return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
    }
  },

  getCentralArea(canvasWidth: number, canvasHeight: number): CentralArea {
    const cx = canvasWidth / 2;
    const cy = canvasHeight * 0.5;
    const cardW = canvasHeight * 0.30 * (670 / 1043);
    const gap = cardW + 90;
    return {
      drawPile: { x: cx - gap, y: cy },
      discardPile: { x: cx, y: cy },
    };
  },
};
