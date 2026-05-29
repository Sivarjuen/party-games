import type { Card, DeckDefinition } from './types';

export class Deck {
  private _cards: Card[];

  private constructor(cards: Card[]) {
    this._cards = cards;
  }

  /**
   * Builds a shuffled Deck from a DeckDefinition.
   * Each CardSpec produces `spec.count` Card instances with unique IDs
   * in the format "<color>-<type>-<value?>-<index>" (e.g. "red-number-7-0").
   * The resulting array is shuffled before returning.
   */
  static build(definition: DeckDefinition): Deck {
    const cards: Card[] = [];

    for (const spec of definition) {
      const colorPart = spec.color ?? 'wild';
      const valuePart = spec.value !== undefined ? `-${spec.value}` : '';
      const baseId = `${colorPart}-${spec.type}${valuePart}`;

      for (let i = 0; i < spec.count; i++) {
        const card: Card = {
          id: `${baseId}-${i}`,
          color: spec.color,
          type: spec.type,
        };
        if (spec.value !== undefined) {
          card.value = spec.value;
        }
        if (spec.effect !== undefined) {
          card.effect = spec.effect;
        }
        cards.push(card);
      }
    }

    Deck._shuffle(cards);
    return new Deck(cards);
  }

  /** In-place shuffle. */
  private static _shuffle(arr: Card[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
  }

  /**
   * Removes and returns the card at the top of the deck (end of the array).
   * Returns `null` if the deck is empty.
   */
  draw(): Card | null {
    return this._cards.pop() ?? null;
  }

  /**
   * Returns the card at the top of the deck without removing it.
   * Returns `null` if the deck is empty.
   */
  peek(): Card | null {
    return this._cards[this._cards.length - 1] ?? null;
  }

  /** Current number of cards remaining in the deck. */
  get remaining(): number {
    return this._cards.length;
  }

  /**
   * Appends cards to the deck and shuffles the result.
   * Used when reshuffling the discard pile back into the draw pile.
   */
  addCards(cards: Card[]): void {
    this._cards.push(...cards);
    Deck._shuffle(this._cards);
  }
}
