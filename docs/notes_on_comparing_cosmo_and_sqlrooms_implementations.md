# Wrapex Notes: Comparing Cosmograph and SQLRooms Implementations

These notes are for wrapex development — capturing what wrapex actually produced in cosmograph, what an expert JS/TS developer independently built for the same spec in sqlrooms, and what wrapex could learn or adopt.

See also: [Full comparison document](../../../c/cosmograph/docs/local/comparing_cosmograph_and_sqlrooms_command_implementations.md)

---

## What wrapex generated for cosmograph

Wrapex produced the entire `wrapex-output/commands/` directory:

- **Core layer**: `define-command.ts` (~62 lines), `command-registry.ts` (~133 lines), `middleware-pipeline.ts` (~72 lines)
- **21 command definitions** across 7 categories, each in its own file under `definitions/{category}/`
- **Store bridge**: Adapter from real Zustand store to MockStore interface
- **5 consumer adapters**: command palette, keyboard shortcuts, AI tools, MCP server, Playwright E2E
- **Schema catalog**: SSOT system extracting schemas from real app
- **330 tests**

Total: ~4,500 lines of new code, 2 lines changed in existing code.

The key architectural choice wrapex made: **complete isolation**. Commands operate against a MockStore interface, never importing from the app. A single bridge file adapts the real store. This is textbook strangler fig.

---

## What sqlrooms built independently (PR #382)

An expert TS developer (Ilya) read the same design document and built:

- **CommandSlice** (~664 lines): A Zustand slice that *is* the registry
- **CommandAdapters** (~186 lines): CLI and MCP adapters
- **Command Palette** (~686 lines): Using cmdk + Monaco editor
- **AI tools** (~179 lines): Two meta-tools (`list_commands`, `execute_command`)
- **Slice-level registration**: Each domain slice (DuckDB, Layout, AI, SQL Editor) registers its own commands in `initialize()`
- **toPortableSchema** (~34 lines): Zod → JSON Schema conversion
- **Tests**: One test file for schema conversion

Total: ~2,400 lines of new code, ~150 lines changed across existing slices.

---

## Key Differences That Matter for Wrapex

### 1. Registry-in-state vs. Registry-as-singleton

**Wrapex produced**: A standalone `Map<string, CommandDefinition>` singleton (not reactive).

**SQLRooms did**: Made the registry part of Zustand state (`state.commands.registry`), managed with Immer.

**Why this matters for wrapex**: The reactive registry is genuinely superior for React/Zustand apps. When commands are added/removed, the UI auto-updates. Wrapex's singleton requires manual subscription or re-render triggers.

**Action item**: Wrapex should offer both patterns:
- **Pattern A** (current): Standalone registry — good for non-React contexts (MCP servers, CLI tools, test runners)
- **Pattern B** (new): Zustand-slice registry — better for React apps where the palette needs reactive command lists

This could be a skill option or a template variant.

### 2. Owner-based lifecycle management

**Wrapex produced**: Flat registration — all commands registered once at import time in `definitions/index.ts`.

**SQLRooms did**: Owner-based registration — each slice calls `registerCommandsForOwner(store, 'duckdb', [...])` during `initialize()` and `unregisterCommandsForOwner(store, 'duckdb')` during `destroy()`.

**Why this matters**: In dynamic apps where features load/unload, owner-based lifecycle is essential. When the SQL Editor panel is destroyed, its commands should disappear from the palette.

**Action item**: Wrapex should add:
- `registry.registerForOwner(owner: string, commands: CommandDef[])`
- `registry.unregisterForOwner(owner: string)`
- Documentation/skill for lifecycle-aware registration

### 3. `isVisible` vs. `isEnabled` separation

**Wrapex produced**: Single `when` clause (string) that gates both visibility and executability.

**SQLRooms did**: Two separate function predicates:
- `isVisible(context) → boolean` — should the command appear in the palette?
- `isEnabled(context) → boolean` — can the command be executed right now?

**Why this matters**: A disabled-but-visible command in the palette (greyed out) is better UX than a disappeared command. The user knows the capability exists but understands why it's currently unavailable.

**Action item**: Wrapex's CommandDefinition interface should support:
```typescript
when?: string;         // declarative (current — serializable, data-driven)
isVisible?: (ctx) => boolean;  // imperative override for visibility
isEnabled?: (ctx) => boolean;  // imperative override for executability
```
The `when` clause remains the default (article-aligned), but imperative overrides are available when needed.

### 4. Policy metadata

**Wrapex produced**: `requiresConfirmation: boolean` and `tags: string[]` on commands.

**SQLRooms did**: Rich policy metadata:
```typescript
metadata: {
  readOnly?: boolean;      // Is this a query (no state change)?
  idempotent?: boolean;    // Safe to retry?
  riskLevel?: 'low' | 'medium' | 'high';
  requiresConfirmation?: boolean;
}
```

**Why this matters**: These map directly to MCP tool annotations (`readOnlyHint`, `idempotentHint`, `destructiveHint`). They also help AI assistants reason about command safety — an LLM can be more aggressive about executing `readOnly` + `idempotent` commands without confirmation.

**Action item**: Wrapex's `defineCommand` should include optional policy metadata. This should be a standard part of the command definition interface, not just tags.

### 5. Invocation context / surface tracking

**Wrapex produced**: `context.source: string` (e.g., 'ai', 'palette', 'mcp').

**SQLRooms did**: Richer invocation tracking:
```typescript
type RoomCommandInvocation = {
  surface: 'palette' | 'ai' | 'cli' | 'mcp' | 'api' | 'unknown';
  actor?: string;      // who triggered it (user ID, AI model, etc.)
  traceId?: string;    // correlation ID for distributed tracing
  metadata?: Record<string, unknown>;  // extensible context
};
```

**Why this matters**: This is critical for telemetry (article Section 3.6). Knowing *who* triggered a command, from *which surface*, with a *trace ID* for correlation, is exactly what you need for production observability.

**Action item**: Wrapex should upgrade `CommandContext` to include structured invocation data. The `source` field should become a proper invocation object.

### 6. AI tool strategy: per-command vs. meta-tools

**Wrapex produced**: One AI tool per command (filtered by `tags: ['ai-tool']`).

**SQLRooms did**: Two meta-tools: `list_commands` (returns all command descriptors) + `execute_command` (executes by ID + input).

**Trade-offs**:

| | Per-command (wrapex) | Meta-tools (sqlrooms) |
|---|---|---|
| **LLM schema validation** | Per-tool JSON Schema → the LLM generates valid params | No per-command schema in tool definition → runtime validation only |
| **Discovery** | All tools visible at once | LLM must call `list_commands` first |
| **Token usage** | O(n) tool definitions in system prompt | O(1) tool definitions; command list in a separate call |
| **Scalability** | Poor for 50+ commands | Excellent for any command count |
| **Type safety at call time** | Strong (schema per tool) | Weak (generic `input: unknown`) |

**Action item**: Wrapex should support both strategies as skill options:
- **Skill 9a**: Per-command AI tools (current) — for apps with <30 commands
- **Skill 9b**: Meta-tool pattern (new) — for apps with many commands
- **Skill 9c**: Hybrid — top-10 commands as first-class tools + meta-tools for discovery

### 7. Command definition colocation vs. separation

**Wrapex produced**: One file per command in `definitions/{category}/command.ts`. All commands imported and registered in `definitions/index.ts`.

**SQLRooms did**: Commands defined inline within each domain slice's `initialize()` method.

**Trade-offs**:

| | Separate files (wrapex) | Colocated in slices (sqlrooms) |
|---|---|---|
| **Discoverability** | Easy to browse command catalog | Must search across all slices |
| **Isolation** | Commands don't import from slices | Commands have direct access to slice internals |
| **Lifecycle** | Static (registered once) | Dynamic (registered/unregistered with slice) |
| **Testing** | Easy to test in isolation | Must set up slice context |
| **Maintenance** | Extra files to maintain | Changes are colocated with domain logic |

**Action item**: Wrapex should document both patterns and let the user choose:
- **Pattern A** (current): Separate `definitions/` directory — best for strangler fig phase
- **Pattern B** (for later phases): Colocated in domain modules — best after extract phase when commands are the canonical implementation

This maps to the article's migration phases: Phase 1-2 (wrap) → separate files; Phase 3 (extract) → colocated.

### 8. Portable schema conversion

**Wrapex produced**: Each consumer converts Zod → JSON Schema independently (in AI tools, MCP, palette).

**SQLRooms did**: A single `toPortableSchema()` function converts once to a `RoomCommandPortableSchema` type. All consumers use this portable form.

**Why this matters**: Converting once and reusing is cleaner and prevents subtle inconsistencies between consumers. The `RoomCommandPortableSchema` type is also useful for serialization (e.g., sending command descriptors over the wire).

**Action item**: Wrapex should add a `toPortableSchema` utility (or adopt `z.toJSONSchema` directly) and include the portable schema in the command descriptor type. The `listCommands()` / `list()` return type should optionally include `inputSchema: JsonSchema`.

### 9. Custom input components

**Wrapex produced**: Schema introspection → auto-generated form fields (text, number, enum, JSON).

**SQLRooms did**: Optional `inputComponent: ComponentType<RoomCommandInputComponentProps>` per command, plus a Monaco JSON editor as the default fallback.

**Why this matters**: Some commands need specialized UIs (color pickers, node selectors, SQL editors). A command that controls graph layout might need a visual configurator, not a JSON text field.

**Action item**: Wrapex's palette skill should support an `inputComponent` field on command definitions. The auto-generated form remains the default; `inputComponent` is the escape hatch.

---

## Summary: Priority Action Items for Wrapex

### High priority (should adopt):
1. **Reactive registry option** — Zustand-slice pattern for React apps
2. **Owner lifecycle** — `registerForOwner` / `unregisterForOwner`
3. **Policy metadata** — `readOnly`, `idempotent`, `riskLevel` on command definitions
4. **Invocation context** — `surface`, `actor`, `traceId`, `metadata`
5. **Portable schema** — Convert once, include in command descriptors

### Medium priority (valuable additions):
6. **`isVisible` / `isEnabled` separation** — Richer availability model
7. **Meta-tool AI pattern** — Skill option for large command sets
8. **`inputComponent` support** — Custom palette input per command
9. **`keywords` field** — Dedicated search terms for palette

### Low priority (nice-to-have):
10. **Colocated definition pattern** — Document as post-extract-phase option
11. **`code` field in CommandResult** — Machine-readable error codes
12. **`inputDescription` field** — Human-readable hint for what input is expected

---

## Observations on wrapex's effectiveness

### What wrapex did well:
- **Clean isolation**: The MockStore pattern is genuinely good architecture. It enabled 330 tests without any app dependencies.
- **Middleware pipeline**: SQLRooms has no middleware — this is a gap in their implementation. Wrapex's composable middleware is the right pattern for telemetry, feature flags, undo/redo.
- **Test generation**: 330 tests is serious coverage. SQLRooms has ~1 test file.
- **Multiple consumer formats**: Vercel AI SDK, Anthropic API, and OpenAssistant formats in one adapter.
- **Article alignment**: Declarative when-clauses, data-not-code philosophy, strict strangler fig isolation.

### What wrapex could improve:
- **Reactivity gap**: The biggest weakness. React apps need reactive command lists.
- **No owner lifecycle**: Commands are static singletons — doesn't work for dynamic feature loading.
- **Per-consumer schema conversion**: Should convert once, not per-consumer.
- **No policy metadata**: Missing `readOnly`, `idempotent`, `riskLevel`.
- **No invocation tracking**: `source` is too simple for production telemetry.
- **No custom input component**: Palette is schema-driven only.

### What this comparison validates about wrapex's approach:
- The strangler fig strategy works. Both teams arrived at working implementations without big-bang rewrites.
- Zod as the schema layer is the right choice. Both teams use it identically.
- The command-as-primitive idea is sound. An expert developer independently implemented essentially the same architecture.
- The article's framework (state model, command registry, schema bridge) is a useful mental model. Both implementations map to it clearly.

### What this comparison reveals about the limits of toolkit-generated code:
- Wrapex generated code that favors isolation and testability over framework integration. The MockStore pattern is clean but misses the Zustand-native reactivity that SQLRooms gets for free.
- An expert developer naturally wrote code that's more deeply integrated with the framework (Zustand slices, Immer, owner lifecycle). This integration enables patterns (reactive registry, dynamic registration) that wrapex's isolated approach doesn't support out of the box.
- The lesson: wrapex should offer **integration-aware patterns** alongside its current isolation-first patterns. The strangler fig starts isolated, but the "extract" phase (article Section 7.3) requires deeper integration.

---

*Notes generated 2026-02-25. For wrapex development planning.*
