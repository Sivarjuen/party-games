# Requirements Document

## Introduction

This document defines the requirements for the Uno card game implementation within the party-games platform. The game is built across two packages: `shared/cards` (`@party/cards`) — a deck-agnostic card engine reusable by future games — and `apps/uno` — the Uno-specific rules, AI, and Phaser rendering. The initial version supports 2–6 players (1 human + up to 5 AI opponents), runs entirely client-side in landscape orientation, and uses Phaser graphics primitives for rendering.

## Glossary

- **Card engine** — the deck-agnostic primitives in `@party/cards`: `Card`, `Deck`, `Hand`, `fanLayout`, `CardRenderer`
- **DeckDefinition** — an array of `CardSpec` entries that fully describes a deck's composition
- **Draw stack / stacking** — accumulating draw penalties by playing a draw card on top of another draw card
- **Active draw stack** — the accumulated pending draw count when stacking is in progress
- **Slot** — a position on the table assigned to a player (bottom, top-left, top-center, top-right, left, right)
- **Face-down** — a card rendered showing only its back (used for opponent hands)
- **Wild color** — the color chosen by a player after playing a Wild or Wild Draw Four card

## Requirements

## Requirement 1: Deck-Agnostic Card Engine (`@party/cards`)
**User Story:** As a game developer, I want a reusable card engine package so that I can build multiple card games without reimplementing deck, hand, and player primitives each time.

### Acceptance Criteria
1. GIVEN a `DeckDefinition` array of card specs, WHEN `Deck.build(definition)` is called, THEN a shuffled `Deck` instance is returned containing exactly the cards described by the definition.
2. GIVEN a `Deck` instance, WHEN `deck.draw()` is called, THEN the top card is removed from the deck and returned; if the deck is empty, `null` is returned.
3. GIVEN a `Deck` instance, WHEN `deck.peek()` is called, THEN the top card is returned without removing it from the deck.
4. GIVEN a `Deck` instance, WHEN `deck.remaining` is accessed, THEN it returns the current count of cards left in the deck.
5. GIVEN a `Hand` instance, WHEN `hand.add(card)` is called, THEN the card is appended to the hand and `hand.count` increases by one.
6. GIVEN a `Hand` instance containing a card, WHEN `hand.remove(cardId)` is called, THEN the card is removed from the hand and `hand.count` decreases by one; if the card is not present, an error is thrown.
7. GIVEN a `Hand` instance, WHEN `hand.cards` is accessed, THEN a readonly array of the current cards is returned.
8. GIVEN N cards and a bounding box, WHEN `fanLayout(cards, bounds)` is called, THEN it returns an array of `{ x, y, rotation }` positions that distribute the cards in a fan arc within the bounding box.

---

## Requirement 2: Uno Deck Definition
**User Story:** As a player, I want a standard Uno deck so that the game uses the correct 108-card composition.

### Acceptance Criteria
1. GIVEN the Uno deck definition, WHEN a deck is built from it, THEN it contains exactly 108 cards.
2. GIVEN the built deck, WHEN its cards are counted by color (Red, Blue, Green, Yellow), THEN each color contains exactly 25 cards (one 0, two each of 1–9, two Skip, two Reverse, two Draw Two).
3. GIVEN the built deck, WHEN wild cards are counted, THEN there are exactly 4 Wild cards and 4 Wild Draw Four cards (8 total colorless cards).
4. GIVEN any card in the deck, WHEN its `type` field is read, THEN it is one of: `number`, `skip`, `reverse`, `draw-two`, `wild`, `wild-draw-four`.

---

## Requirement 3: Uno Rules Engine
**User Story:** As a player, I want the game to enforce Uno rules so that only legal moves are allowed and action cards have the correct effects.

### Acceptance Criteria
1. GIVEN a discard pile top card with a specific color and value, WHEN a player attempts to play a number card, THEN the move is valid only if the card matches the top card's color OR its numeric value.
2. GIVEN a discard pile top card, WHEN a player attempts to play a Wild or Wild Draw Four, THEN the move is always valid regardless of the top card.
3. GIVEN a discard pile top card that is a Draw Two, WHEN a player attempts to play another Draw Two, THEN the move is valid (stacking).
4. GIVEN a discard pile top card that is a Draw Two, WHEN a player attempts to play a Wild Draw Four, THEN the move is valid (stacking across draw types).
5. GIVEN a discard pile top card that is a Wild Draw Four, WHEN a player attempts to play another Wild Draw Four, THEN the move is valid (stacking).
6. GIVEN a discard pile top card that is a Wild Draw Four, WHEN a player attempts to play a Draw Two, THEN the move is NOT valid (cannot stack down).
7. GIVEN a Skip card is played, WHEN the next player's turn begins, THEN that player's turn is skipped and play passes to the following player.
8. GIVEN a Reverse card is played, WHEN the turn order updates, THEN the direction of play reverses (clockwise ↔ counter-clockwise).
9. GIVEN a Draw Two card is played with no active stack, WHEN the next player cannot or does not stack, THEN that player draws 2 cards and their turn is skipped.
10. GIVEN a Wild card is played, WHEN the player selects a color, THEN the active color is set to the chosen color for the next play.
11. GIVEN a Wild Draw Four is played with no active stack, WHEN the next player cannot or does not stack, THEN that player draws 4 cards and their turn is skipped.
12. GIVEN an active draw stack (accumulated from stacking Draw Two / Wild Draw Four cards), WHEN the next player plays a valid stacking card, THEN the draw count increases by the new card's draw value; WHEN the next player cannot stack, THEN they draw the full accumulated count and their turn is skipped.

---

## Requirement 4: Uno Game State
**User Story:** As a player, I want the game to track all state needed to play a complete round so that turns, the draw pile, the discard pile, and win conditions are managed correctly.

### Acceptance Criteria
1. GIVEN a new game is started with 2–6 players, WHEN the game initialises, THEN each player is dealt 7 cards, the remaining cards form the draw pile, and the top card of the draw pile is placed face-up as the first discard.
2. GIVEN the draw pile is exhausted, WHEN a card must be drawn, THEN the discard pile (except the top card) is reshuffled and becomes the new draw pile.
3. GIVEN it is a player's turn, WHEN they have no legal move and click the draw pile, THEN they draw one card; if that card is playable they may play it immediately, otherwise their turn ends.
4. GIVEN a player's hand becomes empty after playing a card, WHEN the game checks win condition, THEN that player is declared the winner and the game ends.
5. GIVEN the game ends, WHEN the winner is determined, THEN a winner overlay is displayed showing the winning player's name/ID.

---

## Requirement 5: Card Rendering Component
**User Story:** As a player, I want cards to be visually rendered in the game so that I can see my hand and the discard pile clearly.

### Acceptance Criteria
1. GIVEN a card object, WHEN it is rendered, THEN it appears as a rounded rectangle filled with the card's color (Red = `0xe74c3c`, Blue = `0x3498db`, Green = `0x2ecc71`, Yellow = `0xf1c40f`, Wild/colorless = `0x2c2c2c`).
2. GIVEN a card is rendered, WHEN the label is displayed, THEN it shows the card's value or type as text (e.g., "7", "Skip", "Rev", "+2", "Wild", "+4") centered on the card face.
3. GIVEN a face-down card is rendered (opponent hand), WHEN it is displayed, THEN it shows a dark back face with no value text visible.
4. GIVEN a card rendering component, WHEN the game later needs to swap in real image assets, THEN the component interface allows asset-based rendering without changing the calling code (swappable renderer contract).

---

## Requirement 6: Table Layout — Landscape
**User Story:** As a player, I want the game table to use the screen space efficiently in landscape orientation so that all players' hands and the central play area are clearly visible.

### Acceptance Criteria
1. GIVEN a 2-player game, WHEN the table is laid out, THEN the human player's hand is at the bottom center and the single opponent's hand is at the top center.
2. GIVEN a 3-player game, WHEN the table is laid out, THEN the human player is at the bottom, two opponents are distributed across the top.
3. GIVEN a 4-player game, WHEN the table is laid out, THEN the human player is at the bottom, one opponent is at the top center, one is on the left, and one is on the right.
4. GIVEN a 5-player game, WHEN the table is laid out, THEN the human player is at the bottom, two opponents are distributed across the top, one is on the left, and one is on the right.
5. GIVEN a 6-player game, WHEN the table is laid out, THEN the human player is at the bottom, three opponents are distributed across the top, one is on the left, and one is on the right.
6. GIVEN any opponent slot, WHEN their hand is rendered, THEN the cards are shown face-down in a fan layout oriented toward the center of the table.
7. GIVEN the central play area, WHEN rendered, THEN the draw pile and the discard pile (showing the top card face-up) are displayed side by side in the center of the screen.

---

## Requirement 7: Game HUD and Indicators
**User Story:** As a player, I want clear visual indicators during the game so that I always know whose turn it is, the direction of play, and any active draw stack.

### Acceptance Criteria
1. GIVEN any game state, WHEN the HUD is rendered, THEN the current player is highlighted (e.g., glowing border or arrow indicator on their hand area).
2. GIVEN any game state, WHEN the direction indicator is rendered, THEN it shows a clockwise or counter-clockwise arrow that updates when a Reverse card is played.
3. GIVEN an active draw stack (accumulated draw count > 0), WHEN the HUD is rendered, THEN a counter showing the total pending draw count is displayed prominently near the draw pile.
4. GIVEN it is the human player's turn, WHEN a card in their hand is hovered, THEN legal cards are highlighted and illegal cards are visually dimmed.

---

## Requirement 8: Human Player Interaction
**User Story:** As a human player, I want to interact with the game using mouse clicks so that I can play cards and draw from the pile on my turn.

### Acceptance Criteria
1. GIVEN it is the human player's turn, WHEN they click a legal card in their hand, THEN that card is played and the game state updates accordingly.
2. GIVEN it is the human player's turn and they click an illegal card, WHEN the click is processed, THEN the card is not played and a brief visual feedback (shake or flash) is shown.
3. GIVEN it is the human player's turn and they have no legal move (or choose to draw), WHEN they click the draw pile, THEN they draw one card.
4. GIVEN the human player plays a Wild or Wild Draw Four, WHEN the card is played, THEN a color-selection UI appears and the game waits for the player to choose a color before continuing.
5. GIVEN it is not the human player's turn, WHEN they click any card or the draw pile, THEN no action is taken.
6. GIVEN it is the human player's turn, all legal cards in their hand have an orange border
7. GIVEN the human player hovers over cards in their hand, THEN the hovered card is slightly enlarged and moved up so that it is easier to see what card it is.

---

## Requirement 9: AI Player
**User Story:** As a human player, I want AI opponents so that I can play a complete game without needing other human players.

### Acceptance Criteria
1. GIVEN it is an AI player's turn, WHEN the AI resolves its turn, THEN it selects a random legal move from its hand.
2. GIVEN an AI player has no legal move, WHEN its turn is processed, THEN it draws one card; if that card is playable, it plays it; otherwise its turn ends.
3. GIVEN an AI player plays a Wild or Wild Draw Four, WHEN the color must be chosen, THEN the AI randomly selects one of the four colors.
4. GIVEN it is an AI player's turn, WHEN the turn resolves, THEN there is a short visible delay (≥ 500 ms) before the AI acts so the human can follow the game.

---

## Requirement 10: Win Condition and Game End
**User Story:** As a player, I want the game to clearly announce the winner so that the round has a satisfying conclusion.

### Acceptance Criteria
1. GIVEN a player plays their last card, WHEN the game checks win condition, THEN the game immediately ends and no further turns are processed.
2. GIVEN the game has ended, WHEN the winner overlay is shown, THEN it displays the winner's name/ID and offers a "Play Again" button that restarts the game with the same player count.
3. GIVEN the "Play Again" button is clicked, WHEN the game restarts, THEN a fresh shuffled deck is dealt and all player hands are reset to 7 cards. The play order is also randomised.
