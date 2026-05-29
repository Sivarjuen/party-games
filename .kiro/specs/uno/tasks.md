# Implementation Plan: Uno Card Game

## Overview

Build the Uno card game in two phases. First, establish the `shared/cards` (`@party/cards`) deck-agnostic foundation — types, `Deck`, `Hand`, `fanLayout`, and `CardRenderer`. Second, build `apps/uno` on top — Uno deck definition, rules engine, game state, AI, table layout, Phaser scenes, and UI components. Tasks are ordered so each builds directly on the previous with no forward dependencies.

## Tasks

- [x] 1. Scaffold `shared/cards` package
  - Create `shared/cards/package.json` with name `@party/cards`, declare `main`/`types` pointing to `src/index.ts`, add `typescript` as a dev dependency
  - Create `shared/cards/tsconfig.json` extending the root config (or a minimal standalone config)
  - Create `shared/cards/src/index.ts` as an empty barrel file to be filled in subsequent tasks
  - Verify the package is picked up by pnpm workspaces (`pnpm list -r`)
  - _Requirements: 1_

- [x] 2. Implement `Card`, `CardSpec`, `DeckDefinition`, `Player`, and `GameState` types
  - Create `shared/cards/src/types.ts` with all interfaces and types as specified in the design (`Card`, `CardSpec`, `DeckDefinition`, `Player`, `GameState`)
  - Export all types from `shared/cards/src/index.ts`
  - _Requirements: 1_

- [x] 3. Implement the `Hand` class
  - Create `shared/cards/src/Hand.ts`
  - Implement `add(card)`, `remove(cardId)` (throws if not found), `cards` getter (readonly), and `count` getter
  - Export `Hand` from `src/index.ts`
  - _Requirements: 1_

- [x] 4. Implement the `Deck` class
  - Create `shared/cards/src/Deck.ts`
  - Implement `static build(definition: DeckDefinition): Deck` — generates unique IDs per card copy, shuffles with Fisher-Yates
  - Implement `draw(): Card | null`, `peek(): Card | null`, `remaining` getter, and `addCards(cards: Card[]): void`
  - Export `Deck` from `src/index.ts`
  - _Requirements: 1_

- [ ] 5. Implement the `fanLayout` helper
  - Create `shared/cards/src/layout.ts`
  - Implement `fanLayout(count, bounds, options?)` returning `CardTransform[]` with `x`, `y`, `rotation` per card
  - Support configurable arc angle (default ~30°) and card overlap; handle edge cases: 0 cards returns `[]`, 1 card returns center with 0 rotation
  - Export `fanLayout`, `CardTransform`, `BoundingBox`, `FanOptions` from `src/index.ts`
  - _Requirements: 1, 6_

- [~] 6. Implement the `CardRenderer` Phaser component
  - Create `shared/cards/src/rendering/CardRenderer.ts`
  - Render a card as a `Phaser.GameObjects.Container` with a `Graphics` rounded rectangle and a centered `Text` label
  - Implement color map: `red → 0xe74c3c`, `blue → 0x3498db`, `green → 0x2ecc71`, `yellow → 0xf1c40f`, `null → 0x2c2c2c`
  - Implement face-down rendering (dark back, no label text)
  - Implement `setDimmed(dimmed)` and `setHighlighted(highlighted)` for interactive feedback
  - Export `CardRenderer` and `CardRenderOptions` from `src/index.ts`
  - _Requirements: 5_

- [~] 7. Scaffold `apps/uno` package
  - Create `apps/uno/` using the Phaser Minimal + TypeScript + Vite template (scaffold inside `apps/uno/`, remove any nested `.git`)
  - Update `apps/uno/package.json`: set name to `uno`, add `@party/cards` as a workspace dependency (`"@party/cards": "workspace:*"`)
  - Set up `vite/config.dev.mjs` and `vite/config.prod.mjs` matching the `multi-cursor` pattern
  - Set canvas background to `#1a472a` (green felt) in `src/game/main.ts`
  - _Requirements: 1, 5_

- [~] 8. Define the Uno deck
  - Create `apps/uno/src/game/deck/unoDeckDefinition.ts`
  - Define the 108-card `DeckDefinition`: one 0 per color, two each of 1–9 per color, two Skip/Reverse/Draw Two per color, four Wild, four Wild Draw Four
  - Export `UNO_DECK_DEFINITION` as a `const` of type `DeckDefinition`
  - _Requirements: 2_

- [~] 9. Define `UnoGameState` and game phase types
  - Create `apps/uno/src/game/state/UnoGameState.ts`
  - Define `GamePhase` union type and `UnoGameState` interface extending `GameState` (add `drawPile`, `discardPile`, `activeDrawStack`, `chosenWildColor`, `phase`, `winnerId`)
  - Export all types
  - _Requirements: 4_

- [~] 10. Implement `UnoRules`
  - Create `apps/uno/src/game/rules/UnoRules.ts`
  - Implement `isPlayable(card, topCard, activeDrawStack, chosenWildColor)` covering: color/value match for number cards, action card type match, wild always valid, stacking rules (Draw Two on Draw Two, Wild Draw Four on Wild Draw Four, Wild Draw Four on Draw Two, but NOT Draw Two on Wild Draw Four stack)
  - Implement `getLegalMoves(hand, topCard, activeDrawStack, chosenWildColor)` returning filtered array
  - Implement `getEffectiveColor(topCard, chosenWildColor)` returning the active color
  - Implement `applyEffect(card, state)` returning updated `UnoGameState` for Skip, Reverse, Draw Two, Wild, Wild Draw Four (immutable — return new state object)
  - _Requirements: 3_

- [~] 11. Implement `gameLoop` helpers
  - Create `apps/uno/src/game/state/gameLoop.ts`
  - Implement `dealInitialHands(playerCount, humanIndex): UnoGameState` — builds deck, deals 7 cards each, flips first discard (re-flip if Wild Draw Four)
  - Implement `advanceTurn(state): UnoGameState` — increments `currentPlayerIndex` by `direction`, wraps around, accounts for skip effects already applied
  - Implement `reshuffleIfNeeded(state): UnoGameState` — moves discard pile minus top card back to draw pile and reshuffles when draw pile is empty
  - Implement `checkWin(state): UnoGameState` — sets `phase = 'game-over'` and `winnerId` if current player's hand is empty
  - _Requirements: 4_

- [~] 12. Implement `UnoAI`
  - Create `apps/uno/src/game/ai/UnoAI.ts`
  - Implement `chooseMoveOrDraw(state, playerId): Card | null` — returns a random legal card or `null` to draw
  - Implement `chooseColor(): string` — returns a random color from `['red','blue','green','yellow']`
  - Implement `processAiTurn(state, playerId, delayMs): Promise<UnoGameState>` — wraps move selection in a `setTimeout` delay, applies the move, returns updated state
  - _Requirements: 9_

- [~] 13. Implement `tableLayout`
  - Create `apps/uno/src/game/layout/tableLayout.ts`
  - Implement `getTableLayout(playerCount, humanIndex): SlotConfig[]` with slot assignments for 2–6 players as specified in the design
  - Implement `getSlotBounds(slot, canvasWidth, canvasHeight): BoundingBox` returning the bounding box for each slot's hand fan
  - Implement `getCentralAreaPositions(canvasWidth, canvasHeight)` returning `{ drawPile, discardPile }` pixel positions
  - _Requirements: 6_

- [~] 14. Implement `HudUI`
  - Create `apps/uno/src/game/ui/HudUI.ts`
  - Render current player highlight (arrow indicator pointing at the active slot)
  - Render direction indicator (circular arrow graphic, updates on Reverse)
  - Render draw stack counter (text + background, visible only when `activeDrawStack > 0`)
  - Expose `update(state: UnoGameState, slots: SlotConfig[])` to sync HUD to current state
  - _Requirements: 7_

- [~] 15. Implement `ColorPickerUI`
  - Create `apps/uno/src/game/ui/ColorPickerUI.ts`
  - Render a centered overlay with four colored rounded-rectangle buttons (Red, Blue, Green, Yellow)
  - Emit a `color-chosen` callback with the selected color string on click
  - Hide itself after a color is chosen
  - _Requirements: 8_

- [~] 16. Implement `WinOverlayUI`
  - Create `apps/uno/src/game/ui/WinOverlayUI.ts`
  - Render a semi-transparent dark overlay with winner name/ID text
  - Render a "Play Again" button that calls `scene.scene.restart()` when clicked
  - _Requirements: 10_

- [~] 17. Build `UnoGameScene` — initialisation and layout
  - Create `apps/uno/src/game/scenes/UnoGameScene.ts`
  - In `create()`: call `dealInitialHands`, call `getTableLayout`, instantiate `CardRenderer` objects for each player's hand using `fanLayout` and slot bounds, render draw pile and discard pile in the central area, instantiate `HudUI`
  - Render opponent hands face-down; render human hand face-up
  - _Requirements: 5, 6, 7_

- [~] 18. Build `UnoGameScene` — human input handling
  - Add click handlers to human player's `CardRenderer` instances (only active on human's turn)
  - On card click: call `UnoRules.isPlayable()`; if invalid, play a shake/flash tween on the card; if valid, play the card and update state
  - On draw pile click: call `reshuffleIfNeeded`, draw one card, add to hand, re-render hand fan, check if drawn card is playable
  - On Wild/Wild Draw Four play: set `phase = 'color-pick'`, show `ColorPickerUI`, wait for color selection before calling `applyEffect` and advancing turn
  - _Requirements: 8_

- [~] 19. Build `UnoGameScene` — game loop and AI integration
  - After each state transition, call `checkWin`; if game over, show `WinOverlayUI` and stop the loop
  - After each human turn, call `advanceTurn` and start the next turn
  - If the next player is AI, call `processAiTurn` (with 500 ms delay); on resolution, update state, re-render, advance turn again
  - Chain AI turns automatically until it is the human player's turn again
  - Update `HudUI` after every state change
  - _Requirements: 4, 9, 10_

- [~] 20. Wire up `UnoGameScene` in the Phaser game config
  - Update `apps/uno/src/game/main.ts` to register `UnoGameScene` as the only scene
  - Add a simple player-count selection screen (or hardcode 4 players for initial testing) that passes player count into `UnoGameScene` via `scene.start('UnoGameScene', { playerCount })`
  - Verify the game launches in the browser with `pnpm --filter uno dev`
  - _Requirements: 1, 4, 6_

- [~] 21. Polish — legal move highlighting and card hover feedback
  - On the human player's turn start, iterate their `CardRenderer` instances and call `setDimmed(true)` on illegal cards and `setDimmed(false)` on legal cards
  - Add `pointerover` / `pointerout` handlers to legal cards to show a subtle lift (scale tween) on hover
  - Clear all highlights when it is not the human's turn
  - _Requirements: 7, 8_

- [~] 22. Polish — opponent hand card count updates
  - After every card play or draw, destroy and recreate the affected opponent's face-down `CardRenderer` instances using the updated `hand.count` and `fanLayout`
  - Ensure the face-down fan count always matches the actual hand size
  - _Requirements: 6_

- [~] 23. End-to-end smoke test
  - Start a 4-player game (1 human + 3 AI) and play through to a win condition
  - Verify: deck has 108 cards at start, each player has 7 cards, draw/discard piles are correct, AI turns resolve with delay, stacking works, wild color picker appears, win overlay appears and "Play Again" restarts correctly
  - Fix any bugs found during the smoke test
  - _Requirements: 2, 3, 4, 8, 9, 10_

## Task Dependency Graph

```json
{
  "waves": [
    { "wave": 1, "tasks": [1] },
    { "wave": 2, "tasks": [2] },
    { "wave": 3, "tasks": [3] },
    { "wave": 4, "tasks": [4] },
    { "wave": 5, "tasks": [5] },
    { "wave": 6, "tasks": [6] },
    { "wave": 7, "tasks": [7] },
    { "wave": 8, "tasks": [8] },
    { "wave": 9, "tasks": [9] },
    { "wave": 10, "tasks": [10] },
    { "wave": 11, "tasks": [11] },
    { "wave": 12, "tasks": [12, 13] },
    { "wave": 13, "tasks": [14, 15, 16] },
    { "wave": 14, "tasks": [17] },
    { "wave": 15, "tasks": [18] },
    { "wave": 16, "tasks": [19] },
    { "wave": 17, "tasks": [20] },
    { "wave": 18, "tasks": [21, 22] },
    { "wave": 19, "tasks": [23] }
  ]
}
```

## Notes

- `CardRenderer` lives in `shared/cards` but has a Phaser peer dependency — `apps/uno` must have Phaser installed before task 6 can be used, but the class itself can be authored in task 6 and consumed in task 17
- Tasks 14–16 (HudUI, ColorPickerUI, WinOverlayUI) can be developed in parallel once task 13 is complete
- Task 23 is a manual smoke test, not an automated test — fix any bugs found before marking it complete
- Mobile/portrait layout is explicitly out of scope for v1; do not add orientation handling during these tasks
