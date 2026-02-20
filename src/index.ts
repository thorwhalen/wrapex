/**
 * wrapex — Command dispatch architecture toolkit for TypeScript/React.
 *
 * @packageDocumentation
 */

// Core
export { defineCommand } from './define-command.js';
export type {
  CommandDefinition,
  CommandContext,
  CommandResult,
  Keybinding,
} from './define-command.js';

export { createRegistry } from './command-registry.js';
export type {
  CommandRegistry,
  CommandMiddleware,
  WhenClauseEvaluator,
  RegistryConfig,
} from './command-registry.js';

// Middleware
export {
  validationMiddleware,
  loggingMiddleware,
  errorBoundaryMiddleware,
  createConfirmationMiddleware,
  createDefaultMiddleware,
} from './middleware-pipeline.js';

export { createValidationMiddleware } from './validation-middleware.js';
export type { ValidationConfig } from './validation-middleware.js';

export { createTelemetryMiddleware } from './telemetry-middleware.js';
export type { TelemetryConfig } from './telemetry-middleware.js';
