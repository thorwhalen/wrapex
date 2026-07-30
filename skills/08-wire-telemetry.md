# Skill 08: Wire Telemetry — Connect Middleware to Sentry + Analytics

## Goal

Wire the telemetry middleware so every command execution automatically produces a Sentry breadcrumb and an analytics event. This gives free observability over all user-initiated operations.

---

## Prerequisites

- Skill 03 (Scaffold) — registry with middleware pipeline
- Sentry and/or an analytics SDK already installed in the project

## Output

A configured telemetry middleware plugged into the registry's middleware pipeline.

---

## Steps

### Approach A: Lifecycle Callbacks (Recommended)

The registry now has built-in lifecycle callbacks that fire on every command execution. This is the simplest and most reliable way to add telemetry — no middleware needed.

### Step 1: Configure Lifecycle Callbacks on the Registry

Update your registry instance in `wrapex-output/commands/index.ts`:

```typescript
import * as Sentry from '@sentry/react'; // or @sentry/nextjs, @sentry/node
import posthog from 'posthog-js';         // or your analytics provider
import { createRegistry } from './core/command-registry';
import { errorBoundaryMiddleware, validationMiddleware } from './core/middleware-pipeline';

export const registry = createRegistry({
  middleware: [
    errorBoundaryMiddleware,
    validationMiddleware,
  ],

  // Lifecycle callbacks fire automatically on every command execution.
  // Each callback is wrapped in try-catch — it can never break command execution.

  onCommandInvokeStart: ({ commandId, context }) => {
    Sentry.addBreadcrumb({
      category: 'command',
      message: commandId,
      data: { source: context.source },
    });
  },

  onCommandInvokeSuccess: ({ commandId, result, durationMs }) => {
    posthog.capture('command_executed', {
      command_id: commandId,
      success: true,
      duration_ms: durationMs,
    });
  },

  onCommandInvokeFailure: ({ commandId, result, durationMs }) => {
    posthog.capture('command_executed', {
      command_id: commandId,
      success: false,
      code: result.code,
      message: result.message,
      duration_ms: durationMs,
    });
  },

  onCommandInvokeError: ({ commandId, error, durationMs }) => {
    Sentry.captureException(error, {
      extra: { commandId, durationMs },
    });
  },
});
```

### Approach B: Telemetry Middleware (Alternative)

If you need more control (e.g., modifying params before execution), the middleware approach still works:

### Step 1: Copy the Telemetry Middleware Template

Copy `templates/telemetry-middleware.ts` to `wrapex-output/commands/middleware/telemetry.ts`.

### Step 2: Configure for Your Providers

```typescript
import * as Sentry from '@sentry/react';
import posthog from 'posthog-js';
import { createTelemetryMiddleware } from './telemetry-middleware';

export const telemetryMiddleware = createTelemetryMiddleware({
  addBreadcrumb: (data) => Sentry.addBreadcrumb(data),
  captureEvent: (eventName, properties) => {
    posthog.capture(eventName, properties);
  },
  captureError: (error, context) => {
    Sentry.captureException(error, { extra: context });
  },
});
```

### Step 3: Add to the Middleware Pipeline

```typescript
export const registry = createRegistry({
  middleware: [
    errorBoundaryMiddleware,
    telemetryMiddleware,
    validationMiddleware,
  ],
});
```

**Middleware order matters**: Telemetry should be outside validation so it captures both successful and failed validations. Error boundary should be outermost.

### Step 4: Verify in Sentry Dashboard

Execute a few commands and check:
- Sentry breadcrumbs show command IDs and parameters
- Analytics dashboard shows `command_executed` events with `command_id`, `source`, `duration_ms`
- Errors show `command_failed` events with error messages

---

## What You Get

After wiring telemetry, every command execution automatically produces:

1. **Sentry breadcrumb**: `{ category: 'command', message: 'app.camera.zoomToFit', data: { source: 'palette' } }`
2. **Analytics event**: `command_executed { command_id, category, source, success, duration_ms }`
3. **Error context**: If a command fails, the error report includes which command was running and what parameters were passed.

This enables:
- Usage-driven test prioritization (most-used commands get the most tests)
- Performance monitoring (which commands are slow?)
- Feature adoption tracking (are users discovering the new commands?)
- Debugging (what was the user doing before the crash?)

---

## Validation Checklist

- [ ] Telemetry middleware is in the pipeline
- [ ] Sentry breadcrumbs appear in the Sentry dashboard
- [ ] Analytics events appear in the analytics dashboard
- [ ] Command failures are captured with context
- [ ] Telemetry does not block command execution (non-blocking)
- [ ] No existing files were modified (aside from the registry instance)
