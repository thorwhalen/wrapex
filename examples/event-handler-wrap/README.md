# Example: Wrapping React Event Handlers

This example shows how to wrap React event handlers as commands. The key insight: you wrap the **underlying action**, not the event handler itself.

## Before: Original Component with Event Handlers

```tsx
// src/components/ProjectToolbar.tsx (EXISTING — do not modify)
import { useAppStore } from '../store/appStore';
import { trpcVanilla } from '../utils/trpc';

export function ProjectToolbar() {
  const projectId = useAppStore(s => s.projectId);
  const config = useAppStore(s => s.config);
  const isReadOnly = useAppStore(s => s.isReadOnly);

  const handleSave = async () => {
    if (!projectId || isReadOnly) return;
    try {
      await trpcVanilla.project.upsertProject.mutate({
        projectId,
        config: JSON.parse(JSON.stringify(config)),
      });
      toast.success('Project saved');
    } catch (err) {
      toast.error('Failed to save project');
      console.error(err);
    }
  };

  const handleExportPng = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${projectId ?? 'export'}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleDuplicate = async () => {
    if (!projectId) return;
    const newProject = await trpcVanilla.project.duplicateProject.mutate({
      projectId,
    });
    window.location.href = `/project/${newProject.id}`;
  };

  return (
    <div>
      <button onClick={handleSave} disabled={isReadOnly}>Save</button>
      <button onClick={handleExportPng}>Export PNG</button>
      <button onClick={handleDuplicate}>Duplicate</button>
    </div>
  );
}
```

## After: Command Wrappers (new files only)

### Wrapping an API-calling handler: saveProject

```typescript
// wrapex-output/commands/definitions/project/save.ts (NEW FILE)
import { defineCommand } from '../../core/define-command';
import { useAppStore } from '../../../../src/store/appStore';
import { trpcVanilla } from '../../../../src/utils/trpc';

export const saveCommand = defineCommand({
  id: 'app.project.save',
  label: 'Save Project',
  category: 'Project',
  description: 'Save the current project configuration to the server',
  keybinding: { key: 's', ctrl: true },
  when: 'app.isEditable && app.hasUnsavedChanges',
  requiresConfirmation: false,

  execute: async () => {
    const { projectId, config } = useAppStore.getState();
    if (!projectId) {
      return { success: false, message: 'No project loaded.' };
    }

    await trpcVanilla.project.upsertProject.mutate({
      projectId,
      config: JSON.parse(JSON.stringify(config)),
    });

    return { success: true, message: 'Project saved.' };
  },
});
```

### Wrapping a DOM-interacting handler: exportPng

```typescript
// wrapex-output/commands/definitions/export/toPng.ts (NEW FILE)
import { z } from 'zod';
import { defineCommand } from '../../core/define-command';
import { useAppStore } from '../../../../src/store/appStore';

const schema = z.object({
  filename: z.string().optional()
    .describe('Output filename (without extension). Defaults to the project ID.'),
});

export const exportToPngCommand = defineCommand({
  id: 'app.export.toPng',
  label: 'Export as PNG',
  category: 'Export',
  description: 'Export the current visualization as a PNG image',
  schema,
  when: 'app.visualizationReady',

  execute: async (params) => {
    const canvas = document.querySelector('canvas');
    if (!canvas) {
      return { success: false, message: 'No canvas element found.' };
    }

    const projectId = useAppStore.getState().projectId;
    const filename = params.filename ?? projectId ?? 'export';

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    return { success: true, message: `Exported as ${filename}.png.` };
  },
});
```

### Wrapping a navigation handler: duplicateProject

```typescript
// wrapex-output/commands/definitions/project/duplicate.ts (NEW FILE)
import { defineCommand } from '../../core/define-command';
import { useAppStore } from '../../../../src/store/appStore';
import { trpcVanilla } from '../../../../src/utils/trpc';

export const duplicateProjectCommand = defineCommand({
  id: 'app.project.duplicate',
  label: 'Duplicate Project',
  category: 'Project',
  description: 'Create a copy of the current project',
  requiresConfirmation: true, // Navigates away — confirm first
  when: 'app.isAuthenticated',

  execute: async () => {
    const { projectId } = useAppStore.getState();
    if (!projectId) {
      return { success: false, message: 'No project loaded.' };
    }

    const newProject = await trpcVanilla.project.duplicateProject.mutate({
      projectId,
    });

    // Note: Navigation is a side effect. The command handler can do it,
    // but a cleaner pattern is to return the new ID and let the caller navigate.
    return {
      success: true,
      message: `Project duplicated.`,
      data: { newProjectId: newProject.id },
    };
  },
});
```

## Key Points

1. **Wrap the action, not the handler.** The `onClick` handler is a thin wrapper — extract the underlying operation (API call, DOM manipulation, navigation) into the command.

2. **Handle UI concerns separately.** Toast notifications, navigation, and DOM focus management are UI-layer concerns. The command returns a result; the UI layer (or middleware) decides how to display it.

3. **Use `requiresConfirmation` for destructive or navigating commands.** The confirmation middleware handles the UX.

4. **State access via `getState()`**: Since commands run outside React's render cycle, use `store.getState()` instead of hooks.

5. **Return data when useful.** The duplicate command returns `{ data: { newProjectId } }` so the caller can decide what to do with it.
