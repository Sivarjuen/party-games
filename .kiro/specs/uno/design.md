# Design

## Overview

The Uno implementation is split across two packages. `shared/cards` (`@party/cards`) provides deck-agnostic card engine primitives with no Phaser dependency — reusable by any future card game. `apps/uno` contains all Uno-specific logic: deck definition, rules engine, game state, AI, table layout, and Phaser scenes. Networking is out of scope for v1; the game runs entirely client-side. The state model is designed to be compatible with a future host-authoritative multiplayer model.

## Architecture

The Uno implementation is split across two packages that follow the existing monorepo conventions:

- **`shared/cards` (`@party/cards`)** — deck-agnostic card engine primitives. No Phaser dependency; pure TypeScript data structures and algorithms. Reusable by any future card game.
- **`apps/uno`** — Uno-specific game. Depends on `@party/cards` and Phaser. Contains the deck definition, rules engine, game state, AI, and all Phaser scenes/rendering.

Networking is explicitly **out of scope for v1**. The game runs entirely client-side. The architecture is designed so that `UnoGameState` can later be lifted into a host-authoritative model using `@party/net` and `@party/protocol` without restructuring the rules engine.

---

## Package Structure

```
shared/
  cards/                        # @party/cards
    package.json
    tsconfig.json
    src/
      types.ts                  # Card, DeckDefinition, Player, GameState
      Deck.ts                   # Deck class
      Hand.ts                   # Hand class
      layout.ts                 # fanLayout() helper
      rendering/
        CardRenderer.ts         # Phaser card rendering component
      index.ts                  # public API re-exports

apps/
  uno/
    package.json                # depends on @party/cards, phaser
    tsconfig.json
    vite/
      config.dev.mjs
      config.prod.mjs
    index.html
    src/
      main.ts                   # Phaser Game bootstrap
      game/
        main.ts                 # Game config + StartGame()
        deck/
          unoDeckDefinition.ts  # 108-card DeckDefinition
        rules/
          UnoRules.ts           # play validation, stacking, effects
        state/
          UnoGameState.ts       # game state type + mutation helpers
          gameLoop.ts           # turn sequencing logic
        ai/
          UnoAI.ts              # random legal move selection
        scenes/
          UnoGameScene.ts       # main Phaser scene
        ui/
          ColorPickerUI.ts      # wild color selection overlay
          WinOverlayUI.ts       # winner announcement overlay
          HudUI.ts              # turn indicator, direction, draw stack counter
        layout/
          tableLayout.ts        # slot positions for 2–6 players
```

---

## Data Models

### `@party/cards` — `src/types.ts`

```ts
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
  count: number;        // how many copies to include
}

/** An ordered array of CardSpec entries that fully describes a deck. */
export type DeckDefinition = CardSpec[];

/** A player slot — extended by game-specific player types. */
export interface Player {
  id: string;
  type: 'human' | 'ai';
  hand: Hand;
}

/** Minimal shared game state shape — extended by each game. */
export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  direction: 1 | -1;   // 1 = clockwise, -1 = counter-clockwise
}
```

### `apps/uno` — `src/game/state/UnoGameState.ts`

```ts
import type { GameState, Card } from '@party/cards';

export type GamePhase =
  | 'dealing'
  | 'playing'
  | 'color-pick'   // waiting for wild color selection
  | 'game-over';

export interface UnoGameState extends GameState {
  drawPile: Card[];
  discardPile: Card[];          // top = discardPile[discardPile.length - 1]
  activeDrawStack: number;      // accumulated draw count from stacking; 0 = no stack
  chosenWildColor: string | null;
  phase: GamePhase;
  winnerId: string | null;
}
```

### `apps/uno` — `src/game/rules/UnoRules.ts`

```ts
export interface PlayResult {
  valid: boolean;
  reason?: string;
}

export class UnoRules {
  static isPlayable(card: Card, topCard: Card, activeDrawStack: number, chosenWildColor: string | null): boolean;
  static getLegalMoves(hand: Card[], topCard: Card, activeDrawStack: number, chosenWildColor: string | null): Card[];
  static applyEffect(card: Card, state: UnoGameState): UnoGameState;
  static getEffectiveColor(topCard: Card, chosenWildColor: string | null): string | null;
}
```

---

## Components and Interfaces

### `Deck` class (`@party/cards`)
- `static build(definition: DeckDefinition): Deck` — instantiates cards from specs, assigns unique IDs, shuffles using Fisher-Yates.
- `draw(): Card | null` — pops from the top of the internal array.
- `peek(): Card | null` — reads without removing.
- `get remaining(): number`
- `addCards(cards: Card[]): void` — used when reshuffling the discard pile back in.

### `Hand` class (`@party/cards`)
- Wraps a `Card[]` array.
- `add(card: Card): void`
- `remove(cardId: string): Card` — throws if not found.
- `get cards(): readonly Card[]`
- `get count(): number`

### `fanLayout` helper (`@party/cards`)
```ts
export interface CardTransform { x: number; y: number; rotation: number; }
export interface BoundingBox { x: number; y: number; width: number; height: number; }

export function fanLayout(count: number, bounds: BoundingBox, options?: FanOptions): CardTransform[];
```
- Distributes N cards in a fan arc. The arc angle and card overlap are configurable via `FanOptions`.
- For opponent hands (face-down), the same function is used with a different bounding box and a `faceDown: true` flag on the renderer.

### `CardRenderer` (`@party/cards/rendering`)
```ts
export interface CardRenderOptions {
  faceDown?: boolean;
  interactive?: boolean;
  dimmed?: boolean;
}

export class CardRenderer {
  constructor(scene: Phaser.Scene, card: Card, options?: CardRenderOptions);
  get container(): Phaser.GameObjects.Container;
  setDimmed(dimmed: boolean): void;
  setHighlighted(highlighted: boolean): void;
  destroy(): void;
}
```
- Renders a card as a `Phaser.GameObjects.Container` holding a `Graphics` rounded rectangle and a `Text` label.
- Color map: `red → 0xe74c3c`, `blue → 0x3498db`, `green → 0x2ecc71`, `yellow → 0xf1c40f`, `null → 0x2c2c2c`.
- Face-down: dark back (`0x1a1a2e`) with a simple pattern, no text.
- The constructor signature is the stable contract; swapping to asset-based rendering later means replacing only this class.

### `UnoRules` (`apps/uno`)
- Pure functions — no side effects, no Phaser dependency.
- `isPlayable`: checks color/value match, wild always valid, stacking rules for draw cards.
- `applyEffect`: returns a new `UnoGameState` with the effect applied (skip, reverse, draw, color change). Does not mutate.
- Stacking logic: if `activeDrawStack > 0`, only draw cards of equal or higher draw value are legal (Draw Two on Draw Two, Wild Draw Four on either; Draw Two cannot be played on Wild Draw Four stack).

### `UnoAI` (`apps/uno`)
- `chooseMoveOrDraw(state: UnoGameState, playerId: string): Card | null`
  - Gets legal moves via `UnoRules.getLegalMoves`.
  - If moves exist, returns a random one.
  - Returns `null` to signal "draw".
- `chooseColor(): string` — returns a random color from `['red','blue','green','yellow']`.
- Stateless; called by `gameLoop.ts` on each AI turn.

### `gameLoop.ts` (`apps/uno`)
- Orchestrates turn sequencing as a state machine.
- `advanceTurn(state: UnoGameState): UnoGameState` — computes the next player index given direction and any skip effects.
- `processAiTurn(state: UnoGameState, delayMs: number): Promise<UnoGameState>` — wraps AI move selection in a `setTimeout` delay, then applies the move.
- `reshuffleIfNeeded(state: UnoGameState): UnoGameState` — moves discard pile (minus top card) back to draw pile and reshuffles when draw pile is empty.

---

## Rendering Approach

All rendering uses Phaser graphics primitives — no image assets. Cards are `Container` objects containing:
1. A `Graphics` object drawing a rounded rectangle (card body + thin white border).
2. A `Text` object for the label, centered on the card.

This keeps the renderer self-contained and easy to replace. The `CardRenderer` class is the only place that knows about visual representation; game logic never touches Phaser objects directly.

Opponent hands are rendered as N face-down `CardRenderer` instances positioned by `fanLayout`. The count of face-down cards updates whenever a card is drawn or played.

---

## Layout Algorithm

### `tableLayout.ts`

```ts
export interface SlotConfig {
  position: 'bottom' | 'top' | 'left' | 'right' | 'top-left' | 'top-center' | 'top-right';
  playerId: string;
}

export function getTableLayout(playerCount: number, humanIndex: number): SlotConfig[];
```

Slot assignments by player count (human always at `bottom`):

| Players | Slots (non-human)                          |
|---------|--------------------------------------------|
| 2       | top-center                                 |
| 3       | top-left, top-right                        |
| 4       | top-center, left, right                    |
| 5       | top-left, top-right, left, right           |
| 6       | top-left, top-center, top-right, left, right |

Each slot maps to a `BoundingBox` for the hand fan and a label position. Slot bounding boxes are computed from the 1920×1080 canvas dimensions with fixed margins.

Central play area: draw pile at `(880, 540)`, discard pile at `(1040, 540)`.

---

## Game Loop Flow

```
Game Start
  └─ Deal 7 cards to each player
  └─ Flip top card to discard pile (re-flip if it's a Wild Draw Four)
  └─ Set phase = 'playing', currentPlayerIndex = 0

Turn Start
  └─ Is current player human?
      ├─ YES → enable card click handlers, enable draw pile click
      └─ NO  → schedule AI turn after 500ms delay
                └─ AI picks move or draws
                └─ Apply move → update state
                └─ Advance turn

Human plays card
  └─ Validate with UnoRules.isPlayable()
      ├─ INVALID → flash card, no state change
      └─ VALID   → remove card from hand, push to discard
                  └─ Is it a Wild/Wild Draw Four?
                      ├─ YES → phase = 'color-pick', show ColorPickerUI
                      └─ NO  → applyEffect → advanceTurn → next Turn Start

Human draws
  └─ reshuffleIfNeeded()
  └─ Draw one card into hand
  └─ Is drawn card playable?
      ├─ YES → player may click it to play (or pass)
      └─ NO  → advanceTurn → next Turn Start

Win Check (after every card play)
  └─ hand.count === 0?
      ├─ YES → phase = 'game-over', show WinOverlayUI
      └─ NO  → continue
```

---

## AI Design

The AI is intentionally simple for v1 — random legal move selection. This is sufficient to produce a playable opponent and keeps the AI module small and easy to replace with a smarter strategy later.

Decision process per turn:
1. Call `UnoRules.getLegalMoves(hand, topCard, activeDrawStack, chosenWildColor)`.
2. If the list is non-empty, pick a random card from it.
3. If the chosen card is a Wild or Wild Draw Four, call `chooseColor()` (random).
4. If the list is empty, draw one card. If the drawn card is legal, play it; otherwise end turn.

The 500 ms delay before AI action is enforced in `processAiTurn` using `setTimeout` wrapped in a `Promise`. This gives the human player time to read what happened.

---

## State Management

`UnoGameState` is a plain TypeScript object. All mutations produce a new state object (immutable update pattern) via helper functions in `gameLoop.ts` and `UnoRules.applyEffect`. `UnoGameScene` holds the single authoritative state reference and re-renders after each state transition.

There is no external state library. The scene owns the state and calls render helpers to sync Phaser objects to the new state after each transition. This is intentionally simple for v1 and compatible with a future host-authoritative networking model where the host would own the state and broadcast diffs.

---

## Scene Structure

### `UnoGameScene`

Single main scene. Responsibilities:
- Initialise game state (deal cards, set up piles).
- Create and position all `CardRenderer` instances and UI components.
- Register input handlers (card clicks, draw pile click).
- Drive the game loop (call `processAiTurn` for AI players, handle human input).
- Re-render state after each transition (update card positions, hand counts, HUD).
- Show `ColorPickerUI` when a wild is played; show `WinOverlayUI` on game end.

The scene does **not** contain rules logic — it delegates to `UnoRules` and `gameLoop.ts`.

### `ColorPickerUI`

A `Phaser.GameObjects.Container` overlay with four colored buttons (Red, Blue, Green, Yellow). Shown when a Wild or Wild Draw Four is played. Emits a `color-chosen` event and hides itself.

### `WinOverlayUI`

A semi-transparent overlay with winner text and a "Play Again" button. The button calls `scene.scene.restart()` to reset the scene.

### `HudUI`

Persistent HUD layer:
- Current player highlight (arrow or glow on the active slot).
- Direction indicator (circular arrow, flips on Reverse).
- Draw stack counter (shown only when `activeDrawStack > 0`).

---

## Phaser Configuration

```ts
// apps/uno/src/game/main.ts
const config: Types.Core.GameConfig = {
  type: AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',
  backgroundColor: '#1a472a',   // green felt
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [UnoGameScene],
};
```

Canvas size matches the existing `multi-cursor` app (1920×1080) for consistency. The green background evokes a card table.

## Correctness Properties

### Property 1: Deck composition
The deck always contains exactly 108 cards at game start.
**Validates: Requirements 2.1**

### Property 2: Initial deal
Each player always has exactly 7 cards after dealing.
**Validates: Requirements 4.1**

### Property 3: Immutable state
`UnoGameState` is never mutated in place — all transitions return a new state object.
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 4: Single rules authority
`UnoRules.isPlayable` is the single source of truth for move legality; no other code bypasses it.
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

### Property 5: Draw stack reset
`activeDrawStack` only resets to 0 when a player takes the accumulated draw penalty.
**Validates: Requirements 3.12**

### Property 6: Stacking direction
A Wild Draw Four on a Draw Two stack is valid; a Draw Two on a Wild Draw Four stack is not.
**Validates: Requirements 3.4, 3.6**

### Property 7: Discard pile non-empty
The discard pile always has at least one card (the initial flip card).
**Validates: Requirements 4.1, 4.2**

### Property 8: Player index bounds
`currentPlayerIndex` always wraps within `[0, players.length - 1]`.
**Validates: Requirements 4.1, 4.3**

## Error Handling

- If `deck.draw()` is called on an empty deck, `reshuffleIfNeeded` must be called first; if the discard pile is also empty, the draw is a no-op and the turn ends
- If `hand.remove(cardId)` is called with an unknown ID, it throws — callers must validate before removing
- If a Wild Draw Four is the first card flipped to start the discard pile, it is returned to the deck and a new card is flipped
- Invalid player counts (< 2 or > 6) should throw at `dealInitialHands` time

## Testing Strategy

- Unit test `UnoRules.isPlayable` exhaustively against all stacking combinations
- Unit test `Deck.build` against the Uno deck definition to assert 108 cards with correct composition
- Unit test `fanLayout` for 0, 1, 2, and N cards within a fixed bounding box
- Integration test a full AI-only game (all players AI) to verify it always reaches a win condition without infinite loops
- Manual smoke test: 4-player game (1 human + 3 AI) played to completion
