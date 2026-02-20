# Skill 05: Enrich — Add Schemas, Labels, When-Clauses

## Goal

Progressively add metadata to wrapped commands. This skill is run after Skill 04 (Wrap) to enhance commands with:

1. **Zod parameter schemas** — enables AI tools, MCP tools, validation, and palette parameter forms.
2. **Rich descriptions** — improves palette search and AI tool selection.
3. **When-clause preconditions** — commands are only available when relevant.
4. **Keybindings** — natural keyboard shortcuts.
5. **Tags** — for filtering, feature flags, and documentation.

---

## Inputs

- Wrapped commands in `wrapex-output/commands/definitions/`
- The original codebase (read-only, to understand parameter types)
- `wrapex-output/diagnosis-report.json` (for parameter candidates)

## Output

Updated command definition files with enriched metadata.

---

## Steps

### Step 1: Prioritize Enrichment

Not all commands need all metadata. Prioritize based on which wire-up skills you want to enable:

| Metadata | Needed for |
|----------|-----------|
| Zod schema | AI tools, MCP tools, validation, palette param forms |
| Description | Palette search, AI tool selection |
| When-clause | Context-aware palette, shortcut availability |
| Keybinding | Keyboard shortcuts |
| Tags | Feature flags, documentation, filtering |

**Start with Zod schemas** for commands that will be exposed as AI tools or MCP tools. Then add when-clauses for commands that are context-dependent.

### Step 2: Add Zod Schemas

For each command that takes parameters, define a Zod schema.

**Guidelines**:
- Use `.describe()` on every field — these descriptions become AI tool parameter descriptions and MCP tool parameter descriptions.
- Keep schemas simple and declarative. No `.refine()` or `.transform()` — those don't translate to JSON Schema.
- Use `z.enum()` for constrained string values.
- Use `z.number().int().min(0)` for bounded numbers.
- Use `z.object()` for structured params.
- Use `z.union()` sparingly (AI models handle it less well).

**Example — enriching a simple command**:

Before (from Skill 04):
```typescript
export const setZoomLevelCommand = defineCommand({
  id: 'app.camera.setZoomLevel',
  label: 'Set Zoom Level',
  category: 'Camera',
  execute: async (params, _ctx) => {
    useAppStore.getState().setZoomLevel(params.level);
    return { success: true };
  },
});
```

After (enriched):
```typescript
const schema = z.object({
  level: z.number()
    .min(0.1)
    .max(10)
    .describe('Zoom level multiplier (0.1 = fully zoomed out, 10 = max zoom)'),
});

export const setZoomLevelCommand = defineCommand({
  id: 'app.camera.setZoomLevel',
  label: 'Set Zoom Level',
  category: 'Camera',
  description: 'Set the viewport zoom to a specific level',
  schema,
  keybinding: undefined, // No natural shortcut for a parameterized command
  when: 'app.visualizationReady',
  tags: ['camera', 'viewport'],
  execute: async (params, _ctx) => {
    useAppStore.getState().setZoomLevel(params.level);
    return { success: true, message: `Zoom set to ${params.level}x.` };
  },
});
```

### Step 3: Add When-Clauses

When-clauses make commands context-aware. A command with `when: 'app.dataLoaded'` only appears in the palette when data is loaded.

**Common when-clause patterns**:

| Clause | Meaning |
|--------|---------|
| `app.dataLoaded` | A dataset is loaded |
| `app.hasSelection` | Points/items are selected |
| `app.isEditable` | The project is not read-only |
| `app.isAuthenticated` | User is logged in |
| `app.visualizationReady` | The visualization has rendered |
| `app.hasUnsavedChanges` | There are unsaved modifications |

Combine with `&&` and `||` for compound conditions:
- `app.dataLoaded && app.isEditable`
- `app.hasSelection || app.hasHighlight`

**The evaluateWhen function** in the registry config must be implemented to resolve these clauses against actual app state. See `rules/when-clause-conventions.md` for full conventions.

### Step 4: Add Keybindings

Assign keyboard shortcuts to commands that are frequently used and don't require parameter input.

**Guidelines**:
- Follow platform conventions (Ctrl on Windows/Linux, Cmd on Mac).
- Don't conflict with browser defaults (Ctrl+T, Ctrl+W, Ctrl+N, etc.).
- Use Ctrl+Shift+{key} for app-specific commands.
- Use single keys for modal commands (when a panel is focused).

**Example keybindings**:

| Command | Keybinding |
|---------|-----------|
| Zoom to Fit | `Ctrl+Shift+F` |
| Toggle Sidebar | `Ctrl+B` |
| Open Command Palette | `Ctrl+K` |
| Select All | `Ctrl+A` (when canvas focused) |
| Delete Selection | `Delete` (when has selection) |
| Undo | `Ctrl+Z` |
| Redo | `Ctrl+Shift+Z` |

### Step 5: Add Tags

Tags enable filtering and feature-flag gating:

```typescript
tags: ['camera', 'viewport', 'ai-exposed', 'mcp-exposed'],
```

**Standard tags**:
- `ai-exposed` — command is exposed as an AI tool
- `mcp-exposed` — command is exposed as an MCP tool
- `dangerous` — command has destructive side effects
- `experimental` — command is behind a feature flag
- Domain tags matching the category (lowercase)

---

## Validation Checklist

- [ ] High-priority commands have Zod schemas with `.describe()` on every field
- [ ] Descriptions are one sentence, clear, and useful for AI tool selection
- [ ] When-clauses use the conventions from `rules/when-clause-conventions.md`
- [ ] Keybindings don't conflict with browser or OS defaults
- [ ] Tags follow the standard tagging conventions
- [ ] No existing files were modified
