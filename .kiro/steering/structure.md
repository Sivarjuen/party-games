# Structure

## Repository Layout

```
party-games-client/
  .git/
  package.json
  pnpm-workspace.yaml

  apps/
    multi-cursor/          # First game app — currently a networking test
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

    portal/             # Future — game selection and lobby routing
      package.json
      src/

  shared/
    protocol/           # Message type enums, payload types, envelope interfaces, validation helpers
      package.json
      src/
        index.ts

    net/                # Reusable WebSocket client logic
      package.json
      src/
        index.ts

    presence/           # Reusable multiplayer presence features
      package.json
      src/
        index.ts
```

## Workspace Config

`pnpm-workspace.yaml`:
```yaml
packages:
  - "apps/*"
  - "shared/*"
```

## Folder Responsibilities

### `apps/`

Each subfolder is a standalone game or web app. Each has its own `package.json` and Vite config.

### `shared/`

Reusable internal packages consumed by apps. Each folder must be a real package with a `package.json`. Not a dumping ground — only genuinely cross-app code lives here.

- `shared/protocol` — mirrors relay server message contracts; contains message types, payload types, envelope interfaces, validation helpers
- `shared/net` — WebSocket connect/disconnect, reconnect handling, send/receive wrappers, event subscriptions (heartbeat and auth hooks later)
- `shared/presence` — remote cursor rendering models, player state tracking, interpolation helpers, color assignment, labels

## Package Naming Convention

Use scoped names under `@party/`:

```
@party/protocol
@party/net
@party/presence
@party/card-game
```

Import example:
```ts
import { connect } from "@party/net";
```

## Git Rules

- One root `.git` only — no nested repos inside `apps/`
- If scaffolding tools create a nested `.git`, remove it immediately

## Phaser Scaffolding Rule

Always scaffold Phaser apps inside the target `apps/<name>/` directory. Do NOT scaffold at repo root and move later.
