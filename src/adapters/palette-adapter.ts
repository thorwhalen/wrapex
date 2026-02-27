/**
 * @wrapex/adapters - Command Palette Adapter
 *
 * Iterates the command registry and produces entries compatible with
 * cmdk, kbar, or any command palette library that accepts
 * { id, name, shortcut?, section?, perform } entries.
 *
 * Usage:
 *   import { createPaletteAdapter } from 'wrapex/adapters';
 *   const adapter = createPaletteAdapter(registry);
 *   const entries = adapter.getEntries();
 *   // Pass entries to cmdk <Command.List> or kbar useRegisterActions()
 */

import type { CommandRegistry } from '../command-registry.js';
import type { CommandDefinition, Keybinding } from '../define-command.js';

// ── Types ──────────────────────────────────────────────────────────────────

/** Shape compatible with cmdk and kbar. */
export interface PaletteEntry {
  id: string;
  name: string;
  shortcut?: string[];
  section?: string;
  subtitle?: string;
  keywords?: string;
  /** True if the command exists but is currently disabled (greyed out). */
  disabled?: boolean;
  perform: (actionImpl?: unknown) => void | Promise<void>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function keybindingToShortcutArray(kb: Keybinding): string[] {
  const parts: string[] = [];
  if (kb.ctrl) parts.push('Ctrl');
  if (kb.shift) parts.push('Shift');
  if (kb.alt) parts.push('Alt');
  if (kb.meta) parts.push('⌘');
  parts.push(kb.key.toUpperCase());
  return parts;
}

// ── Adapter ────────────────────────────────────────────────────────────────

export interface PaletteAdapter {
  /** All currently available commands as palette entries. */
  getEntries(): PaletteEntry[];
}

/**
 * Creates a palette adapter that reads from the registry.
 *
 * @param registry - The command registry.
 * @param options.source - The source string to inject into command context (default: 'palette').
 */
export function createPaletteAdapter(
  registry: CommandRegistry,
  options: { source?: string } = {},
): PaletteAdapter {
  const source = options.source ?? 'palette';

  return {
    getEntries() {
      return registry.listVisible().map((cmd) => ({
        id: cmd.id,
        name: cmd.label,
        shortcut: cmd.keybinding
          ? keybindingToShortcutArray(cmd.keybinding)
          : undefined,
        section: cmd.category,
        subtitle: cmd.description,
        keywords: [cmd.id, cmd.label, cmd.category, ...(cmd.tags ?? []), ...(cmd.keywords ?? [])]
          .join(' ')
          .toLowerCase(),
        disabled: cmd.isEnabled ? !cmd.isEnabled({ store: undefined, source }) : false,
        perform: async () => { await registry.execute(cmd.id, {}, { source, invocation: { surface: 'palette' as const }, store: undefined }); },
      }));
    },
  };
}
