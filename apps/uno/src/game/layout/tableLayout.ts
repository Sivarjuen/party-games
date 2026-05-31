/**
 * Table layout — shared logic and re-exports.
 *
 * This module provides:
 * - getTableLayout(): assigns players to slot positions (shared across all layouts)
 * - Re-exports from the layout provider system for backward compatibility
 */
import type { SlotPosition, SlotConfig, TableLayoutProvider } from './types';
import { landscapeLayout } from './landscapeLayout';

export type { SlotPosition, SlotConfig, TableLayoutProvider };
export type { Point, CentralArea, PortraitSlotPosition, LandscapeSlotPosition } from './types';
export { getLayoutProvider } from './layoutFactory';
export { landscapeLayout } from './landscapeLayout';
export { portraitLayout } from './portraitLayout';

// ── Shared: assign players to table positions ───────────────────────────────

/**
 * Assigns table positions to players in play order (clockwise from human).
 * `playerIds` must be in the actual turn order (index 0 goes first).
 * `humanPlayerId` identifies which player sits at the bottom.
 *
 * @param provider - The layout provider to use for slot assignments.
 *                   If omitted, uses landscape layout (backward compat).
 */
export function getTableLayout(
  playerIds: string[],
  humanPlayerId: string,
  provider?: TableLayoutProvider,
): SlotConfig[] {
  const playerCount = playerIds.length;
  if (playerCount < 2 || playerCount > 6) {
    throw new Error(`Invalid player count: ${playerCount}`);
  }

  const layout = provider ?? landscapeLayout;
  const opponentSlots = layout.getOpponentSlots(playerCount);
  const slots: SlotConfig[] = [];

  // Find the human's position in the play order
  const humanIdx = playerIds.indexOf(humanPlayerId);

  // Human at bottom
  slots.push({
    position: 'bottom',
    playerId: humanPlayerId,
    handRotation: layout.getSlotRotation('bottom'),
  });

  // Assign opponents in clockwise play order starting from the player after human
  let opponentSlotIdx = 0;
  for (let offset = 1; offset < playerCount; offset++) {
    const idx = (humanIdx + offset) % playerCount;
    const pos = opponentSlots[opponentSlotIdx++];
    slots.push({
      position: pos,
      playerId: playerIds[idx],
      handRotation: layout.getSlotRotation(pos),
    });
  }

  return slots;
}

// ── Backward-compatible wrappers ────────────────────────────────────────────
// These delegate to the landscape layout by default for existing code that
// imports them directly. New code should use getLayoutProvider() instead.

import type { BoundingBox } from '@party/cards';

export function getSlotBounds(
  slot: SlotPosition,
  canvasWidth: number,
  canvasHeight: number,
  topSlotCount?: number,
  topSlotIndex?: number,
): BoundingBox {
  return landscapeLayout.getSlotBounds(slot, canvasWidth, canvasHeight, topSlotCount, topSlotIndex);
}

export function getCentralAreaPositions(
  canvasWidth: number,
  canvasHeight: number,
): { drawPile: { x: number; y: number }; discardPile: { x: number; y: number } } {
  const area = landscapeLayout.getCentralArea(canvasWidth, canvasHeight);
  return {
    drawPile: area.drawPile!,
    discardPile: area.discardPile,
  };
}
