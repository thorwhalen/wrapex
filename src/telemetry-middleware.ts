/**
 * @wrapex/core - Telemetry Middleware
 *
 * Middleware for Sentry breadcrumbs and generic analytics event capture.
 * Adapt the CONFIGURE sections to your Sentry and analytics setup.
 *
 * Usage:
 *   import { createTelemetryMiddleware } from 'wrapex';
 *
 *   const telemetry = createTelemetryMiddleware({
 *     addBreadcrumb: (data) => Sentry.addBreadcrumb(data),
 *     captureEvent: (name, props) => posthog.capture(name, props),
 *   });
 *
 *   const registry = createRegistry({ middleware: [telemetry, ...] });
 */

import type { CommandMiddleware } from './command-registry.js';

// ── Configuration ──────────────────────────────────────────────────────────

export interface TelemetryConfig {
  /**
   * CONFIGURE: Sentry breadcrumb integration.
   * Called before command execution.
   * Example: (data) => Sentry.addBreadcrumb(data)
   */
  addBreadcrumb?: (data: {
    category: string;
    message: string;
    data?: Record<string, unknown>;
    level?: 'info' | 'warning' | 'error';
  }) => void;

  /**
   * CONFIGURE: Analytics event capture.
   * Called after successful command execution.
   * Example: (name, props) => posthog.capture(name, props)
   */
  captureEvent?: (
    eventName: string,
    properties: Record<string, unknown>,
  ) => void;

  /**
   * CONFIGURE: Error reporting integration.
   * Called when a command fails.
   * Example: (err, ctx) => Sentry.captureException(err, { extra: ctx })
   */
  captureError?: (
    error: unknown,
    context: Record<string, unknown>,
  ) => void;
}

// ── Middleware Factory ──────────────────────────────────────────────────────

export function createTelemetryMiddleware(
  config: TelemetryConfig,
): CommandMiddleware {
  return async (command, params, context, next) => {
    // Breadcrumb before execution
    config.addBreadcrumb?.({
      category: 'command',
      message: command.id,
      data: {
        params: params as Record<string, unknown>,
        source: context.source,
      },
      level: 'info',
    });

    const start = performance.now();

    try {
      const result = await next();
      const durationMs = Math.round(performance.now() - start);

      // Analytics event after success
      config.captureEvent?.('command_executed', {
        command_id: command.id,
        command_category: command.category,
        source: context.source,
        success: result.success,
        duration_ms: durationMs,
      });

      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);

      // Error reporting
      config.captureError?.(err, {
        command_id: command.id,
        command_category: command.category,
        source: context.source,
        params,
        duration_ms: durationMs,
      });

      // Analytics event for failure
      config.captureEvent?.('command_failed', {
        command_id: command.id,
        command_category: command.category,
        source: context.source,
        error: err instanceof Error ? err.message : String(err),
        duration_ms: durationMs,
      });

      throw err; // Re-throw so error boundary catches it
    }
  };
}
