# Skill 12: Wire Feature Flags — Gate Commands Behind Feature Flags

## Goal

Gate specific commands behind feature flags so they can be enabled/disabled for specific users, environments, or A/B test cohorts. This integrates with PostHog, LaunchDarkly, or any feature flag system.

---

## Prerequisites

- Skill 03 (Scaffold) — registry with middleware
- A feature flag SDK installed (PostHog, LaunchDarkly, Statsig, etc.)

## Output

A feature flag middleware and configuration module.

---

## Steps

### Step 1: Create the Feature Flag Middleware

Create `wrapex-output/commands/middleware/feature-flags.ts`:

```typescript
import type { CommandMiddleware } from '../core/command-registry';

/**
 * Configuration for the feature flag middleware.
 */
export interface FeatureFlagConfig {
  /**
   * CONFIGURE: Function that checks if a feature flag is enabled.
   * Returns true if the command should be available.
   *
   * PostHog:  (flag) => posthog.isFeatureEnabled(flag)
   * LaunchDarkly:  (flag) => ldClient.variation(flag, false)
   * Custom:  (flag) => myFlags[flag] ?? true
   */
  isEnabled: (flagName: string) => boolean | Promise<boolean>;

  /**
   * How to derive the flag name from a command.
   * Default: uses the command's 'experimental' tag as a flag name,
   * or 'cmd_{commandId}' if no tag is present.
   */
  getFlagName?: (commandId: string, tags?: string[]) => string | undefined;
}

/**
 * Creates middleware that checks feature flags before command execution.
 * Commands tagged with 'experimental' or 'feature-flagged' are gated.
 * Commands without these tags pass through unconditionally.
 */
export function createFeatureFlagMiddleware(
  config: FeatureFlagConfig,
): CommandMiddleware {
  const getFlagName = config.getFlagName ?? defaultGetFlagName;

  return async (command, params, context, next) => {
    const flagName = getFlagName(command.id, command.tags);

    // No flag → command is always available
    if (!flagName) return next();

    const enabled = await config.isEnabled(flagName);
    if (!enabled) {
      return {
        success: false,
        message: `Command "${command.id}" is disabled by feature flag "${flagName}".`,
      };
    }

    return next();
  };
}

function defaultGetFlagName(
  commandId: string,
  tags?: string[],
): string | undefined {
  // Only gate commands that are explicitly tagged
  if (tags?.includes('experimental') || tags?.includes('feature-flagged')) {
    return `cmd_${commandId.replace(/\./g, '_')}`;
  }
  return undefined;
}
```

### Step 2: Configure for Your Provider

**PostHog**:

```typescript
import posthog from 'posthog-js';
import { createFeatureFlagMiddleware } from './feature-flags';

export const featureFlagMiddleware = createFeatureFlagMiddleware({
  isEnabled: (flag) => posthog.isFeatureEnabled(flag) ?? false,
});
```

**LaunchDarkly**:

```typescript
import { ldClient } from '../path/to/launchdarkly';
import { createFeatureFlagMiddleware } from './feature-flags';

export const featureFlagMiddleware = createFeatureFlagMiddleware({
  isEnabled: (flag) => ldClient.variation(flag, false),
});
```

**Simple env-based flags**:

```typescript
export const featureFlagMiddleware = createFeatureFlagMiddleware({
  isEnabled: (flag) => process.env[`FF_${flag.toUpperCase()}`] === 'true',
});
```

### Step 3: Add to Middleware Pipeline

```typescript
export const registry = createRegistry({
  middleware: [
    errorBoundaryMiddleware,
    featureFlagMiddleware,   // Check flags early, before telemetry
    telemetryMiddleware,
    validationMiddleware,
  ],
});
```

### Step 4: Tag Commands for Feature Gating

In command definitions:

```typescript
export const experimentalCommand = defineCommand({
  id: 'app.experimental.newFeature',
  label: 'New Feature (Beta)',
  category: 'Experimental',
  tags: ['experimental'],  // This triggers the feature flag check
  execute: async () => { /* ... */ },
});
```

### Step 5: Filter Palette and Tools

Feature-flagged commands should also be hidden from the palette and AI tools:

```typescript
// In palette adapter — override isAvailable to include flag check
registry.listAvailable().filter(cmd => {
  if (cmd.tags?.includes('experimental')) {
    return posthog.isFeatureEnabled(`cmd_${cmd.id.replace(/\./g, '_')}`);
  }
  return true;
});
```

---

## Validation Checklist

- [ ] Feature flag middleware is in the pipeline
- [ ] Commands tagged 'experimental' are gated
- [ ] Non-tagged commands pass through unconditionally
- [ ] Disabled commands return `{ success: false }` with a clear message
- [ ] Feature-flagged commands are hidden from the palette
- [ ] Feature-flagged commands are excluded from AI/MCP tool lists
