# AGENTS.md — wrapex

This repository contains the **wrapex** Command Dispatch Refactoring Toolkit.

## For AI Agents

1. Read `SKILL.md` for the master skill file with all 12 skills and 3 rules.
2. Skills are in `skills/` (01-diagnose through 12-wire-feature-flags).
3. Rules are in `rules/` (naming, categories, when-clauses).
4. Worked examples are in `examples/` (zustand, event-handler, api-call, redux).
5. TypeScript runtime code is in `src/` (command registry, middleware, adapters).
6. Zod schemas are in `src/schemas/`.

## Quick Start

- To diagnose a codebase, follow `skills/01-diagnose.md`.
- To scaffold commands, follow `skills/03-scaffold.md`.
- Always follow the rules in `rules/` for naming, categories, and when-clauses.
