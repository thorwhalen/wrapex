/**
 * @wrapex/core - Command Registry
 *
 * A Zustand-backed command registry with register(), execute(),
 * middleware pipeline support, owner lifecycle, and reactive subscriptions.
 *
 * Usage:
 *   import { createRegistry } from 'wrapex';
 *
 *   const registry = createRegistry();
 *   registry.register(myCommand);
 *   await registry.execute('app.domain.myAction', { foo: 'bar' }, { source: 'palette' });
 *
 *   // Subscribe to changes:
 *   const unsub = registry.subscribe(() => { console.log('commands changed') });
 */

import { createStore } from 'zustand/vanilla';
import type {
  CommandDefinition,
  CommandContext,
  CommandResult,
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

/** Registry configuration. */
export interface RegistryConfig {
  /** Middleware executed in order around every command. */
  middleware?: CommandMiddleware[];
  /** Evaluates when-clause strings against current app context. */
  evaluateWhen?: WhenClauseEvaluator;
  /** Injected into every command's execution context. */
  contextProvider?: () => Partial<CommandContext>;
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
    const merged: CommandContext = {
      store: undefined,
      source: 'unknown',
      ...contextProvider(),
      ...overrides,
    };
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
      return command.execute(params as any, context);
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
        return { success: false, message: `Unknown command: "${id}"` };
      }

      if (command.when && !evaluateWhen(command.when)) {
        return {
          success: false,
          message: `Command "${id}" is not available in the current context (when: "${command.when}").`,
        };
      }

      const context = buildContext({
        source: 'unknown',
        ...contextOverrides,
      });

      if (command.isEnabled && !command.isEnabled(context)) {
        return {
          success: false,
          message: `Command "${id}" is currently disabled.`,
        };
      }

      try {
        return await runMiddleware(command, params ?? {}, context);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        return { success: false, message: `Command "${id}" failed: ${message}` };
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
