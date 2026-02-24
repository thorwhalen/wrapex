# wrapex — AI Agent Skill File

You are an AI coding agent performing a command dispatch refactoring using the **wrapex toolkit**. This file is your master guide. Follow the skills in order unless instructed otherwise.

## What You're Doing

You are incrementally introducing a **command dispatch architecture** into an existing TypeScript/React codebase using the **strangler fig pattern**: wrapping existing functions in new command definitions without modifying existing code.

## Critical Rules

1. **NEVER modify existing source files.** All new files go in `wrapex-output/` or a designated commands directory.
2. **Follow naming conventions** in `rules/command-naming.md`.
3. **Follow category conventions** in `rules/command-categories.md`.
4. **Follow when-clause conventions** in `rules/when-clause-conventions.md`.
5. **Output structured data** conforming to schemas in `schemas/`.
6. **Progressive value delivery.** Each skill delivers standalone value. Don't block on completing all skills.

## Skill Execution Order

### Phase 1: Foundation (do these in order)

| # | Skill | File | What it produces |
|---|-------|------|-----------------|
| 1 | **Diagnose** | `skills/01-diagnose.md` | `wrapex-output/diagnosis-report.json` — all command candidates |
| 2 | **Plan** | `skills/02-plan.md` | `wrapex-output/refactoring-plan.json` — prioritized backlog |
| 3 | **Scaffold** | `skills/03-scaffold.md` | `wrapex-output/commands/core/` — registry infrastructure |
| 4 | **Wrap** | `skills/04-wrap.md` | `wrapex-output/commands/definitions/` — command wrappers |

After Phase 1, the user has a working command registry with 15-20 commands. Zero changes to existing code.

### Phase 2: Enrichment (do after Phase 1)

| # | Skill | File | What it produces |
|---|-------|------|-----------------|
| 5 | **Enrich** | `skills/05-enrich.md` | Zod schemas, descriptions, when-clauses on commands |

### Phase 3: Wire-ups (independent — do any subset, in any order)

| # | Skill | File | What it produces |
|---|-------|------|-----------------|
| 6 | **Palette** | `skills/06-wire-palette.md` | Command palette (Ctrl+K) |
| 7 | **Shortcuts** | `skills/07-wire-shortcuts.md` | Keyboard shortcut bindings |
| 8 | **Telemetry** | `skills/08-wire-telemetry.md` | Sentry breadcrumbs + analytics |
| 9 | **AI Tools** | `skills/09-wire-ai-tools.md` | AI-callable tool definitions |
| 10 | **MCP** | `skills/10-wire-mcp.md` | MCP server exposing commands |
| 11 | **Tests** | `skills/11-wire-tests.md` | Test skeleton generation |
| 12 | **Feature Flags** | `skills/12-wire-feature-flags.md` | Feature flag gating |
| 13 | **Palette Params** | `skills/13-wire-palette-params.md` | Parameter collection for parameterized commands |

## Templates

Code templates are in `templates/`. Copy and adapt them — they have `// CONFIGURE:` comments marking customization points.

## Examples

Worked examples in `examples/` show the wrapping pattern for each source type:
- `zustand-store-wrap/` — Zustand store actions
- `event-handler-wrap/` — React event handlers
- `api-call-wrap/` — tRPC / fetch / REST calls
- `redux-action-wrap/` — Redux Toolkit actions and thunks

## How to Start

1. Read `skills/01-diagnose.md` and execute it against the target codebase.
2. Review the diagnosis report with the user.
3. Read `skills/02-plan.md` and produce the plan.
4. Get user sign-off on the plan.
5. Execute `skills/03-scaffold.md` then `skills/04-wrap.md`.
6. Ask the user which wire-up skills they want next.
