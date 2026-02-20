/**
 * @wrapex/core - defineCommand helper
 *
 * Creates a type-safe command definition with optional Zod parameter schema.
 * This is the primary authoring interface for command definitions.
 *
 * Usage:
 *   import { z } from 'zod';
 *   import { defineCommand } from 'wrapex';
 *
 *   export const myCommand = defineCommand({
 *     id: 'app.domain.myAction',
 *     label: 'My Action',
 *     category: 'Domain',
 *     execute: async (params, ctx) => { ... },
 *   });
 */

import type { ZodType } from 'zod';

// ── Types ──────────────────────────────────────────────────────────────────

/** Keybinding descriptor. Follows standard modifier + key convention. */
export interface Keybinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/** Result returned by every command handler. */
export interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

/** Execution context injected into every command handler. */
export interface CommandContext {
  /** Access to the app's state store (implementation-specific). */
  store: unknown;
  /** Source that triggered this command (e.g., 'palette', 'shortcut', 'ai', 'mcp', 'test'). */
  source: string;
  /** Arbitrary extra context the host app injects. */
  [key: string]: unknown;
}

/** Full command definition shape. `TSchema` is the Zod schema for params. */
export interface CommandDefinition<TSchema extends ZodType = ZodType> {
  /** Unique namespaced ID, e.g. 'app.data.applyFilter'. */
  id: string;
  /** Human-readable label for palette, menus, tooltips. */
  label: string;
  /** Category for grouping in palette / docs. */
  category: string;
  /** One-sentence description of what this command does. */
  description?: string;
  /** Zod schema for command parameters. Omit for parameterless commands. */
  schema?: TSchema;
  /** Optional keyboard shortcut. */
  keybinding?: Keybinding;
  /**
   * When-clause precondition. The command is available only when this
   * evaluates to true. String references a context key (e.g., 'app.dataLoaded').
   */
  when?: string;
  /** Whether to prompt the user for confirmation before executing. */
  requiresConfirmation?: boolean;
  /** Tags for filtering, feature-flag gating, or documentation. */
  tags?: string[];
  /** The command handler. Receives validated params and execution context. */
  execute: (
    params: TSchema extends ZodType<infer T> ? T : void,
    context: CommandContext,
  ) => Promise<CommandResult>;
}

// ── defineCommand ──────────────────────────────────────────────────────────

/**
 * Creates a frozen, type-safe command definition.
 * The returned object is the same shape you pass in — this helper exists for
 * type inference and to freeze the definition so it cannot be mutated at runtime.
 */
export function defineCommand<TSchema extends ZodType>(
  def: CommandDefinition<TSchema>,
): Readonly<CommandDefinition<TSchema>> {
  if (!def.id || !def.label || !def.category || !def.execute) {
    throw new Error(
      `[wrapex] Invalid command definition: id, label, category, and execute are required. Got id="${def.id}"`,
    );
  }
  return Object.freeze(def);
}
