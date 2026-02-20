# When-Clause Conventions

## Purpose

When-clauses control when a command is available. They are evaluated against the app's current context. A command with `when: 'app.dataLoaded'` only appears in the palette and only responds to keyboard shortcuts when data is loaded.

## Syntax

When-clauses are strings that reference context keys. The registry's `evaluateWhen` function resolves them.

### Simple clauses

A single context key that evaluates to a boolean:

```
app.dataLoaded
app.hasSelection
app.isEditable
app.isAuthenticated
```

### Compound clauses

Combine with `&&` (AND) and `||` (OR):

```
app.dataLoaded && app.isEditable
app.hasSelection || app.hasHighlight
app.isAuthenticated && !app.isReadOnly
```

### Negation

Prefix with `!` to negate:

```
!app.isReadOnly
!app.hasUnsavedChanges
```

## Standard Context Keys

Define these in your app's when-clause evaluator:

| Key | Meaning | Source |
|-----|---------|--------|
| `app.dataLoaded` | A dataset is loaded and ready | Store: `data !== null` |
| `app.hasSelection` | One or more items are selected | Store: `selectedIndices.length > 0` |
| `app.isEditable` | The current project/document is editable | Store: `!isReadOnly` |
| `app.isReadOnly` | The current project/document is read-only | Store: `isReadOnly` |
| `app.isAuthenticated` | A user is logged in | Auth context: `user !== null` |
| `app.hasUnsavedChanges` | There are pending unsaved changes | Store: `isDirty` |
| `app.visualizationReady` | A visualization/canvas has rendered | Store: `isReady` |
| `app.canUndo` | The undo stack is non-empty | Undo system |
| `app.canRedo` | The redo stack is non-empty | Undo system |

## Implementing the Evaluator

The `evaluateWhen` function is passed to `createRegistry()`. It receives a when-clause string and returns a boolean.

### Simple implementation (key lookup)

```typescript
function evaluateWhen(clause: string): boolean {
  const state = useAppStore.getState();

  const context: Record<string, boolean> = {
    'app.dataLoaded': state.data !== null,
    'app.hasSelection': state.selectedIndices.length > 0,
    'app.isEditable': !state.isReadOnly,
    'app.isReadOnly': state.isReadOnly,
    'app.isAuthenticated': state.user !== null,
    'app.hasUnsavedChanges': state.isDirty,
  };

  // Handle negation
  if (clause.startsWith('!')) {
    return !context[clause.slice(1)] ?? false;
  }

  // Handle AND
  if (clause.includes('&&')) {
    return clause.split('&&').every(part => evaluateWhen(part.trim()));
  }

  // Handle OR
  if (clause.includes('||')) {
    return clause.split('||').some(part => evaluateWhen(part.trim()));
  }

  return context[clause] ?? false;
}
```

## Guidelines

1. **Keep clauses simple.** One or two conditions max. Complex logic belongs in the command handler, not the when-clause.

2. **Use positive names by default.** `app.dataLoaded` is clearer than `app.dataNotEmpty`.

3. **Namespace context keys** the same way as command IDs: `app.domain.condition`.

4. **Don't use when-clauses for authorization.** When-clauses control UI availability. Authorization checks belong in middleware or the command handler.

5. **When-clauses are evaluated frequently.** The palette re-evaluates on every render. Keep the evaluator fast — simple property lookups, no async operations.

6. **Document when-clauses.** Each new context key should be documented in a central reference.

## Anti-Patterns

- **When-clause as business logic**: `app.userHasPremiumPlanAndDataLoadedAndNotReadOnly` — too complex, split into separate checks.
- **Duplicate conditions**: If multiple commands share the same when-clause, consider if they belong to the same feature area.
- **Async when-clauses**: Never. The evaluator must be synchronous.
