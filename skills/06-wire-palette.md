# Skill 06: Wire Palette — Connect Commands to a Command Palette

## Goal

Wire the command registry to a command palette UI (cmdk or kbar) so users can press a keyboard shortcut and search/execute any registered command.

---

## Prerequisites

- Skill 03 (Scaffold) complete — registry exists
- Skill 04 (Wrap) complete — ≥5 commands registered
- `cmdk` or `kbar` installed as a dependency

## Output

A new React component and adapter module in `wrapex-output/commands/adapters/`.

---

## Steps

### Step 1: Install the Palette Library

```bash
# Option A: cmdk (recommended — used by Vercel, Linear, Raycast)
npm install cmdk

# Option B: kbar
npm install kbar
```

### Step 2: Create the Palette Adapter

Copy `templates/palette-adapter.ts` to `wrapex-output/commands/adapters/palette-adapter.ts`.

No modifications needed — it reads from the registry and produces entries for either library.

### Step 3: Create the Palette Component (cmdk)

Create `wrapex-output/commands/components/CommandPalette.tsx`:

```tsx
import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { createPaletteAdapter } from '../adapters/palette-adapter';
import { registry } from '../index';

// CONFIGURE: Import your app's styles or use these defaults
import './command-palette.css';

const adapter = createPaletteAdapter(registry);

export function CommandPalette() {
  const [open, setOpen] = useState(false);

  // CONFIGURE: Keyboard shortcut to open the palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const entries = adapter.getEntries();

  // Group entries by section (category)
  const sections = new Map<string, typeof entries>();
  for (const entry of entries) {
    const section = entry.section ?? 'Other';
    if (!sections.has(section)) sections.set(section, []);
    sections.get(section)!.push(entry);
  }

  return (
    <Command.Dialog open={open} onOpenChange={setOpen} label="Command Palette">
      <Command.Input placeholder="Type a command..." />
      <Command.List>
        <Command.Empty>No commands found.</Command.Empty>
        {Array.from(sections.entries()).map(([section, items]) => (
          <Command.Group key={section} heading={section}>
            {items.map((entry) => (
              <Command.Item
                key={entry.id}
                value={entry.keywords}
                onSelect={() => {
                  entry.perform();
                  setOpen(false);
                }}
              >
                <span>{entry.name}</span>
                {entry.shortcut && (
                  <kbd>{entry.shortcut.join('+')}</kbd>
                )}
              </Command.Item>
            ))}
          </Command.Group>
        ))}
      </Command.List>
    </Command.Dialog>
  );
}
```

### Step 4: Create Minimal Styles

Create `wrapex-output/commands/components/command-palette.css`:

```css
/* CONFIGURE: Adapt to your app's design system. */
[cmdk-dialog] {
  position: fixed;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 640px;
  max-height: 400px;
  background: var(--bg-primary, #1a1a2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 12px;
  overflow: hidden;
  z-index: 9999;
  box-shadow: 0 16px 70px rgba(0, 0, 0, 0.5);
}

[cmdk-input] {
  width: 100%;
  padding: 16px;
  font-size: 16px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--border-color, #333);
  color: var(--text-primary, #e0e0e0);
  outline: none;
}

[cmdk-list] {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

[cmdk-item] {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-primary, #e0e0e0);
}

[cmdk-item][data-selected='true'] {
  background: var(--bg-selected, #2a2a4a);
}

[cmdk-group-heading] {
  padding: 8px 12px 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-secondary, #888);
}

[cmdk-empty] {
  padding: 16px;
  text-align: center;
  color: var(--text-secondary, #888);
}

kbd {
  font-family: monospace;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--bg-secondary, #2a2a3a);
  border: 1px solid var(--border-color, #444);
  color: var(--text-secondary, #aaa);
}
```

### Step 5: Mount the Component

The user must add `<CommandPalette />` to their app's root layout. Example instruction:

> Add `<CommandPalette />` to your root layout component (e.g., `_app.tsx`, `layout.tsx`, or your main `App` component). The component renders nothing visible — it only shows when `Ctrl+K` / `Cmd+K` is pressed.

```tsx
import { CommandPalette } from '../wrapex-output/commands/components/CommandPalette';

export default function App({ children }) {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
```

**Note**: This is the one step that requires a minor addition to an existing file. If the user wants zero-touch, they can mount it via a separate entry point or browser extension.

---

## Validation Checklist

- [ ] Palette library is installed
- [ ] `CommandPalette` component renders without errors
- [ ] Pressing `Ctrl+K` / `Cmd+K` opens the palette
- [ ] All registered commands appear, grouped by category
- [ ] Selecting a command executes it via `registry.execute()`
- [ ] Keyboard shortcuts are displayed next to commands that have them
- [ ] Search filters commands by name, ID, and category
