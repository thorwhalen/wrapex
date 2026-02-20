# wrapex

A toolkit for incrementally adopting a **command dispatch architecture** in any TypeScript/React codebase. AI-agent-first — the primary interface is an AI coding agent that reads the skill files and follows them step by step.

## What It Does

wrapex helps you wrap existing functions, store actions, and event handlers into a centralized **command registry** — without modifying existing code. Once commands are registered, you can wire them to:

- **Command palette** (Ctrl+K search and execute)
- **Keyboard shortcuts**
- **AI assistant tools** (Vercel AI SDK / Anthropic SDK)
- **MCP server tools** (for Claude Desktop, Cursor, etc.)
- **Telemetry** (Sentry breadcrumbs + analytics events)
- **Test skeletons**
- **Feature flags**

## The Strangler Fig Approach

The toolkit follows the strangler fig migration pattern:

1. **Wrap**: Create new command definition files that delegate to existing code. Zero changes to original files.
2. **Enrich**: Add Zod schemas, descriptions, keybindings, when-clauses.
3. **Wire**: Connect commands to palettes, shortcuts, AI, MCP, telemetry, tests.

The existing codebase continues to work unchanged. Commands are an additional layer, not a replacement.

## Installation

### npm (TypeScript runtime)

```bash
npm install wrapex
```

```typescript
import { defineCommand, createRegistry } from 'wrapex';
import { createPaletteAdapter } from 'wrapex/adapters';
import { CommandCandidate } from 'wrapex/schemas';
```

### pip (Python — data access)

```bash
pip install wrapex
```

```python
import wrapex

# List and read skills, rules, examples, schemas
wrapex.list_skills()          # ['01-diagnose.md', '02-plan.md', ...]
wrapex.get_skill('01')        # Returns the content of 01-diagnose.md
wrapex.get_rule('naming')     # Returns command-naming.md content
wrapex.get_example('zustand') # Returns the zustand example README
```

### GitHub (raw files for AI agents)

Point your AI coding agent directly at the repo. The `SKILL.md` file is the master guide.

## Quick Start

### For AI Agents

Read `SKILL.md` — it's the master guide. Follow the skills in order:

1. `skills/01-diagnose.md` → Scan the codebase, produce a diagnosis report
2. `skills/02-plan.md` → Prioritize candidates into a phased backlog
3. `skills/03-scaffold.md` → Set up the registry infrastructure
4. `skills/04-wrap.md` → Create command wrappers
5. `skills/05-enrich.md` → Add schemas and metadata
6. `skills/06-12` → Wire to palette, shortcuts, AI, MCP, tests, etc.

### For Humans

1. Point your AI coding agent (Claude Code, Cursor, Copilot) at this toolkit.
2. Tell it to read `SKILL.md` and run the diagnosis on your codebase.
3. Review the diagnosis report and refactoring plan.
4. Let the agent scaffold and wrap commands.
5. Choose which wire-up skills you want (palette, AI tools, MCP, etc.).

## Directory Structure

```
wrapex/
├── SKILL.md                           # Master skill file for AI agents
├── AGENTS.md                          # AI agent instructions
├── skills/                            # 12 step-by-step skill files
├── rules/                             # Naming, categories, when-clause conventions
├── examples/                          # Worked examples (zustand, event-handler, api-call, redux)
├── templates/                         # command-definition.ts.template
├── src/                               # TypeScript runtime (npm package source)
│   ├── define-command.ts              # defineCommand helper + types
│   ├── command-registry.ts            # Core registry with middleware pipeline
│   ├── middleware-pipeline.ts         # Pre-built middleware
│   ├── validation-middleware.ts       # Zod validation middleware
│   ├── telemetry-middleware.ts        # Sentry + analytics middleware
│   ├── adapters/                      # palette, MCP, AI tools, test-generator
│   └── schemas/                       # Zod schemas for diagnosis, planning
├── python/wrapex/                     # Python package source
├── ts-tests/                          # TypeScript tests (vitest)
└── py-tests/                          # Python tests (pytest)
```

## Design Principles

1. **AI-agent-first**: Skill files are instructions an AI agent reads and follows.
2. **Zero-touch**: Diagnose and Wrap phases never modify existing files.
3. **Progressive value**: Each skill delivers standalone value.
4. **Generic**: Works with Zustand, Redux, MobX, or plain React state.
5. **Small runtime**: Registry + middleware + adapters < 500 lines total.

## Compatibility

Works with (but does not depend on):

- **State**: Zustand, Redux Toolkit, MobX, Jotai, Recoil, plain React
- **Schemas**: Zod v3 or v4
- **Palette**: cmdk, kbar
- **Shortcuts**: tinykeys
- **AI**: Vercel AI SDK, Anthropic SDK
- **MCP**: MCP TypeScript SDK
- **Telemetry**: Sentry, PostHog, Amplitude
- **Testing**: Vitest, Jest, Playwright
- **Feature flags**: PostHog, LaunchDarkly, Statsig

## Architecture Reference

The command dispatch pattern draws from:

- **VS Code's command system**: String IDs, when-clauses, dual registration
- **Redux middleware**: Composable pipeline wrapping dispatch
- **Strangler fig pattern**: Incremental migration without big-bang rewrites
- **Zod as schema bridge**: Single definition → TS types + JSON Schema + validation
