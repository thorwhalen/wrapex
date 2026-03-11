/**
 * @wrapex/core - Command Registry
 *
 * A Zustand-backed command registry with register(), execute(),
 * middleware pipeline support, owner lifecycle, reactive subscriptions,
 * built-in validation, result normalization, and lifecycle callbacks.
 *
 * Usage:
 *   import { createRegistry } from 'wrapex';
 *
 *   const registry = createRegistry({
 *     onCommandInvokeSuccess: ({ commandId, durationMs }) =>
 *       console.log(`${commandId} completed in ${durationMs}ms`),
 *   });
 *   registry.register(myCommand);
 *   const result = await registry.execute('app.domain.myAction', { foo: 'bar' });
 *   console.log(result.commandId); // 'app.domain.myAction' (always stamped)
 */

import { createStore } from 'zustand/vanilla';
import type {
  CommandDefinition,
  CommandContext,
  CommandResult,
  CommandExecuteOutput,
  CommandInvocation,
  PolicyMetadata,
  Keybinding,
} from './define-command.js';

// ── Types ──────────────────────────────────────────────────────────────────

/** Middleware function signature. Call `next()` to continue the pipeline. */
export type CommandMiddleware = (
  command: CommandDefinition,
  params: unknown,
  context: CommandContext,
  next: () => Promise<CommandResult>,
) => Promise<CommandResult>;

/** When-clause evaluator. Returns true if the command should be available. */
export type WhenClauseEvaluator = (clause: string) => boolean;

/** Lifecycle event for command invocation start. */
export interface CommandInvokeStartEvent {
  commandId: string;
  params: unknown;
  context: CommandContext;
}

/** Lifecycle event for successful command invocation. */
export interface CommandInvokeSuccessEvent {
  commandId: string;
  result: CommandResult;
  durationMs: number;
}

/** Lifecycle event for failed command invocation (returned success: false). */
export interface CommandInvokeFailureEvent {
  commandId: string;
  result: CommandResult;
  durationMs: number;
}

/** Lifecycle event for command invocation that threw an error. */
export interface CommandInvokeErrorEvent {
  commandId: string;
  error: unknown;
  durationMs: number;
}

/** Registry configuration. */
export interface RegistryConfig {
  /** Middleware executed in order around every command. */
  middleware?: CommandMiddleware[];
  /** Evaluates when-clause strings against current app context. */
  evaluateWhen?: WhenClauseEvaluator;
  /** Injected into every command's execution context. */
  contextProvider?: () => Partial<CommandContext>;
  /** Lifecycle callback: fires before command execution. */
  onCommandInvokeStart?: (event: CommandInvokeStartEvent) => void;
  /** Lifecycle callback: fires after successful execution (result.success === true). */
  onCommandInvokeSuccess?: (event: CommandInvokeSuccessEvent) => void;
  /** Lifecycle callback: fires after failed execution (result.success === false). */
  onCommandInvokeFailure?: (event: CommandInvokeFailureEvent) => void;
  /** Lifecycle callback: fires when command handler throws an error. */
  onCommandInvokeError?: (event: CommandInvokeErrorEvent) => void;
}

/** Enriched command descriptor with pre-computed portable schema. */
export interface CommandDescriptor {
  id: string;
  label: string;
  category: string;
  description?: string;
  tags?: string[];
  metadata?: PolicyMetadata;
  keywords?: string[];
  keybinding?: Keybinding;
  when?: string;
  portableSchema?: Record<string, unknown>;
}

// ── Internal state shape ────────────────────────────────────────────────────

interface RegistryState {
  commands: Record<string, CommandDefinition>;
  owners: Record<string, string[]>;
}

// ── Registry interface ──────────────────────────────────────────────────────

export interface CommandRegistry {
  /** Register a command definition. Throws if the ID is already registered. */
  register(command: CommandDefinition): void;

  /** Register multiple commands at once. */
  registerAll(commands: CommandDefinition[]): void;

  /** Unregister a command by ID. Returns true if it existed. */
  unregister(id: string): boolean;

  /** Register commands owned by a specific owner. Idempotent: replaces previous registration. */
  registerForOwner(owner: string, commands: CommandDefinition[]): void;

  /** Unregister all commands previously registered by this owner. */
  unregisterForOwner(owner: string): void;

  /** Execute a command by ID with the given params. */
  execute(
    id: string,
    params?: unknown,
    contextOverrides?: Partial<CommandContext>,
  ): Promise<CommandResult>;

  /** Get a command definition by ID, or undefined. */
  get(id: string): CommandDefinition | undefined;

  /** Check if a command is currently available (when-clause passes). */
  isAvailable(id: string): boolean;

  /** List all registered commands. */
  list(): CommandDefinition[];

  /** List only currently available commands (when-clauses pass). */
  listAvailable(): CommandDefinition[];

  /** List commands that are both available and visible. */
  listVisible(context?: CommandContext): CommandDefinition[];

  /** List commands as enriched descriptors with portable schemas. */
  listDescriptors(toPortableSchema?: (schema: unknown) => Record<string, unknown>): CommandDescriptor[];

  /** Subscribe to registry changes. Returns unsubscribe function. */
  subscribe(listener: () => void): () => void;

  /** Get the underlying Zustand vanilla store (for useSyncExternalStore). */
  getStore(): unknown;

  /** Number of registered commands. */
  readonly size: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalizes whatever a command handler returns into a full CommandResult.
 * Handlers may return: void, raw data, or a CommandResult object.
 */
function normalizeResult(raw: CommandExecuteOutput, commandId: string): CommandResult {
  if (raw === undefined || raw === null) {
    return { success: true, commandId };
  }
  if (
    typeof raw === 'object' &&
    'success' in (raw as Record<string, unknown>)
  ) {
    const result = raw as CommandResult;
    return { ...result, commandId: result.commandId ?? commandId };
  }
  return { success: true, commandId, data: raw };
}

/**
 * Safely fires a lifecycle callback, catching any errors so the
 * callback never breaks command execution.
 */
function safeCallback<T>(fn: ((event: T) => void) | undefined, event: T): void {
  if (!fn) return;
  try {
    fn(event);
  } catch (err) {
    console.error('[wrapex] Lifecycle callback error:', err);
  }
}

// ── Factory ─────────────────────────────────────────────────────────────────

/** Create a new command registry instance backed by Zustand. */
export function createRegistry(config: RegistryConfig = {}): CommandRegistry {
  const middleware = config.middleware ?? [];
  const evaluateWhen = config.evaluateWhen ?? (() => true);
  const contextProvider = config.contextProvider ?? (() => ({}));

  const store = createStore<RegistryState>(() => ({
    commands: {},
    owners: {},
  }));

  function getCommands(): Record<string, CommandDefinition> {
    return store.getState().commands;
  }

  function buildContext(
    overrides?: Partial<CommandContext>,
  ): CommandContext {
    const base = contextProvider();
    const merged: CommandContext = {
      getState: () => undefined,
      store: undefined,
      source: 'unknown',
      ...base,
      ...overrides,
    };
    // Auto-populate getState from store if not explicitly provided.
    // This lets command handlers use `context.getState()` for typed state
    // access when the caller passes `{ store: someStoreApi }`.
    if (
      merged.getState === undefined ||
      (typeof merged.getState === 'function' && merged.getState() === undefined)
    ) {
      const storeRef = merged.store;
      if (storeRef && typeof storeRef === 'object' && 'getState' in storeRef) {
        const getStateFn = (storeRef as { getState: () => unknown }).getState;
        merged.getState = getStateFn;
      }
    }
    // Sync source <-> invocation.surface
    if (merged.invocation && merged.source === 'unknown') {
      merged.source = merged.invocation.surface;
    } else if (merged.source !== 'unknown' && !merged.invocation) {
      merged.invocation = { surface: merged.source as CommandInvocation['surface'] };
    }
    return merged;
  }

  function runMiddleware(
    command: CommandDefinition,
    params: unknown,
    context: CommandContext,
  ): Promise<CommandResult> {
    let index = 0;

    function next(): Promise<CommandResult> {
      if (index < middleware.length) {
        const mw = middleware[index++];
        return mw(command, params, context, next);
      }
      // Use validated/coerced params if the validation middleware ran,
      // otherwise fall back to the original params.
      const effectiveParams = context._validatedParams ?? params;
      const rawResult = command.execute(effectiveParams as any, context);
      // Normalize the handler result (supports void, raw data, or CommandResult)
      return Promise.resolve(rawResult).then(
        (raw) => normalizeResult(raw as CommandExecuteOutput, command.id),
      );
    }

    return next();
  }

  const defaultPortableSchema = () => ({ type: 'object' as const });

  return {
    register(command) {
      const { commands } = store.getState();
      if (commands[command.id]) {
        throw new Error(
          `[wrapex] Command "${command.id}" is already registered.`,
        );
      }
      store.setState({ commands: { ...commands, [command.id]: command } });
    },

    registerAll(cmds) {
      const { commands } = store.getState();
      const newCommands = { ...commands };
      for (const cmd of cmds) {
        if (newCommands[cmd.id]) {
          throw new Error(
            `[wrapex] Command "${cmd.id}" is already registered.`,
          );
        }
        newCommands[cmd.id] = cmd;
      }
      store.setState({ commands: newCommands });
    },

    unregister(id) {
      const { commands } = store.getState();
      if (!commands[id]) return false;
      const { [id]: _, ...rest } = commands;
      store.setState({ commands: rest });
      return true;
    },

    registerForOwner(owner, cmds) {
      const { commands, owners } = store.getState();
      const oldIds = owners[owner] ?? [];
      const cleaned = { ...commands };
      for (const id of oldIds) {
        delete cleaned[id];
      }
      for (const cmd of cmds) {
        cleaned[cmd.id] = cmd;
      }
      store.setState({
        commands: cleaned,
        owners: { ...owners, [owner]: cmds.map((c) => c.id) },
      });
    },

    unregisterForOwner(owner) {
      const { commands, owners } = store.getState();
      const ids = owners[owner] ?? [];
      if (ids.length === 0) return;
      const cleaned = { ...commands };
      for (const id of ids) {
        delete cleaned[id];
      }
      const { [owner]: _, ...restOwners } = owners;
      store.setState({ commands: cleaned, owners: restOwners });
    },

    async execute(id, params, contextOverrides) {
      const command = getCommands()[id];
      if (!command) {
        return { success: false, commandId: id, message: `Unknown command: "${id}"`, code: 'command-not-found' };
      }

      if (command.when && !evaluateWhen(command.when)) {
        return {
          success: false,
          commandId: id,
          message: `Command "${id}" is not available in the current context (when: "${command.when}").`,
          code: 'command-unavailable',
        };
      }

      const context = buildContext({
        source: 'unknown',
        ...contextOverrides,
      });

      if (command.isEnabled && !command.isEnabled(context)) {
        return {
          success: false,
          commandId: id,
          message: `Command "${id}" is currently disabled.`,
          code: 'command-disabled',
        };
      }

      // Built-in validation: validate params before middleware pipeline.
      let validatedParams: unknown = params ?? {};
      if (command.schema) {
        const parseResult = command.schema.safeParse(validatedParams);
        if (!parseResult.success) {
          return {
            success: false,
            commandId: id,
            message: `Invalid input: ${parseResult.error.issues.map((i: { message: string }) => i.message).join(', ')}`,
            code: 'validation-failed',
            error: parseResult.error.message,
          };
        }
        validatedParams = parseResult.data;
        // Signal to validation middleware that built-in validation already ran
        context._builtInValidationDone = true;
        context._validatedParams = validatedParams;
      }

      const startTime = performance.now();

      // Fire lifecycle start callback
      safeCallback(config.onCommandInvokeStart, { commandId: id, params: validatedParams, context });

      try {
        const result = await runMiddleware(command, validatedParams, context);
        const normalized = normalizeResult(result, id);
        const durationMs = performance.now() - startTime;

        // Fire success or failure callback
        if (normalized.success) {
          safeCallback(config.onCommandInvokeSuccess, { commandId: id, result: normalized, durationMs });
        } else {
          safeCallback(config.onCommandInvokeFailure, { commandId: id, result: normalized, durationMs });
        }

        return normalized;
      } catch (err) {
        const durationMs = performance.now() - startTime;
        const message = err instanceof Error ? err.message : String(err);

        // Fire error callback
        safeCallback(config.onCommandInvokeError, { commandId: id, error: err, durationMs });

        return { success: false, commandId: id, message: `Command "${id}" failed: ${message}`, code: 'command-error' };
      }
    },

    get(id) {
      return getCommands()[id];
    },

    isAvailable(id) {
      const cmd = getCommands()[id];
      if (!cmd) return false;
      if (!cmd.when) return true;
      return evaluateWhen(cmd.when);
    },

    list() {
      return Object.values(getCommands());
    },

    listAvailable() {
      return this.list().filter((cmd) =>
        !cmd.when || evaluateWhen(cmd.when),
      );
    },

    listVisible(context) {
      const ctx = context ?? buildContext();
      return this.listAvailable().filter((cmd) => {
        if (cmd.isVisible) return cmd.isVisible(ctx);
        return true;
      });
    },

    listDescriptors(toPortableSchema) {
      const convert = toPortableSchema ?? defaultPortableSchema;
      return this.list().map((cmd) => ({
        id: cmd.id,
        label: cmd.label,
        category: cmd.category,
        description: cmd.description,
        tags: cmd.tags,
        metadata: cmd.metadata,
        keywords: cmd.keywords,
        keybinding: cmd.keybinding,
        when: cmd.when,
        portableSchema: cmd.schema ? convert(cmd.schema) : undefined,
      }));
    },

    get size() {
      return Object.keys(getCommands()).length;
    },

    subscribe(listener) {
      return store.subscribe(listener);
    },

    getStore() {
      return store;
    },
  };
}
