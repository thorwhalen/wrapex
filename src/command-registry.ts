/**
 * @wrapex/core - Command Registry
 *
 * A centralized Map<string, CommandDefinition> with register(), execute(),
 * and middleware pipeline support. This is the runtime core of the toolkit.
 *
 * Usage:
 *   import { createRegistry } from 'wrapex';
 *
 *   const registry = createRegistry();
 *   registry.register(myCommand);
 *   await registry.execute('app.domain.myAction', { foo: 'bar' }, { source: 'palette' });
 */

import type {
  CommandDefinition,
  CommandContext,
  CommandResult,
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

// ── Registry ───────────────────────────────────────────────────────────────

export interface CommandRegistry {
  /** Register a command definition. Throws if the ID is already registered. */
  register(command: CommandDefinition): void;

  /** Register multiple commands at once. */
  registerAll(commands: CommandDefinition[]): void;

  /** Unregister a command by ID. Returns true if it existed. */
  unregister(id: string): boolean;

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

  /** Number of registered commands. */
  readonly size: number;
}

/** Create a new command registry instance. */
export function createRegistry(config: RegistryConfig = {}): CommandRegistry {
  const commands = new Map<string, CommandDefinition>();
  const middleware = config.middleware ?? [];
  const evaluateWhen = config.evaluateWhen ?? (() => true);
  const contextProvider = config.contextProvider ?? (() => ({}));

  function buildContext(
    overrides?: Partial<CommandContext>,
  ): CommandContext {
    return {
      store: undefined,
      source: 'unknown',
      ...contextProvider(),
      ...overrides,
    };
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
      // End of middleware chain — execute the command handler.
      return command.execute(params as any, context);
    }

    return next();
  }

  return {
    register(command) {
      if (commands.has(command.id)) {
        throw new Error(
          `[wrapex] Command "${command.id}" is already registered.`,
        );
      }
      commands.set(command.id, command);
    },

    registerAll(cmds) {
      for (const cmd of cmds) {
        this.register(cmd);
      }
    },

    unregister(id) {
      return commands.delete(id);
    },

    async execute(id, params, contextOverrides) {
      const command = commands.get(id);
      if (!command) {
        return { success: false, message: `Unknown command: "${id}"` };
      }

      // Check when-clause
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

      try {
        return await runMiddleware(command, params ?? {}, context);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : String(err);
        return { success: false, message: `Command "${id}" failed: ${message}` };
      }
    },

    get(id) {
      return commands.get(id);
    },

    isAvailable(id) {
      const cmd = commands.get(id);
      if (!cmd) return false;
      if (!cmd.when) return true;
      return evaluateWhen(cmd.when);
    },

    list() {
      return Array.from(commands.values());
    },

    listAvailable() {
      return this.list().filter((cmd) =>
        !cmd.when || evaluateWhen(cmd.when),
      );
    },

    get size() {
      return commands.size;
    },
  };
}
