# AI Agent Rules

## General Coding Style

- Use TypeScript everywhere — no plain JS files
- Every network message must have an explicit TypeScript type
- Use scoped package names: `@party/<name>`

## Architecture Rules

- Keep rendering separate from networking
- Keep shared packages clean — only genuinely reusable cross-app code
- Do not duplicate relay server responsibilities (lobby management, message routing, host designation) in this repo
- Do not rebuild lobby authority logic client-side beyond what is necessary for UX
- Do not hardcode server URLs — always use `VITE_RELAY_URL` environment config

## Implementation Preferences

- Minimal UI first — utility over polish in early milestones
- Build fast feedback loops — visible progress each milestone
- Use normalized coordinates (0..1) for all position/cursor data
- Throttle cursor updates to ~20Hz; do not send on every `mousemove`
- Remote cursor markers must interpolate toward target positions each frame (no visual snapping)

## Phaser Specifics

- Start with a single `MainScene` — do not overengineer the scene system initially
- `MainScene` responsibilities: connect to relay, pointer tracking, send updates, render players, simple lobby status

## Monorepo / Scaffolding Rules

- Always scaffold new Phaser apps inside `apps/<name>/` — never at repo root
- Remove any nested `.git` directories created by scaffolding tools immediately
- Each `shared/` subfolder must have its own `package.json`

## Do Not

- Hardcode server URLs
- Implement per-app socket logic (use `@party/net`)
- Trust guest players with authoritative state
- Create a catch-all shared misc folder
- Overbuild the portal before networking is stable
- Add feature complexity before relay networking is proven working
