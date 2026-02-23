/**
 * @wrapex/schemas - Command Candidate
 *
 * Schema for a single command candidate identified during codebase diagnosis.
 * Each candidate represents an existing function, action, or event handler
 * that could be wrapped as a command.
 */

import { z } from 'zod';

/** How the original code is implemented. */
export const ImplementationPattern = z.enum([
  'zustand-action',       // Method on a Zustand store slice
  'redux-action',         // Redux action creator / thunk / slice reducer
  'event-handler',        // React event handler (onClick, onChange, etc.)
  'api-call',             // fetch / axios / tRPC / GraphQL call
  'standalone-function',  // Exported utility function
  'class-method',         // Method on a class instance
  'other',
]);

/** Estimated effort to wrap this candidate as a command. */
export const ComplexityEstimate = z.enum([
  'simple',    // Direct delegation, no params or simple params
  'moderate',  // Needs param extraction, some context setup
  'complex',   // Async, multiple side effects, needs careful wrapping
]);

/** A parameter candidate extracted from the original implementation. */
export const ParameterCandidate = z.object({
  name: z.string().describe('Parameter name'),
  type: z.string().describe('TypeScript type (string, number, boolean, enum values, etc.)'),
  required: z.boolean().default(true),
  defaultValue: z.string().optional().describe('Default value if any'),
  description: z.string().optional().describe('Inferred description of what this param does'),
});

/** Where this operation is currently invocable from. */
export const InvocationSurface = z.enum([
  'button',              // UI button click
  'menu',                // Menu item
  'keyboard-shortcut',   // Existing keybinding
  'context-menu',        // Right-click menu
  'api-endpoint',        // Server-side route
  'store-action',        // Direct store method call
  'effect',              // Called from useEffect or similar
  'programmatic',        // Called from other code, not user-facing
]);

/** A single command candidate. */
export const CommandCandidate = z.object({
  /** Proposed command ID (e.g., 'app.data.applyFilter'). */
  proposedId: z.string().describe('Namespaced command ID following app.domain.action convention'),

  /** File path and line number where the original implementation lives. */
  currentLocation: z.string().describe('File path:line, e.g., src/store/dataStore.ts:142'),

  /** The original code snippet (signature or first few lines). */
  currentImplementation: z.string().describe('Code snippet of the original function/action'),

  /** How the original code is structured. */
  pattern: ImplementationPattern,

  /** Proposed category for grouping. */
  category: z.string().describe('Category name, e.g., Data, Camera, UI, Selection'),

  /** Effort estimate. */
  complexity: ComplexityEstimate,

  /** Extracted parameter candidates. */
  parameterCandidates: z.array(ParameterCandidate).default([]),

  /** Where this operation is currently triggered from. */
  surfaces: z.array(InvocationSurface).default([]),

  /** Whether this candidate has side effects (API calls, file writes, etc.). */
  hasSideEffects: z.boolean().default(false),

  /** Whether this candidate is async. */
  isAsync: z.boolean().default(false),

  /** Free-form notes (e.g., 'hardcoded duration should be parameterized'). */
  notes: z.string().optional(),

  /** Priority score 1-5 (5 = highest value to wrap first). */
  priority: z.number().int().min(1).max(5).default(3),
});

export type CommandCandidate = z.infer<typeof CommandCandidate>;
export type ParameterCandidate = z.infer<typeof ParameterCandidate>;
