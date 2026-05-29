import type { Card } from './types';
import type { HandLike } from './types';

export class Hand implements HandLike {
  private _cards: Card[] = [];

  add(card: Card): void {
    this._cards.push(card);
  }

  remove(cardId: string): Card {
    const index = this._cards.findIndex((c) => c.id === cardId);
    if (index === -1) {
      throw new Error(`Card with id "${cardId}" not found in hand`);
    }
    const [removed] = this._cards.splice(index, 1);
    return removed;
  }

  get cards(): readonly Card[] {
    return this._cards;
  }

  get count(): number {
    return this._cards.length;
  }
}
