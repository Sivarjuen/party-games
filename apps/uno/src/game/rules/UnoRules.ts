import type { Card } from '@party/cards';
import type { UnoGameState } from '../state/UnoGameState';

export class UnoRules {
  /**
   * Returns the effective color in play — the chosen wild color if the top
   * card is a wild, otherwise the top card's own color.
   */
  static getEffectiveColor(
    topCard: Card,
    chosenWildColor: string | null,
  ): string | null {
    if (topCard.color === null) return chosenWildColor;
    return topCard.color;
  }

  /**
   * Returns true if `card` is a legal play given the current discard top and
   * draw-stack state.
   *
   * Stacking rules:
   *   - If activeDrawStack > 0, only draw cards may be played:
   *       Draw Two  → can stack on Draw Two or Wild Draw Four stack
   *       Wild Draw Four → can stack on Draw Two or Wild Draw Four stack
   *       Draw Two  → CANNOT stack on a Wild Draw Four stack
   */
  static isPlayable(
    card: Card,
    topCard: Card,
    activeDrawStack: number,
    chosenWildColor: string | null,
  ): boolean {
    // When a draw stack is active, only draw cards can be played
    if (activeDrawStack > 0) {
      const topIsWDF = topCard.type === 'wild-draw-four';
      if (card.type === 'draw-two') {
        // Draw Two can stack on Draw Two but NOT on Wild Draw Four
        return !topIsWDF;
      }
      if (card.type === 'wild-draw-four') {
        // Wild Draw Four can stack on anything
        return true;
      }
      // All other cards are illegal when a draw stack is active
      return false;
    }

    // Wilds are always playable
    if (card.type === 'wild' || card.type === 'wild-draw-four') return true;

    const effectiveColor = UnoRules.getEffectiveColor(topCard, chosenWildColor);

    // Match by color
    if (card.color !== null && card.color === effectiveColor) return true;

    // Match by type (action cards) or value (number cards)
    if (card.type === 'number' && topCard.type === 'number') {
      return card.value === topCard.value;
    }
    if (card.type !== 'number' && card.type === topCard.type) return true;

    return false;
  }

  /**
   * Returns all cards in `hand` that are legal to play.
   */
  static getLegalMoves(
    hand: readonly Card[],
    topCard: Card,
    activeDrawStack: number,
    chosenWildColor: string | null,
  ): Card[] {
    return hand.filter((c) =>
      UnoRules.isPlayable(c, topCard, activeDrawStack, chosenWildColor),
    );
  }

  /**
   * Applies the effect of a played card to the state (immutable — returns new state).
   * Does NOT advance the turn; that is handled by advanceTurn in gameLoop.ts.
   *
   * For Wild / Wild Draw Four the caller must set chosenWildColor before calling
   * applyEffect, or pass it explicitly via the state.
   */
  static applyEffect(card: Card, state: UnoGameState): UnoGameState {
    switch (card.type) {
      case 'skip':
        return { ...state, skipNext: true };

      case 'reverse':
        // In a 2-player game, Reverse acts like Skip
        if (state.players.length === 2) {
          return { ...state, direction: state.direction, skipNext: true };
        }
        return { ...state, direction: (state.direction * -1) as 1 | -1 };

      case 'draw-two': {
        const newStack = state.activeDrawStack + 2;
        // Don't set skipNext here — skip only happens when the stack is consumed
        return { ...state, activeDrawStack: newStack };
      }

      case 'wild':
        return { ...state };

      case 'wild-draw-four': {
        const newStack = state.activeDrawStack + 4;
        // Don't set skipNext here — skip only happens when the stack is consumed
        return { ...state, activeDrawStack: newStack };
      }

      default:
        return state;
    }
  }
}
