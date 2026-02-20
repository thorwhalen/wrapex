# Skill 04: Wrap — Create Command Wrappers Without Touching Existing Code

## Goal

For each command candidate in the refactoring plan (starting with Phase 1), create a new command definition file that **wraps** the existing function/action. The existing code is not modified — the command wrapper is an additional entry point.

---

## Inputs

- `wrapex-output/refactoring-plan.json` (from Skill 02)
- `wrapex-output/diagnosis-report.json` (from Skill 01)
- The scaffolded registry at `wrapex-output/commands/` (from Skill 03)
- The existing codebase (read-only)

## Output

Command definition files in `wrapex-output/commands/definitions/`, one per command.

---

## Steps

### Step 1: Select Candidates for This Batch

Read the refactoring plan. Start with Phase 1 items, ordered by the plan's `order` field. Process one command at a time.

### Step 2: Read the Original Implementation

For each candidate, read the file at `currentLocation` (from the diagnosis report). Understand:
- What the function/action does
- What parameters it accepts
- What store it belongs to (if any)
- Whether it's async
- What side effects it has

### Step 3: Create the Command Definition File

Use the `command-definition.ts.template` as a starting point. Create a new file at:

```
wrapex-output/commands/definitions/{category}/{commandVarName}.ts
```

Where:
- `{category}` is the lowercase category (e.g., `camera`, `data`, `ui`)
- `{commandVarName}` is the camelCase action name (e.g., `zoomToFit`)

**Fill in the template** by following the wrapping pattern for the candidate's implementation type:

---

### Wrapping Pattern: Zustand Action

**When**: The candidate is a method on a Zustand store.

```typescript
import { defineCommand } from '../../core/define-command';
// Import the store hook to access getState()
import { useAppStore } from '../../../../path/to/store';

export const zoomToFitCommand = defineCommand({
  id: 'app.camera.zoomToFit',
  label: 'Zoom to Fit',
  category: 'Camera',
  description: 'Fit the viewport to show all visible content',

  // No schema needed for parameterless commands.
  // Add schema in Skill 05 (Enrich) if params exist.

  execute: async (_params, _context) => {
    // Delegate to existing Zustand action — zero changes to original code
    useAppStore.getState().fitView();
    return { success: true, message: 'Zoomed to fit.' };
  },
});
```

**For Zustand actions with parameters**:

```typescript
import { z } from 'zod';
import { defineCommand } from '../../core/define-command';
import { useAppStore } from '../../../../path/to/store';

const schema = z.object({
  column: z.string().describe('Column name to filter on'),
  operator: z.enum(['=', '!=', '>', '<']),
  value: z.union([z.string(), z.number()]),
});

export const applyFilterCommand = defineCommand({
  id: 'app.data.applyFilter',
  label: 'Apply Filter',
  category: 'Data',
  description: 'Filter the dataset by a column condition',
  schema,

  execute: async (params, _context) => {
    useAppStore.getState().applyFilter(params);
    return { success: true, message: `Filtered on ${params.column}.` };
  },
});
```

---

### Wrapping Pattern: Event Handler

**When**: The candidate is a React event handler.

Event handlers typically call store actions or API methods. The command wraps the **underlying action**, not the event handler itself.

```typescript
import { defineCommand } from '../../core/define-command';
import { useAppStore } from '../../../../path/to/store';

export const signOutCommand = defineCommand({
  id: 'app.auth.signOut',
  label: 'Sign Out',
  category: 'Auth',
  description: 'Sign out the current user',

  execute: async (_params, _context) => {
    // The original onClick handler did:
    //   await supabaseClient.auth.signOut()
    //   router.push('/signin')
    // We wrap the auth part. Navigation is UI-specific.
    const { supabaseClient } = await import('../../../../path/to/supabase');
    await supabaseClient.auth.signOut();
    return { success: true, message: 'Signed out.' };
  },
});
```

---

### Wrapping Pattern: API Call (tRPC)

**When**: The candidate is a tRPC mutation or query.

```typescript
import { z } from 'zod';
import { defineCommand } from '../../core/define-command';
import { trpcVanilla } from '../../../../path/to/trpc';

const schema = z.object({
  projectId: z.string().uuid(),
});

export const loadProjectCommand = defineCommand({
  id: 'app.project.load',
  label: 'Load Project',
  category: 'Project',
  description: 'Load a project by ID from the server',
  schema,

  execute: async (params, _context) => {
    const project = await trpcVanilla.project.getProject.query({
      projectId: params.projectId,
    });
    return { success: true, message: `Loaded project ${params.projectId}.`, data: project };
  },
});
```

---

### Wrapping Pattern: Redux Action

**When**: The candidate is a Redux action creator or thunk.

```typescript
import { defineCommand } from '../../core/define-command';
// Import the store and action creator
import { store } from '../../../../path/to/store';
import { applyFilter } from '../../../../path/to/slices/dataSlice';

export const applyFilterCommand = defineCommand({
  id: 'app.data.applyFilter',
  label: 'Apply Filter',
  category: 'Data',
  description: 'Apply a data filter',

  execute: async (params, _context) => {
    store.dispatch(applyFilter(params));
    return { success: true, message: 'Filter applied.' };
  },
});
```

---

### Step 4: Register the Command

After creating the definition file, add it to the registry. Create or update `wrapex-output/commands/definitions/index.ts`:

```typescript
// Auto-generated — registers all command definitions with the registry.
import { registry } from '../index';

// Camera commands
import { zoomToFitCommand } from './camera/zoomToFit';
import { zoomInCommand } from './camera/zoomIn';

// Data commands
import { applyFilterCommand } from './data/applyFilter';

// Register all
registry.registerAll([
  zoomToFitCommand,
  zoomInCommand,
  applyFilterCommand,
  // Add more as they're created
]);

export { registry };
```

### Step 5: Verify the Command Works

For each wrapped command:

1. Import the registry with the new command registered.
2. Call `registry.execute('the.command.id', params, { source: 'test', store: undefined })`.
3. Verify it returns `{ success: true }`.

If the command depends on app state (store), you may need to mock or initialize the store first.

---

## Iteration

Repeat Steps 2-5 for each candidate in the current phase. After finishing Phase 1:

- Run Skill 06 (palette) or Skill 07 (shortcuts) to immediately deliver user value.
- Run Skill 05 (enrich) to add Zod schemas to commands that need them.
- Then proceed to Phase 2 candidates.

---

## Validation Checklist

- [ ] Each command file is in `wrapex-output/commands/definitions/{category}/`
- [ ] Each command uses `defineCommand()` from the core
- [ ] Each command delegates to the original code via import (not copy)
- [ ] No existing source files were modified
- [ ] The definitions index registers all commands
- [ ] Commands can be executed via `registry.execute()` without errors
