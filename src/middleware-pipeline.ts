/**
 * @wrapex/core - Middleware Pipeline
 *
 * Pre-built middleware functions for common cross-cutting concerns.
 * Each middleware follows the signature:
 *   (command, params, context, next) => Promise<CommandResult>
 *
 * Compose them by passing an array to createRegistry({ middleware: [...] }).
 * Order matters: first middleware in the array wraps outermost.
 */

import type {
  CommandDefinition,
  CommandContext,
  CommandResult,
} from './define-command.js';
import type { CommandMiddleware } from './command-registry.js';

// ── Validation Middleware ───────────────────────────────────────────────────

/**
 * Validates params against the command's Zod schema (if present).
 * Throws a ZodError if validation fails — catch it in an outer error-handling middleware.
 */
export const validationMiddleware: CommandMiddleware = async (
  command,
  params,
  context,
  next,
) => {
  if (command.schema) {
    command.schema.parse(params);
  }
  return next();
};

// ── Logging Middleware ──────────────────────────────────────────────────────

/**
 * Logs command execution to console. Useful during development.
 * Replace with a production logger as needed.
 */
export const loggingMiddleware: CommandMiddleware = async (
  command,
  params,
  context,
  next,
) => {
  const start = performance.now();
  console.log(`[wrapex] Executing: ${command.id}`, { params, source: context.source });
  const result = await next();
  const duration = (performance.now() - start).toFixed(1);
  console.log(`[wrapex] Completed: ${command.id} (${duration}ms)`, result);
  return result;
};

// ── Error Boundary Middleware ──────────────────────────────────────────────

/**
 * Catches errors from downstream middleware/handlers and returns a
 * { success: false } result instead of throwing. Place this outermost.
 */
export const errorBoundaryMiddleware: CommandMiddleware = async (
  command,
  params,
  context,
  next,
) => {
  try {
    return await next();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[wrapex] Error in "${command.id}":`, err);
    return { success: false, message };
  }
};

// ── Confirmation Middleware ────────────────────────────────────────────────

/**
 * Factory: creates a middleware that prompts for confirmation before executing
 * commands that have `requiresConfirmation: true`.
 *
 * @param confirmFn - async function that returns true if the user confirms.
 *   The host app provides this (e.g., a dialog, a CLI prompt, etc.).
 */
export function createConfirmationMiddleware(
  confirmFn: (command: CommandDefinition) => Promise<boolean>,
): CommandMiddleware {
  return async (command, params, context, next) => {
    if (command.requiresConfirmation) {
      const confirmed = await confirmFn(command);
      if (!confirmed) {
        return { success: false, message: 'Cancelled by user.' };
      }
    }
    return next();
  };
}

// ── Recommended Pipeline ───────────────────────────────────────────────────

/**
 * Returns a sensible default middleware stack.
 * Order: error boundary → logging → validation → (handler).
 */
export function createDefaultMiddleware(): CommandMiddleware[] {
  return [errorBoundaryMiddleware, loggingMiddleware, validationMiddleware];
}
