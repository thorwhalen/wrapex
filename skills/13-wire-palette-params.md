# Skill 13: Wire Palette Params — Parameter Collection for Command Palettes

## Goal

Add parameter collection to an existing command palette so that parameterized commands collect typed input before dispatch. After this skill, every command in the registry is safely invocable from the palette — parameter-free commands execute immediately, parameterized commands collect input first, and no Zod validation errors ever leak to the user.

---

## Prerequisites

- Skill 06 (Wire Palette) complete — a command palette component exists and dispatches parameter-free commands via the registry
- Skill 05 (Enrich) recommended — commands have Zod schemas with `.describe()` on fields
- Zod is available in the project

## Output

New files in `wrapex-output/commands/`:
- `consumers/param-collector.ts` — pure utility functions (schema introspection, coercion, pattern selection)
- `consumers/param-collector-ui.tsx` — React form component for inline parameter collection
- Modified `consumers/command-palette.tsx` (or equivalent) — dispatch logic updated with collecting state

---

## Reference

This skill implements the patterns described in:
- `docs/resources/parameterized_command_palette_guide.md` (Patterns A–D, decision tree, error handling)
- `templates/param-collector.ts` (reusable utility functions)

---

## Steps

### Step 1: Copy the Param Collector Utilities

Copy `templates/param-collector.ts` to `wrapex-output/commands/consumers/param-collector.ts`.

This file provides five pure functions:

| Function | Purpose |
|----------|---------|
| `isParameterFree(schema?)` | Returns `true` if command needs no user input |
| `introspectSchema(schema)` | Walks Zod shape, returns `FieldDescriptor[]` |
| `selectCollectionPattern(cmd)` | Decision tree: `'immediate'` / `'inline'` / `'form'` / `'delegate'` |
| `coerceValue(raw, schema)` | Converts string input to typed value (string → number, etc.) |
| `buildDefaultParams(fields)` | Pre-fills optional fields with their defaults |

Review the template's `// CONFIGURE:` comments and adapt if needed (e.g., if the project uses a non-standard Zod import path).

### Step 2: Classify Your Commands

Run `introspectSchema` against each command's schema to understand what the palette will need to render. Group commands into three buckets:

| Bucket | Criteria | Palette Behavior |
|--------|----------|-----------------|
| **Immediate** | No schema, or all fields optional | Execute with `{}` — no UI change needed |
| **Inline** | Exactly 1 required field | Show single labeled input after selection |
| **Form** | 2+ required fields, or 1 complex field | Show compact multi-field form |

Commands with a `paletteHint` of type `'focus-panel'` should delegate to the existing UI panel instead of collecting params inline.

### Step 3: Create the ParamCollector UI Component

Create `wrapex-output/commands/consumers/param-collector-ui.tsx`.

This component renders inside the palette dialog when a parameterized command is selected. It receives the command's `FieldDescriptor[]` and renders one input per field.

**Field type → input mapping:**

| `FieldDescriptor.type` | Rendered as |
|------------------------|-------------|
| `'number'` | `<input type="number">` |
| `'string'` | `<input type="text">` |
| `'boolean'` | `<input type="checkbox">` (or toggle) |
| `'enum'` | `<select>` with options from `enumValues` |
| `'json'` | `<textarea>` with placeholder showing expected shape |

**Key behaviors:**

- **Auto-focus**: First required field receives focus when the component mounts.
- **Submit on Enter**: When in a single-field (inline) mode, Enter submits. In multi-field (form) mode, Enter in the last field submits, or a Submit button is provided.
- **Cancel on Escape**: Returns to the command list without dispatching.
- **Validation**: On submit, run `command.schema.safeParse(collectedParams)`. If validation fails, show error messages inline next to the offending fields. Do not dispatch.
- **Coercion**: Use `coerceValue()` to convert text input to the schema's expected type before validation. The user types strings; the schema expects typed values.

**Example implementation (inline single-field):**

```tsx
function InlineParamInput({
  field,
  onSubmit,
  onCancel,
}: {
  field: FieldDescriptor;
  onSubmit: (value: unknown) => void;
  onCancel: () => void;
}) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = () => {
    const coerced = coerceValue(raw, field.zodSchema);
    const result = field.zodSchema.safeParse(coerced);
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    onSubmit(result.data);
  };

  return (
    <div>
      <label>{field.description ?? field.name}</label>
      {field.type === 'enum' ? (
        <select
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onCancel();
          }}
        >
          <option value="">Select...</option>
          {field.enumValues?.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      ) : field.type === 'boolean' ? (
        <label>
          <input
            type="checkbox"
            checked={raw === 'true'}
            onChange={(e) => { setRaw(String(e.target.checked)); setError(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
              if (e.key === 'Escape') onCancel();
            }}
          />
          {field.name}
        </label>
      ) : (
        <input
          ref={inputRef}
          type={field.type === 'number' ? 'number' : 'text'}
          placeholder={field.description ?? field.name}
          value={raw}
          onChange={(e) => { setRaw(e.target.value); setError(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
            if (e.key === 'Escape') onCancel();
          }}
        />
      )}
      {error && <div style={{ color: '#f38ba8', fontSize: '12px' }}>{error}</div>}
    </div>
  );
}
```

**For the compact form (multi-field):**

```tsx
function CompactParamForm({
  fields,
  onSubmit,
  onCancel,
}: {
  fields: FieldDescriptor[];
  onSubmit: (params: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    // Coerce all values, validate via schema, dispatch or show errors
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
      {fields.map((field) => (
        <SchemaField
          key={field.name}
          field={field}
          value={values[field.name] ?? ''}
          error={errors[field.name]}
          onChange={(v) => setValues({ ...values, [field.name]: v })}
        />
      ))}
      <div>
        <button type="submit">Execute</button>
        <button type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
```

### Step 4: Wire Collection into the Palette Dispatch

Modify the palette component's dispatch logic. The palette operates as a two-state machine:

```
BROWSING (default — shows command list)
  ├── User selects parameter-free command → execute immediately → CLOSED
  └── User selects parameterized command → COLLECTING

COLLECTING (shows param form for the selected command)
  ├── User submits valid params → execute with params → CLOSED
  ├── User presses Escape → BROWSING
  └── User clicks "Back" → BROWSING
```

**Key changes to the palette component:**

1. Add state variables:
```typescript
const [mode, setMode] = useState<'browsing' | 'collecting'>('browsing');
const [collectingCommand, setCollectingCommand] = useState<CommandDefinition | null>(null);
const [collectingFields, setCollectingFields] = useState<FieldDescriptor[]>([]);
```

2. Update the `executeCommand` callback:
```typescript
const executeCommand = useCallback(async (cmd: CommandDefinition) => {
  if (isParameterFree(cmd.schema)) {
    // Execute immediately (existing behavior)
    setOpen(false);
    const result = await registry.execute(cmd.id, {}, context);
    onCommandExecuted?.(cmd.id, result);
  } else {
    // Transition to collecting mode
    const fields = introspectSchema(cmd.schema!);
    setCollectingCommand(cmd);
    setCollectingFields(fields);
    setMode('collecting');
  }
}, [registry, context, setOpen, onCommandExecuted]);
```

3. Add a submit handler for the collecting phase:
```typescript
const submitParams = useCallback(async (params: Record<string, unknown>) => {
  if (!collectingCommand) return;
  setOpen(false);
  setMode('browsing');
  setCollectingCommand(null);
  const result = await registry.execute(collectingCommand.id, params, context);
  onCommandExecuted?.(collectingCommand.id, result);
}, [collectingCommand, registry, context, setOpen, onCommandExecuted]);
```

4. Add a cancel handler:
```typescript
const cancelCollecting = useCallback(() => {
  setMode('browsing');
  setCollectingCommand(null);
  setCollectingFields([]);
  // Re-focus the search input
  requestAnimationFrame(() => inputRef.current?.focus());
}, []);
```

5. Update the render:
```tsx
{mode === 'collecting' && collectingCommand ? (
  <div>
    <div style={styles.breadcrumb}>
      <span onClick={cancelCollecting} style={{ cursor: 'pointer' }}>← </span>
      {collectingCommand.label}
    </div>
    {collectingFields.length === 1 ? (
      <InlineParamInput
        field={collectingFields[0]}
        onSubmit={(value) => submitParams({ [collectingFields[0].name]: value })}
        onCancel={cancelCollecting}
      />
    ) : (
      <CompactParamForm
        fields={collectingFields}
        onSubmit={submitParams}
        onCancel={cancelCollecting}
      />
    )}
  </div>
) : (
  // Existing command list rendering
)}
```

6. Update footer hint text:
```tsx
<div style={styles.footer}>
  {mode === 'collecting' ? (
    <span><kbd>↵</kbd> Execute &nbsp; <kbd>Esc</kbd> Back</span>
  ) : (
    <span><kbd>↑↓</kbd> Navigate &nbsp; <kbd>↵</kbd> Execute &nbsp; <kbd>Esc</kbd> Close</span>
  )}
</div>
```

7. Reset mode when palette closes:
```typescript
const setOpen = useCallback((open: boolean) => {
  setInternalOpen(open);
  onOpenChange?.(open);
  if (!open) {
    setQuery('');
    setSelectedIndex(0);
    setMode('browsing');        // ← reset
    setCollectingCommand(null); // ← reset
  }
}, [onOpenChange]);
```

### Step 5: Handle Validation, Coercion, and Errors

The palette is responsible for validating input before dispatch. The command handler should never see invalid params from the palette.

**Validation flow:**
1. User fills fields and presses Enter / clicks Execute
2. For each field, apply `coerceValue(rawString, fieldSchema)`
3. Assemble coerced values into a params object
4. Call `command.schema.safeParse(params)`
5. If success: dispatch `registry.execute(command.id, result.data, context)`
6. If failure: map `ZodError.issues` back to field names, show inline error messages

**Coercion rules:**

| Schema type | Raw string | Coerced value |
|-------------|-----------|---------------|
| `z.number()` | `"1.5"` | `1.5` |
| `z.boolean()` | `"true"` | `true` |
| `z.enum([...])` | `"points"` | `"points"` (passthrough) |
| `z.string()` | `"hello"` | `"hello"` (passthrough) |
| `z.array(...)` / `z.object(...)` / `z.record(...)` | `"[1,2,3]"` | `JSON.parse("[1,2,3]")` |

For JSON fields, if `JSON.parse` fails, show "Invalid JSON" as the error.

### Step 6: Add paletteHint Support (Optional)

For commands where a dedicated UI panel provides a better experience than inline collection, support an optional `paletteHint` in the command metadata:

```typescript
// In command definition (optional, no changes to defineCommand required)
defineCommand({
  id: 'app.appearance.setPointColor',
  schema: z.object({ color: z.string() }),
  paletteHint: { type: 'focus-panel', panel: 'appearance', section: 'colors' },
  execute: async (params) => { /* ... */ },
});
```

In the palette dispatch:
```typescript
if (cmd.paletteHint?.type === 'focus-panel') {
  setOpen(false);
  // Emit an event or call a callback that the app handles
  onFocusPanel?.(cmd.paletteHint.panel, cmd.paletteHint.section);
  return;
}
```

This is opt-in. If no `paletteHint` is set, the palette falls back to schema-driven collection.

---

## Validation Checklist

- [ ] `isParameterFree()` correctly classifies all commands (no false positives or negatives)
- [ ] `introspectSchema()` handles string, number, boolean, enum, optional, default, array, record, nested object
- [ ] `coerceValue()` converts text inputs to typed values without data loss
- [ ] Selecting a parameter-free command executes immediately (no regression)
- [ ] Selecting a parameterized command shows the appropriate collection UI
- [ ] Single-field commands show an inline input (Pattern A)
- [ ] Multi-field commands show a compact form (Pattern C)
- [ ] Enter submits, Escape cancels (returns to command list)
- [ ] Validation errors appear inline next to the offending field
- [ ] Invalid input never reaches the command handler
- [ ] Closing and reopening the palette resets to browsing mode
- [ ] Tests cover introspection, coercion, pattern selection, and end-to-end dispatch
