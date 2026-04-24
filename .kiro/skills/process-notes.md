---
name: Process Notes into Steering

description: Use this skill when the user asks to process `docs/notes.md`, mobile notes, design notes, or any sort of notes into Kiro steering files. The goal is to update the project’s steering files using new notes while preserving existing important information.
---

## Source File

Read:

```text
docs/notes.md
```

## Target Steering Files

Update only these files unless explicitly instructed otherwise:

```text
.kiro/steering/ai-agent-rules.md
.kiro/steering/project-design.md
.kiro/steering/structure.md
.kiro/steering/tech.md
```

## File Responsibilities

### `.kiro/steering/ai-agent-rules.md`

Use for:

- coding style preferences
- AI behaviour rules
- implementation preferences
- testing expectations
- refactoring rules
- naming conventions
- comments/documentation preferences
- “do” and “do not” instructions for the agent

### `.kiro/steering/project-design.md`

Use for:

- game concept
- high-level project overview
- design pillars
- player experience goals
- mechanics
- world/theme/lore
- design philosophy
- gameplay loops
- feature intentions
- long-term vision

### `.kiro/steering/structure.md`

Use for:

- repository layout
- folder responsibilities
- module boundaries
- where systems/components live
- naming/grouping patterns
- scene/state organisation
- asset organisation
- shared code organisation

### `.kiro/steering/tech.md`

Use for:

- engine/framework choices
- programming languages
- libraries
- build tools
- deployment targets
- asset pipeline
- testing tools
- platform assumptions
- technical constraints

## Processing Rules

When processing `docs/notes.md`:

1. Read all existing steering files first.
2. Read `docs/notes.md`.
3. Extract actionable information from the notes.
4. Categorise each note into the correct steering file.
5. Merge new information into existing content.
6. Preserve existing steering information unless it is clearly obsolete or contradicted.
7. Do not delete important content silently.
8. Do not drastically rewrite steering files unless necessary.
9. Prefer additive edits over destructive edits.
10. Keep steering files concise, structured, and useful for future agent context.

## Conflict Handling

If a note conflicts with existing steering guidance:

1. Do not overwrite automatically.
2. Add a clearly marked section such as:

```md
## Possible Conflict / Needs User Confirmation

- New note says: ...
- Existing steering says: ...
- Suggested resolution: ...
```

3. Ask the user before making a final decision.

## Major Change Handling

Ask the user before:

- removing existing steering guidance
- changing the project’s core design direction
- replacing the tech stack
- reorganising the repo structure
- changing coding standards significantly
- deleting or invalidating previous architecture decisions

Use this format:

```md
## Confirmation Needed

I found a note that may require a major steering change:

Existing guidance:
...

New note:
...

Suggested change:
...

Should I apply this change?
```

## Safe Changes

The agent may apply these without asking:

- adding new design ideas
- adding clarified implementation preferences
- adding new folder descriptions
- adding new technology details
- adding new coding conventions
- improving wording while preserving meaning
- moving misplaced information to the correct steering file
- adding “open questions” sections

## Notes Cleanup

After successfully integrating notes, do not delete `docs/notes.md` unless the user explicitly asks.

Instead, append a processed marker:

```md
---

## Processed Notes

Processed on: YYYY-MM-DD

Summary:
- Updated project-design.md with ...
- Updated tech.md with ...
- Updated structure.md with ...
- Updated ai-agent-rules.md with ...
```

## Suggested Steering File Format

Each steering file should use clear headings.

## Output Requirements

After processing, report:

```md
## Steering Update Summary

Updated:
- `.kiro/steering/project-design.md`
- `.kiro/steering/tech.md`
- `.kiro/steering/structure.md`
- `.kiro/steering/ai-agent-rules.md`

Key additions:
- ...

Conflicts or confirmations needed:
- ...

Notes left unprocessed:
- ...
```

## Agent Instruction

When invoking this skill, the agent should behave conservatively. The steering files are long-term project memory. Accuracy and preservation are more important than aggressive cleanup.
