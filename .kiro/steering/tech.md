# Tech

## Language

TypeScript everywhere.

Reasons: shared types, safer protocol changes, better maintainability.

## Frontend Game Engine

Phaser — scaffolded with Phaser Create Game CLI.

Template choices: Minimal, TypeScript, Vite.

Reasons: fastest path to browser multiplayer prototypes, strong 2D support, great for desktop/mobile web.

## Build Tool

Vite — fast dev cycle, strong TS support, great Phaser workflow.

## Monorepo Tooling

pnpm workspaces — supports multiple apps, shared code packages, easy future portal and multiple games.

## Relay Server Integration

- Relay server is in a **separate repository** — do not include backend server code here
- All communication happens over a WebSocket network API
- Server URL via environment config: `VITE_RELAY_URL=wss://your-relay-domain.com`
- Never hardcode server URLs in source
- Use per-environment configs: local, staging, production

## Cursor Networking

- Client sends `cursor.move` with normalized coordinates (`x = 0..1`, `y = 0..1`)
- Host updates authoritative presence state and broadcasts `presence.state` through relay
- Update frequency: 20Hz (~50ms), send only when changed (do not send every `mousemove`)

## Cursor Rendering

- Local cursor: green (`0x44ff88`)
- Remote cursors: cycle through a palette (red, blue, orange, purple, pink)
- Each remote player gets a colored dot and a short ID label
- Use Phaser graphics primitives initially (no image assets needed)
- Remote cursors interpolate toward target position each frame — no snapping

## Shared Drawing Extension (Future)

Message types for the drawing feature built on the presence foundation:

- `draw.start` — pen down
- `draw.point` — pen move with position
- `draw.end` — pen up

Useful for whiteboards, card pointing, and annotations.

## Protocol Versioning

- Protocol types live in `shared/protocol` and are manually kept in sync with the relay server repo
- Long-term option: extract protocol into a third shared package/repo
- Until then: version protocol contracts carefully and coordinate changes across both repos

## Coordinate Standard

Always use normalized coordinates (0..1 range) for position data. Supports different screen sizes and desktop/mobile.

## Testing Tools

_(to be defined)_

## Platform Assumptions

- Browser-based (desktop and mobile web)
- WebSocket support required
