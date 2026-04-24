# Party Games Client Platform

A modern web-based multiplayer game platform built with a **client-first architecture**.

This repository contains the frontend applications and shared client-side systems used to power multiple browser games, while a separate relay server handles connection routing and lobby management.

The long-term goal is to create a collection of lightweight multiplayer games playable instantly in the browser on desktop and mobile.

---

## Core Philosophy

This project is built around a **host-authoritative multiplayer model**:

- One player in each lobby becomes the **host**
- The host owns the authoritative game state
- Other players send input/actions
- A separate relay server routes messages between players

This keeps the backend generic and lightweight while allowing rapid iteration on games entirely from the client side.

---

## Repository Responsibilities

This client repository is responsible for:

- Web game applications
- Rendering and UI
- Gameplay logic
- Multiplayer client networking
- Shared reusable frontend packages
- Future game portal / launcher
- Presence systems (cursors, players, etc.)

This repository does **not** contain relay server code.

---

## Tech Stack

- **TypeScript** – strongly typed client and protocol code
- **Phaser** – browser game engine for 2D multiplayer games
- **Vite** – fast development/build tooling
- **pnpm Workspaces** – monorepo package management

---

## Monorepo Structure

```txt
apps/
  card-game/        # First playable multiplayer prototype
  portal/           # Future game launcher / lobby UI

shared/
  protocol/         # Shared message contracts
  net/              # WebSocket / relay client logic
  presence/         # Cursor + player presence systems
```

---

## First Milestone: Shared Cursor Multiplayer Test

The first application is a real-time networking prototype where two players:

- Join the same lobby
- Connect through the relay server
- Continuously share cursor positions
- See each other move in real time

This validates the multiplayer architecture before building full games.

---

## Why Start With Shared Cursors?

It proves the most important systems early:

- Lobby joining
- Player identity
- Real-time updates
- Host-authoritative state flow
- Multiplayer rendering
- Reusable player presence features

These systems will later power card games, party games, whiteboards, and collaborative UI.

---

## Future Direction

After networking is proven, the platform will expand into:

- Card games
- Party games
- Shared drawing / whiteboard games
- Turn-based multiplayer experiences
- Portal website for creating and joining lobbies
- Mobile PWA support

---

## Development Philosophy

- Keep systems modular
- Prefer simple solutions first
- Reuse shared code across games
- Keep the server dumb and the clients smart
- Build visible milestones quickly
- Avoid overengineering early

---

## Vision

A lightweight browser-first multiplayer platform where anyone can create a lobby, invite friends, and instantly play together.
