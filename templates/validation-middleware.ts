/**
 * @wrapex/core - Validation Middleware
 *
 * Validates command parameters against the command's Zod schema.
 * Returns a structured error result on validation failure instead of throwing.
 *
 * Usage:
 *   import { createValidationMiddleware } from './validation-middleware';
 *   const validation = createValidationMiddleware();
 *   const registry = createRegistry({ middleware: [..., validation] });
 */

import { ZodError } from 'zod';
import type { CommandMiddleware } from './command-registry';

export interface ValidationConfig {
  /**
   * If true, validation errors are returned as { success: false } results.
   * If false (default), ZodErrors are thrown for upstream middleware to handle.
   */
  catchErrors?: boolean;
}

/**
 * Creates a validation middleware. By default, throws ZodError on failure.
 * Set catchErrors: true to return a structured error result instead.
 */
export function createValidationMiddleware(
  config: ValidationConfig = {},
): CommandMiddleware {
  const { catchErrors = false } = config;

  return async (command, params, context, next) => {
    if (!command.schema) {
      return next();
    }

    if (catchErrors) {
      const result = command.schema.safeParse(params);
      if (!result.success) {
        const issues = result.error.issues
          .map((i) => `${i.path.join('.')}: ${i.message}`)
          .join('; ');
        return {
          success: false,
          message: `Validation failed for "${command.id}": ${issues}`,
        };
      }
      // Replace params with parsed (coerced/defaulted) values
      return next();
    }

    // Throws ZodError on failure
    command.schema.parse(params);
    return next();
  };
}
