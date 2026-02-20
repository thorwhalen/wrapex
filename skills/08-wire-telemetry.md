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

### Step 1: Copy the Telemetry Middleware Template

Copy `templates/telemetry-middleware.ts` to `wrapex-output/commands/middleware/telemetry.ts`.

### Step 2: Configure for Your Providers

Create the middleware instance with your specific integrations:

```typescript
// wrapex-output/commands/middleware/telemetry.ts
import * as Sentry from '@sentry/react'; // or @sentry/nextjs, @sentry/node
import posthog from 'posthog-js';         // or your analytics provider
import { createTelemetryMiddleware } from './telemetry-middleware';

export const telemetryMiddleware = createTelemetryMiddleware({
  // Sentry breadcrumbs — appears in error reports as user action trail
  addBreadcrumb: (data) => Sentry.addBreadcrumb(data),

  // Analytics events — appears in PostHog / Amplitude / Mixpanel
  captureEvent: (eventName, properties) => {
    posthog.capture(eventName, properties);
  },

  // Error capture — sends to Sentry with command context
  captureError: (error, context) => {
    Sentry.captureException(error, { extra: context });
  },
});
```

### Step 3: Add to the Middleware Pipeline

Update the registry instance in `wrapex-output/commands/index.ts`:

```typescript
import { createRegistry } from './core/command-registry';
import { errorBoundaryMiddleware, validationMiddleware } from './core/middleware-pipeline';
import { telemetryMiddleware } from './middleware/telemetry';

export const registry = createRegistry({
  middleware: [
    errorBoundaryMiddleware,  // Outermost — catches all errors
    telemetryMiddleware,      // Records breadcrumb + event
    validationMiddleware,     // Validates params
    // Handler executes last
  ],
  // ... rest of config
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
