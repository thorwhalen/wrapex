# Example: Wrapping API / Fetch Calls

This example shows how to wrap API calls (tRPC, REST, GraphQL) as commands.

## Before: Original tRPC Router and Client Usage

```typescript
// src/server/routers/project.ts (EXISTING — do not modify)
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const projectRouter = router({
  getProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      // ... fetch project from database
    }),

  upsertProject: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid().nullable(),
      config: PersistedConfig,
    }))
    .mutation(async ({ input, ctx }) => {
      // ... save project to database
    }),

  deleteProject: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // ... delete project from database
    }),
});
```

```typescript
// src/utils/trpc.ts (EXISTING — do not modify)
export const trpcVanilla = createTRPCProxyClient<AppRouter>(clientParams);
```

## After: Command Wrappers (new files only)

### Wrapping a tRPC mutation

```typescript
// wrapex-output/commands/definitions/project/delete.ts (NEW FILE)
import { z } from 'zod';
import { defineCommand } from '../../core/define-command';
import { trpcVanilla } from '../../../../src/utils/trpc';

const schema = z.object({
  projectId: z.string().uuid().describe('The ID of the project to delete'),
});

export const deleteProjectCommand = defineCommand({
  id: 'app.project.delete',
  label: 'Delete Project',
  category: 'Project',
  description: 'Permanently delete a project',
  schema,
  requiresConfirmation: true,
  tags: ['dangerous'],
  when: 'app.isAuthenticated && app.isEditable',

  execute: async (params) => {
    await trpcVanilla.project.deleteProject.mutate({
      projectId: params.projectId,
    });
    return { success: true, message: `Project ${params.projectId} deleted.` };
  },
});
```

### Wrapping a REST/fetch call

```typescript
// wrapex-output/commands/definitions/data/importCsv.ts (NEW FILE)
import { z } from 'zod';
import { defineCommand } from '../../core/define-command';

const schema = z.object({
  url: z.string().url().describe('URL of the CSV file to import'),
  delimiter: z.enum([',', ';', '\t', '|']).default(',')
    .describe('Column delimiter character'),
});

export const importCsvCommand = defineCommand({
  id: 'app.data.importCsv',
  label: 'Import CSV from URL',
  category: 'Data',
  description: 'Fetch and import a CSV file from a URL',
  schema,
  when: 'app.isEditable',

  execute: async (params) => {
    const response = await fetch(params.url);
    if (!response.ok) {
      return { success: false, message: `HTTP ${response.status}: ${response.statusText}` };
    }

    const text = await response.text();
    const rows = text.split('\n').length - 1;

    // Delegate to existing data loading logic
    // store.getState().loadCsvData(text, params.delimiter);

    return {
      success: true,
      message: `Imported ${rows} rows from ${params.url}.`,
      data: { rowCount: rows },
    };
  },
});
```

### Reusing tRPC input schemas

When the tRPC router already defines Zod input schemas, you can reference them directly:

```typescript
// wrapex-output/commands/definitions/project/load.ts (NEW FILE)
import { z } from 'zod';
import { defineCommand } from '../../core/define-command';
import { trpcVanilla } from '../../../../src/utils/trpc';

// Reuse the same schema the tRPC endpoint uses
const schema = z.object({
  projectId: z.string().uuid().describe('Project ID to load'),
});

export const loadProjectCommand = defineCommand({
  id: 'app.project.load',
  label: 'Load Project',
  category: 'Project',
  description: 'Load a project from the server by ID',
  schema,

  execute: async (params) => {
    const project = await trpcVanilla.project.getProject.query({
      projectId: params.projectId,
    });
    return {
      success: true,
      message: `Loaded project "${params.projectId}".`,
      data: project,
    };
  },
});
```

## Key Points

1. **Reuse existing Zod schemas** when the API already defines them. Don't duplicate.
2. **Use `requiresConfirmation: true`** for destructive API calls (delete, overwrite).
3. **Tag dangerous commands** with `['dangerous']` for visibility in audits.
4. **Return data** from queries so callers can use it programmatically.
5. **Error handling**: The error boundary middleware catches thrown errors. For expected errors (HTTP 404), return `{ success: false }` with a descriptive message.
6. **API calls are inherently async** — all command handlers return `Promise<CommandResult>`, so this is natural.
