# Party Games Client Platform Build Brief (Separate Relay Server Repo)

## Purpose

Build the client-side multiplayer web game platform.

Important assumption:

- The relay server exists in a completely separate repository.
- The relay server is independently deployed and maintained.
- This client repository must integrate with it through a stable network protocol.

This repo contains:

- Web game clients
- Shared reusable frontend/workspace packages
- Future portal website
- Networking client libraries for communicating with relay server

Initial deliverable:

A Phaser-based multiplayer network test app where two players join a lobby and see each other's cursor positions in real time.

---

## Core Product Philosophy

### Separation of Concerns

Relay Server Repo:
- connection acceptance
- lobby management
- message routing
- host designation

Client Repo:
- rendering
- user experience
- gameplay logic
- authoritative host simulation
- reusable UI/network modules

Do NOT duplicate relay server responsibilities in this repo.

---

## Client Architecture Philosophy

### Host Authoritative Model

One connected player is host.

Host owns authoritative game state.

Other players send intent/input.

Host broadcasts truth through relay server.

### Why This Is Good

- Keeps server generic
- Enables rapid new game development
- Allows many game genres
- Shared networking model across all games

---

## Recommended Tech Stack (2026)

## Language

Use TypeScript everywhere.

Reason:
- Shared types
- Safer protocol changes
- Better maintainability

## Frontend Game Engine

Use Phaser.

Scaffold with Phaser Create Game CLI.

Choose:

- Minimal template
- TypeScript
- Vite

Reason:
- Fastest path to browser multiplayer prototypes
- Strong 2D support
- Great for desktop/mobile web

## Build Tool

Use Vite.

Reason:
- Fast dev cycle
- Strong TS support
- Great Phaser workflow

## Monorepo Tooling

Use pnpm workspaces.

Reason:
- Multiple apps in one repo
- Shared code packages
- Easy future portal + multiple games

---

## Repository Strategy

Use one Git repo for client platform only.

Relay server has separate repo.

This repo should not contain backend server code.

---

## Suggested Repo Name

party-games-client

(Or keep `party-games` if preferred and server repo uses `party-games-relay`)

---

## Git Rules

Only one root git repo for this client workspace.

No nested repos inside apps.

If scaffolding tools create nested `.git`, remove them.

---

## Recommended File Structure

party-games-client/
  .git/
  package.json
  pnpm-workspace.yaml

  apps/

    card-game/
      package.json
      vite.config.ts
      src/
        main.ts
        game/
          MainScene.ts
        net/
          relayClient.ts
        ui/
        config/

    portal/   (future)
      package.json
      src/

  shared/

    protocol/
      package.json
      src/
        index.ts

    net/
      package.json
      src/
        index.ts

    presence/
      package.json
      src/
        index.ts

---

## Workspace Config

pnpm-workspace.yaml

packages:
  - "apps/*"
  - "shared/*"

---

## Why `shared/`

Use `shared/` for reusable internal code consumed by apps.

Examples:

- protocol
- net
- presence
- ui (future)

Do not use shared as dumping ground.

Each folder must be real package with package.json.

---

## Package Naming Convention

Use scoped names:

@party/protocol
@party/net
@party/presence
@party/card-game

Imports:

import { connect } from "@party/net";

---

## Integration With Separate Relay Server

All communication happens over network API.

Use environment config:

VITE_RELAY_URL=wss://your-relay-domain.com

Never hardcode server URLs in source.

Use per-environment configs:
- local
- staging
- production

---

## Shared Protocol Package

This package should mirror server message contracts.

Contains:

- message type enums
- payload types
- envelope interfaces
- validation helpers

Important:

Even though server is separate repo, protocol consistency matters.

If possible long-term:
- extract protocol into third repo/package
or
- manually version protocol contracts carefully

For now:
keep protocol definitions in client repo and sync manually with server repo.

---

## Shared Net Package

Contains reusable networking client logic:

- websocket connect/disconnect
- reconnect handling
- send/receive wrappers
- event subscriptions
- heartbeat support later
- auth/session hooks later

This prevents each game reimplementing socket logic.

---

## Shared Presence Package

Contains reusable multiplayer presence features:

- remote cursor rendering models
- player state tracking
- interpolation helpers
- color assignment
- labels

Future games reuse this.

---

## First Deliverable

## Multiplayer Shared Cursor Test

Build in apps/card-game initially.

This is not a real card game yet.

Purpose:
Validate real-time networking.

### Lobby Flow

- Player A creates or joins lobby
- Player B joins same lobby
- Host assigned by relay server
- Both players see each other’s cursor live

---

## Why Shared Cursor First

Tests:

- relay integration
- lobby lifecycle
- player identity
- real-time updates
- host-authoritative flow
- rendering remote entities

Also becomes reusable feature later.

---

## Cursor Networking Rules

### Client Sends

cursor.move

With normalized coordinates:

x = 0..1
y = 0..1

### Host Handles

Host updates authoritative presence state.

### Host Broadcasts

presence.state

through relay server.

---

## Coordinate Standard

Always use normalized coordinates.

Reason:
- different screens
- desktop/mobile support
- simpler scaling

---

## Update Frequency

Do not send every mousemove event.

Recommended:

20Hz (every ~50ms)

Send only when changed.

---

## Rendering Rules

Each player gets:

- colored cursor dot
- optional label

Suggested:

- local green
- remote red

Use Phaser graphics initially.

---

## Smoothing Rules

Remote cursor markers should interpolate toward target positions each frame.

Avoid visual snapping.

---

## Phaser Structure

Use one scene first:

MainScene

Responsibilities:

- connect to relay
- pointer tracking
- send updates
- render players
- simple lobby status

Do not overengineer scene system initially.

---

## Phaser CLI Guidance

Create monorepo first.

Then scaffold inside:

apps/card-game/

Choose:

- Minimal
- TypeScript
- Vite

Do NOT scaffold at repo root then move later.

---

## Milestone Build Order

1. Local cursor render
2. Connect to relay server
3. Join lobby
4. Two-player shared cursors
5. Smooth interpolation
6. Join/leave UI
7. Shared drawing extension
8. Actual card game

---

## Future Shared Drawing Extension

Use same presence foundation.

Messages:

draw.start
draw.point
draw.end

Useful for:
- whiteboards
- card pointing
- annotations

---

## Coding Behaviours / Standards

### Keep Clients Modular

Rendering separate from networking.

### Keep Shared Packages Clean

Only reusable cross-app code.

### Strong Types

Every network message typed.

### Minimal UI First

Utility over polish early.

### No Duplicate Server Logic

Do not rebuild lobby authority logic client-side except what is necessary for UX.

### Build Fast Feedback Loops

Visible progress each milestone.

---

## Anti-Patterns To Avoid

- Hardcoded server URLs
- Per-app socket implementations
- Trusting guests with state
- Massive shared misc folder
- Overbuilding portal first
- Feature creep before networking stable

---

## Future Portal App

Later add apps/portal.

Responsibilities:

- choose game
- create lobby
- join via code
- route users into selected game

Should reuse:

@party/net
@party/protocol

---

## Final Summary

Build a pnpm TypeScript monorepo client platform that integrates with a separate relay server repository.

Use Phaser Minimal + TypeScript + Vite in apps/card-game.

Use shared workspace packages for protocol, networking, and presence systems.

First deliverable is a two-player real-time shared cursor test proving lobby joins and host-authoritative updates through the external relay server.