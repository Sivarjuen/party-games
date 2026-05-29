/** A single card instance in play. */
export interface Card {
  id: string;           // unique instance ID (e.g. "red-7-a")
  color: string | null; // "red" | "blue" | "green" | "yellow" | null (wild)
  type: string;         // "number" | "skip" | "reverse" | "draw-two" | "wild" | "wild-draw-four"
  value?: number;       // 0–9 for number cards
  effect?: string;      // human-readable effect label, e.g. "skip"
}

/** Spec entry used to generate a deck. One entry may produce multiple cards. */
export interface CardSpec {
  color: string | null;
  type: string;
  value?: number;
  effect?: string;
  count: number; // how many copies to include
}

/** An ordered array of CardSpec entries that fully describes a deck. */
export type DeckDefinition = CardSpec[];

/**
 * Minimal interface that Hand (task 3) will satisfy.
 * Defined here so Player can reference it without a circular dependency.
 */
export interface HandLike {
  add(card: Card): void;
  remove(cardId: string): Card;
  readonly cards: readonly Card[];
  readonly count: number;
}

/** A player slot — extended by game-specific player types. */
export interface Player {
  id: string;
  type: 'human' | 'ai';
  hand: HandLike;
}

/** Minimal shared game state shape — extended by each game. */
export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1; // 1 = clockwise, -1 = counter-clockwise
}
