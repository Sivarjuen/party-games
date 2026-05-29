import type { GameState, Card, Player } from '@party/cards';

export type GamePhase =
  | 'dealing'
  | 'playing'
  | 'color-pick'   // waiting for wild color selection
  | 'game-over';

export interface UnoPlayer extends Player {
  name: string;
}

export interface UnoGameState extends GameState {
  players: UnoPlayer[];
  drawPile: Card[];
  discardPile: Card[];        // top = discardPile[discardPile.length - 1]
  activeDrawStack: number;    // accumulated draw count from stacking; 0 = no stack active
  chosenWildColor: string | null;
  phase: GamePhase;
  winnerId: string | null;
  /** Whether the current player must skip (set by Skip/Draw effects, consumed by advanceTurn) */
  skipNext: boolean;
}
