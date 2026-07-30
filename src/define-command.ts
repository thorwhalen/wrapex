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
 *     metadata: { readOnly: false, idempotent: true, riskLevel: 'low' },
 *     keywords: ['action', 'domain'],
 *     execute: async (params, ctx) => { ... },
 *   });
 */

import type { ZodType } from 'zod';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Minimal store interface for command handlers.
 * Structurally compatible with Zustand's StoreApi but does not import it,
 * keeping command definitions framework-agnostic.
 */
export interface CommandStoreApi<S> {
  getState(): S;
}

/** Keybinding descriptor. Follows standard modifier + key convention. */
export interface Keybinding {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

/**
 * Result returned by every command handler.
 *
 * The `commandId` and `code` fields are stamped by the registry for
 * traceability. Handlers may return a bare `CommandResult` without them —
 * the registry will fill them in.
 */
export interface CommandResult<TData = unknown> {
  success: boolean;
  /** Registry stamps this with the command's ID. */
  commandId?: string;
  message?: string;
  /** Machine-readable error/status code for programmatic consumers. */
  code?: string;
  data?: TData;
  /** Separate error detail (stack trace, validation error, etc.). */
  error?: string;
}

/**
 * What a command handler may return. The registry normalizes all forms:
 * - `void` / `undefined` → `{ success: true }`
 * - Raw data (any non-result object) → `{ success: true, data: <value> }`
 * - A `CommandResult` object → used as-is (with `commandId` stamped).
 */
export type CommandExecuteOutput<TData = unknown> =
  | CommandResult<TData>
  | TData
  | void;

/** Policy metadata for risk assessment, MCP annotations, and AI reasoning. */
export interface PolicyMetadata {
  /** True if this command only reads state (no mutations). */
  readOnly?: boolean;
  /** True if calling this command multiple times with the same input has the same effect. */
  idempotent?: boolean;
  /** Risk level for confirmation prompts and AI safety. */
  riskLevel?: 'low' | 'medium' | 'high';
  /** Whether to prompt the user for confirmation before executing. */
  requiresConfirmation?: boolean;
}

/** Structured invocation context for telemetry and tracing. */
export interface CommandInvocation {
  /** Which surface triggered this command. */
  surface: 'palette' | 'shortcut' | 'ai' | 'mcp' | 'test' | 'api' | 'unknown';
  /** Who triggered it (user ID, AI model name, etc.). */
  actor?: string;
  /** Correlation ID for distributed tracing. */
  traceId?: string;
  /** Extensible metadata for the invocation. */
  metadata?: Record<string, unknown>;
}

/** Execution context injected into every command handler. */
export interface CommandContext<S = unknown> {
  /**
   * Typed state accessor. Preferred way for commands to read state.
   * The registry auto-populates this from `store.getState` if the
   * store has a `getState` method.
   */
  getState: () => S;
  /**
   * Access to the app's state store (implementation-specific).
   * @deprecated Prefer `getState()` for typed state access.
   * Kept for backward compatibility and for the registry to
   * auto-populate `getState`.
   */
  store?: CommandStoreApi<S> | unknown;
  /**
   * Source that triggered this command.
   * @deprecated Use invocation.surface instead. Kept for backwards compatibility.
   */
  source: string;
  /** Structured invocation context for telemetry and tracing. */
  invocation?: CommandInvocation;
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
  /**
   * Whether to prompt the user for confirmation before executing.
   * Shorthand for metadata.requiresConfirmation. If both are set, metadata wins.
   */
  requiresConfirmation?: boolean;
  /** Tags for filtering, feature-flag gating, or documentation. */
  tags?: string[];
  /** Policy metadata for risk assessment, MCP annotations, and AI reasoning. */
  metadata?: PolicyMetadata;
  /**
   * Imperative visibility check. If provided, overrides `when` for visibility purposes.
   * Return false to hide the command from palettes and listings.
   */
  isVisible?: (context: CommandContext) => boolean;
  /**
   * Imperative enablement check. If false, the command is shown but greyed out / non-executable.
   * Separate from isVisible: a disabled command is visible but not clickable.
   */
  isEnabled?: (context: CommandContext) => boolean;
  /**
   * Custom React component for parameter input in the command palette.
   * If provided, the palette renders this instead of auto-generating a form from the schema.
   * Typed as `unknown` here (no React dependency in toolkit); the app narrows the type.
   */
  inputComponent?: unknown;
  /** Additional search keywords for palette matching. */
  keywords?: string[];
  /**
   * The command handler. Receives validated params and execution context.
   *
   * May return:
   * - `void` (treated as `{ success: true }`)
   * - Raw data (wrapped as `{ success: true, data: <value> }`)
   * - A full `CommandResult` object
   *
   * The registry normalizes all forms and stamps `commandId`.
   */
  execute: (
    params: TSchema extends ZodType<infer T> ? T : void,
    context: CommandContext,
  ) => Promise<CommandExecuteOutput> | CommandExecuteOutput;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Resolve the effective policy metadata for a command, merging the requiresConfirmation shorthand. */
export function resolveMetadata(def: CommandDefinition): PolicyMetadata {
  return {
    readOnly: def.metadata?.readOnly ?? false,
    idempotent: def.metadata?.idempotent ?? false,
    riskLevel: def.metadata?.riskLevel ?? 'medium',
    requiresConfirmation:
      def.metadata?.requiresConfirmation ?? def.requiresConfirmation ?? false,
  };
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
