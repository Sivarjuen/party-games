import type { BoundingBox } from '@party/cards';

// ── Slot positions ──────────────────────────────────────────────────────────

/** Landscape slots (existing) */
export type LandscapeSlotPosition =
  | 'bottom'
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'left'
  | 'right';

/** Portrait slots — opponents on left/right sides and top */
export type PortraitSlotPosition =
  | 'bottom'
  | 'top'
  | 'left-top'
  | 'left-bottom'
  | 'right-top'
  | 'right-bottom';

export type SlotPosition = LandscapeSlotPosition | PortraitSlotPosition;

export interface SlotConfig {
  position: SlotPosition;
  playerId: string;
  /** Rotation applied to the entire hand fan (radians). */
  handRotation: number;
}

// ── Layout provider interface ───────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface CentralArea {
  discardPile: Point;
  /** Null in portrait mode (no visible draw pile). */
  drawPile: Point | null;
}

export interface TableLayoutProvider {
  /** Get opponent slot positions for a given player count (excludes the human 'bottom' slot). */
  getOpponentSlots(playerCount: number): SlotPosition[];

  /** Get the bounding box for a slot. */
  getSlotBounds(
    slot: SlotPosition,
    W: number,
    H: number,
    /** Context for slots that share a row (e.g. top slots in landscape). */
    groupCount?: number,
    groupIndex?: number,
  ): BoundingBox;

  /** Get positions for the central play area. */
  getCentralArea(W: number, H: number): CentralArea;

  /** Rotation of the hand fan per slot so cards face the center. */
  getSlotRotation(slot: SlotPosition): number;
}
