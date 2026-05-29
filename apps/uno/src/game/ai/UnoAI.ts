import type { Card } from '@party/cards';
import { UnoRules } from '../rules/UnoRules';
import type { UnoGameState } from '../state/UnoGameState';
import { advanceTurn, reshuffleIfNeeded, checkWin } from '../state/gameLoop';

const UNO_COLORS = ['red', 'blue', 'green', 'yellow'] as const;

export class UnoAI {
  /** Returns a random legal card from the hand, or null to signal "draw". */
  static chooseMoveOrDraw(state: UnoGameState, playerId: string): Card | null {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return null;

    const topCard = state.discardPile[state.discardPile.length - 1];
    if (!topCard) return null;

    const legal = UnoRules.getLegalMoves(
      player.hand.cards,
      topCard,
      state.activeDrawStack,
      state.chosenWildColor,
    );

    if (legal.length === 0) return null;
    return legal[Math.floor(Math.random() * legal.length)];
  }

  /** Returns a random Uno color. */
  static chooseColor(): string {
    return UNO_COLORS[Math.floor(Math.random() * UNO_COLORS.length)];
  }

  /**
   * Processes a full AI turn with a delay.
   * - Picks a move or draws
   * - Applies the move to state
   * - Returns the updated state (does NOT advance the turn — caller does that)
   */
  static processAiTurn(
    state: UnoGameState,
    playerId: string,
    delayMs: number,
  ): Promise<UnoGameState> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(UnoAI._executeTurn(state, playerId));
      }, delayMs);
    });
  }

  private static _executeTurn(
    state: UnoGameState,
    playerId: string,
  ): UnoGameState {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return state;

    const topCard = state.discardPile[state.discardPile.length - 1];
    if (!topCard) return state;

    // Handle forced draw stack
    if (state.activeDrawStack > 0) {
      const legal = UnoRules.getLegalMoves(
        player.hand.cards,
        topCard,
        state.activeDrawStack,
        state.chosenWildColor,
      );
      if (legal.length === 0) {
        // Must take the draw stack
        return UnoAI._drawStack(state, player.id);
      }
    }

    const chosen = UnoAI.chooseMoveOrDraw(state, playerId);

    if (chosen === null) {
      // Draw one card
      let s = reshuffleIfNeeded(state);
      const drawn = s.drawPile[s.drawPile.length - 1] ?? null;
      if (!drawn) return advanceTurn(s);

      s = {
        ...s,
        drawPile: s.drawPile.slice(0, -1),
        players: s.players.map((p) => {
          if (p.id !== playerId) return p;
          p.hand.add(drawn);
          return p;
        }),
      };

      // Check if drawn card is playable
      const newTop = s.discardPile[s.discardPile.length - 1];
      if (newTop && UnoRules.isPlayable(drawn, newTop, s.activeDrawStack, s.chosenWildColor)) {
        return UnoAI._playCard(s, playerId, drawn);
      }
      return advanceTurn(s);
    }

    return UnoAI._playCard(state, playerId, chosen);
  }

  private static _playCard(
    state: UnoGameState,
    playerId: string,
    card: Card,
  ): UnoGameState {
    // Remove card from hand
    let s: UnoGameState = {
      ...state,
      players: state.players.map((p) => {
        if (p.id !== playerId) return p;
        p.hand.remove(card.id);
        return p;
      }),
      discardPile: [...state.discardPile, card],
    };

    // Choose color for wilds
    if (card.type === 'wild' || card.type === 'wild-draw-four') {
      s = { ...s, chosenWildColor: UnoAI.chooseColor() };
    } else {
      s = { ...s, chosenWildColor: null };
    }

    // Apply effect
    s = UnoRules.applyEffect(card, s);

    // Check win
    s = checkWin(s);
    if (s.phase === 'game-over') return s;

    return advanceTurn(s);
  }

  private static _drawStack(state: UnoGameState, playerId: string): UnoGameState {
    let s = reshuffleIfNeeded(state);
    const count = s.activeDrawStack;

    for (let i = 0; i < count; i++) {
      const drawn = s.drawPile[s.drawPile.length - 1] ?? null;
      if (!drawn) break;
      s = {
        ...s,
        drawPile: s.drawPile.slice(0, -1),
        players: s.players.map((p) => {
          if (p.id !== playerId) return p;
          p.hand.add(drawn);
          return p;
        }),
      };
      s = reshuffleIfNeeded(s);
    }

    // Clear the stack. The penalized player's turn is consumed by drawing —
    // just advance normally (no extra skip).
    s = { ...s, activeDrawStack: 0, skipNext: false };
    return advanceTurn(s);
  }
}
