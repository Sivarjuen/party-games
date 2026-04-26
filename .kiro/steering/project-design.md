# Project Design

## Overview

A client-side multiplayer web game platform. The relay server lives in a completely separate repository and is independently deployed. This repo integrates with it over a stable network protocol.

## What This Repo Contains

- Web game clients
- Shared reusable frontend/workspace packages
- Future portal website
- Networking client libraries for communicating with the relay server

## Core Philosophy

### Separation of Concerns

Relay server repo responsibilities (do NOT duplicate here):
- Connection acceptance
- Lobby management
- Message routing
- Host designation

This repo's responsibilities:
- Rendering
- User experience
- Gameplay logic
- Authoritative host simulation
- Reusable UI/network modules

### Host-Authoritative Model

- One connected player is designated host by the relay server
- Host owns authoritative game state
- Other players send intent/input
- Host broadcasts truth through the relay server

This keeps the server generic, enables rapid new game development, supports many game genres, and provides a shared networking model across all games.

## Design Pillars

- Modular: rendering separate from networking
- Typed: every network message has a TypeScript type
- Reusable: shared packages prevent per-app reimplementation
- Minimal UI first: utility over polish in early milestones
- No duplicate server logic: do not rebuild lobby authority client-side beyond what UX requires

## Gameplay / Feature Intentions

### First Deliverable — Multiplayer Shared Cursor Test

Two players join a lobby and see each other's cursor positions in real time. Built in `apps/multi-cursor`

Lobby flow:
1. Player A creates or joins lobby
2. Player B joins same lobby
3. Host assigned by relay server
4. Both players see each other's cursor live

This validates: relay integration, lobby lifecycle, player identity, real-time updates, host-authoritative flow, and remote entity rendering. It also becomes a reusable presence feature for future games.

### Milestone Build Order

1. Local cursor render
2. Connect to relay server
3. Join lobby
4. Two-player shared cursors
5. Smooth interpolation
6. Join/leave UI
7. Shared drawing extension
8. Actual card game

### Future: Shared Drawing Extension

Uses the same presence foundation. Messages: `draw.start`, `draw.point`, `draw.end`. Useful for whiteboards, card pointing, and annotations.

### Future: Portal App (`apps/portal`)

- Choose game
- Create lobby
- Join via code
- Route users into selected game
- Reuses `@party/net` and `@party/protocol`

## Anti-Patterns to Avoid

- Hardcoded server URLs
- Per-app socket implementations
- Trusting guests with authoritative state
- Massive shared misc folder
- Overbuilding portal before networking is stable
- Feature creep before networking is proven
