import { Deck, Hand } from '@party/cards';
import type { Card } from '@party/cards';
import { UNO_DECK_DEFINITION } from '../deck/unoDeckDefinition';
import type { UnoGameState, UnoPlayer } from './UnoGameState';

const INITIAL_HAND_SIZE = 7;

// ── Deal ──────────────────────────────────────────────────────────────────────

/**
 * Creates a fresh UnoGameState for `playerCount` players.
 * Player at `humanIndex` is type 'human'; all others are 'ai'.
 * Play order is randomised.
 */
export function dealInitialHands(
  playerCount: number,
  humanIndex: number,
): UnoGameState {
  if (playerCount < 2 || playerCount > 6) {
    throw new Error(`Invalid player count: ${playerCount}. Must be 2–6.`);
  }

  const deck = Deck.build(UNO_DECK_DEFINITION);

  // Custom AI name pool — shuffled and picked from
  const AI_NAMES = [
    'Maya', 'Tiger', 'Leo', 'Max', 'Jack',
  ];
  const shuffledNames = [...AI_NAMES];
  shuffleArray(shuffledNames);
  let nameIdx = 0;

  // Build players with empty hands
  const players: UnoPlayer[] = Array.from({ length: playerCount }, (_, i) => ({
    id: `player-${i}`,
    name: i === humanIndex ? 'You' : shuffledNames[nameIdx++] ?? `CPU ${i}`,
    type: i === humanIndex ? 'human' : 'ai',
    hand: new Hand(),
  }));

  // Randomise play order
  shuffleArray(players);

  // Deal 7 cards to each player
  for (let round = 0; round < INITIAL_HAND_SIZE; round++) {
    for (const player of players) {
      const card = deck.draw();
      if (card) player.hand.add(card);
    }
  }

  // Flip first discard — re-flip if Wild Draw Four
  let firstDiscard: Card | null = null;
  const returnedCards: Card[] = [];
  while (true) {
    const card = deck.draw();
    if (!card) break;
    if (card.type === 'wild-draw-four') {
      returnedCards.push(card);
      continue;
    }
    firstDiscard = card;
    break;
  }
  // Return Wild Draw Fours to deck
  if (returnedCards.length > 0) {
    deck.addCards(returnedCards);
  }

  const drawPile: Card[] = [];
  // Drain remaining deck into drawPile array (draw() pops from end)
  let c: Card | null;
  while ((c = deck.draw()) !== null) {
    drawPile.push(c);
  }

  const discardPile: Card[] = firstDiscard ? [firstDiscard] : [];

  // If the first discard is a wild card, randomly assign a color
  const UNO_COLORS = ['red', 'blue', 'green', 'yellow'];
  const chosenWildColor = (firstDiscard && firstDiscard.color === null)
    ? UNO_COLORS[Math.floor(Math.random() * UNO_COLORS.length)]
    : null;

  return {
    players,
    currentPlayerIndex: 0,
    direction: 1,
    drawPile,
    discardPile,
    activeDrawStack: 0,
    chosenWildColor,
    phase: 'playing',
    winnerId: null,
    skipNext: false,
  };
}

// ── Turn advancement ──────────────────────────────────────────────────────────

/**
 * Advances to the next player, respecting direction and skipNext flag.
 * Clears skipNext after consuming it.
 */
export function advanceTurn(state: UnoGameState): UnoGameState {
  const count = state.players.length;
  let next = (state.currentPlayerIndex + state.direction + count) % count;

  if (state.skipNext) {
    // Skip one more
    next = (next + state.direction + count) % count;
  }

  return {
    ...state,
    currentPlayerIndex: next,
    skipNext: false,
  };
}

// ── Reshuffle ─────────────────────────────────────────────────────────────────

/**
 * If the draw pile is empty, shuffles the discard pile (minus the top card)
 * back into the draw pile.
 */
export function reshuffleIfNeeded(state: UnoGameState): UnoGameState {
  if (state.drawPile.length > 0) return state;
  if (state.discardPile.length <= 1) return state; // nothing to reshuffle

  const topCard = state.discardPile[state.discardPile.length - 1];
  const toReshuffle = state.discardPile.slice(0, -1);

  // Fisher-Yates shuffle
  shuffleArray(toReshuffle);

  return {
    ...state,
    drawPile: toReshuffle,
    discardPile: [topCard],
  };
}

// ── Win check ─────────────────────────────────────────────────────────────────

/**
 * Checks if the current player has an empty hand. If so, sets phase to
 * 'game-over' and records the winner.
 */
export function checkWin(state: UnoGameState): UnoGameState {
  const current = state.players[state.currentPlayerIndex];
  if (current.hand.count === 0) {
    return { ...state, phase: 'game-over', winnerId: current.id };
  }
  return state;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
}
