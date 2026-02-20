# Skill 07: Wire Shortcuts — Connect Commands to Keyboard Shortcuts

## Goal

Bind keyboard shortcuts defined in command metadata to the command registry using `tinykeys` (or a similar library). When a user presses a shortcut, the corresponding command executes through the full middleware pipeline.

---

## Prerequisites

- Skill 03 (Scaffold) — registry exists
- Skill 04 (Wrap) — commands with `keybinding` metadata exist
- `tinykeys` installed

## Output

A shortcut binding module in `wrapex-output/commands/adapters/`.

---

## Steps

### Step 1: Install tinykeys

```bash
npm install tinykeys
```

### Step 2: Create the Shortcut Adapter

Create `wrapex-output/commands/adapters/shortcut-adapter.ts`:

```typescript
import tinykeys from 'tinykeys';
import type { CommandRegistry } from '../core/command-registry';
import type { Keybinding } from '../core/define-command';

/**
 * Converts a Keybinding object to a tinykeys shortcut string.
 * Examples: { key: 'f', ctrl: true, shift: true } → '$mod+Shift+f'
 * Uses $mod for Ctrl (Windows/Linux) / Cmd (Mac).
 */
function keybindingToTinykeysString(kb: Keybinding): string {
  const parts: string[] = [];
  if (kb.ctrl || kb.meta) parts.push('$mod');
  if (kb.shift) parts.push('Shift');
  if (kb.alt) parts.push('Alt');
  parts.push(kb.key);
  return parts.join('+');
}

/**
 * Binds all commands with keybindings to keyboard shortcuts.
 *
 * @param registry - The command registry.
 * @param target - The DOM element to bind shortcuts to (default: window).
 * @returns An unsubscribe function that removes all bindings.
 */
export function bindShortcuts(
  registry: CommandRegistry,
  target: Window | HTMLElement = window,
): () => void {
  const bindings: Record<string, (event: KeyboardEvent) => void> = {};

  for (const command of registry.list()) {
    if (!command.keybinding) continue;

    const shortcutStr = keybindingToTinykeysString(command.keybinding);

    bindings[shortcutStr] = (event) => {
      // Only execute if the command is currently available
      if (!registry.isAvailable(command.id)) return;

      event.preventDefault();
      registry.execute(command.id, {}, { source: 'shortcut', store: undefined });
    };
  }

  return tinykeys(target, bindings);
}
```

### Step 3: Initialize Shortcuts

Add shortcut initialization to the app's startup. Create or update a setup module:

```typescript
// wrapex-output/commands/setup.ts
import { registry } from './index';
import { bindShortcuts } from './adapters/shortcut-adapter';

let unbindShortcuts: (() => void) | null = null;

export function initCommandShortcuts() {
  // Clean up previous bindings (for HMR)
  unbindShortcuts?.();
  unbindShortcuts = bindShortcuts(registry);
}

export function destroyCommandShortcuts() {
  unbindShortcuts?.();
  unbindShortcuts = null;
}
```

### Step 4: Wire into the App

The user calls `initCommandShortcuts()` during app initialization:

```typescript
// In your app's entry point or root component:
import { initCommandShortcuts } from '../wrapex-output/commands/setup';

// Call once on startup
initCommandShortcuts();
```

Or in a React component:

```tsx
import { useEffect } from 'react';
import { initCommandShortcuts, destroyCommandShortcuts } from '../wrapex-output/commands/setup';

function App() {
  useEffect(() => {
    initCommandShortcuts();
    return destroyCommandShortcuts;
  }, []);

  return <>{/* app content */}</>;
}
```

---

## Validation Checklist

- [ ] `tinykeys` is installed
- [ ] Commands with `keybinding` metadata get keyboard shortcuts
- [ ] Shortcuts go through the full middleware pipeline (telemetry, validation, etc.)
- [ ] When-clause is checked before execution
- [ ] Shortcuts can be cleaned up (for HMR or unmount)
- [ ] No conflicts with browser or OS default shortcuts
