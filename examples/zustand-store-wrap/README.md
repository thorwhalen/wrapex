# Example: Wrapping Zustand Store Actions

This example shows how to wrap Zustand store actions as commands without modifying the original store.

## Before: Original Zustand Store

```typescript
// src/store/cameraStore.ts (EXISTING — do not modify)
import { create } from 'zustand';

interface CameraState {
  zoomLevel: number;
  panX: number;
  panY: number;
  isAnimating: boolean;
}

interface CameraActions {
  setZoomLevel: (level: number) => void;
  fitView: (duration?: number) => void;
  pan: (dx: number, dy: number) => void;
  resetView: () => void;
}

export const useCameraStore = create<CameraState & CameraActions>((set, get) => ({
  zoomLevel: 1,
  panX: 0,
  panY: 0,
  isAnimating: false,

  setZoomLevel: (level) => set({ zoomLevel: Math.max(0.1, Math.min(10, level)) }),

  fitView: (duration = 500) => {
    set({ isAnimating: true });
    // ... animation logic ...
    setTimeout(() => set({ isAnimating: false, zoomLevel: 1, panX: 0, panY: 0 }), duration);
  },

  pan: (dx, dy) => set((state) => ({
    panX: state.panX + dx,
    panY: state.panY + dy,
  })),

  resetView: () => set({ zoomLevel: 1, panX: 0, panY: 0 }),
}));
```

## After: Command Wrappers (new files only)

### Parameterless command: fitView

```typescript
// wrapex-output/commands/definitions/camera/fitView.ts (NEW FILE)
import { z } from 'zod';
import { defineCommand } from '../../core/define-command';
import { useCameraStore } from '../../../../src/store/cameraStore';

const schema = z.object({
  duration: z.number().int().min(0).max(5000).default(500)
    .describe('Animation duration in milliseconds'),
});

export const fitViewCommand = defineCommand({
  id: 'app.camera.fitView',
  label: 'Fit View',
  category: 'Camera',
  description: 'Zoom and pan to fit all content in the viewport',
  schema,
  keybinding: { key: 'f', ctrl: true, shift: true },
  when: 'app.visualizationReady',

  execute: async (params) => {
    useCameraStore.getState().fitView(params.duration);
    return { success: true, message: 'View fitted.' };
  },
});
```

### Parameterized command: setZoomLevel

```typescript
// wrapex-output/commands/definitions/camera/setZoomLevel.ts (NEW FILE)
import { z } from 'zod';
import { defineCommand } from '../../core/define-command';
import { useCameraStore } from '../../../../src/store/cameraStore';

const schema = z.object({
  level: z.number().min(0.1).max(10)
    .describe('Zoom level (0.1 = fully zoomed out, 10 = max zoom)'),
});

export const setZoomLevelCommand = defineCommand({
  id: 'app.camera.setZoomLevel',
  label: 'Set Zoom Level',
  category: 'Camera',
  description: 'Set the viewport zoom to a specific level',
  schema,
  when: 'app.visualizationReady',

  execute: async (params) => {
    useCameraStore.getState().setZoomLevel(params.level);
    return { success: true, message: `Zoom set to ${params.level}x.` };
  },
});
```

### Simple command: resetView

```typescript
// wrapex-output/commands/definitions/camera/resetView.ts (NEW FILE)
import { defineCommand } from '../../core/define-command';
import { useCameraStore } from '../../../../src/store/cameraStore';

export const resetViewCommand = defineCommand({
  id: 'app.camera.resetView',
  label: 'Reset View',
  category: 'Camera',
  description: 'Reset zoom and pan to default',
  keybinding: { key: '0', ctrl: true },

  execute: async () => {
    useCameraStore.getState().resetView();
    return { success: true, message: 'View reset.' };
  },
});
```

## Key Points

1. **Import path**: The command imports the store from its original location. No copy-paste of logic.
2. **`getState()`**: Use `store.getState()` to access actions outside of React components.
3. **Schema**: Added for parameterized commands. Enables AI tools, MCP, and validation.
4. **No store changes**: The original `cameraStore.ts` is completely untouched.
5. **Gradual enrichment**: `resetView` starts without a schema — it can be added later when needed for AI/MCP.
