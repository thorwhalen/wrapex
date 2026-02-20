/**
 * @wrapex/schemas - Refactoring Plan
 *
 * Schema for the prioritized refactoring plan produced by the 02-plan skill.
 * This structures the command candidates into an actionable backlog.
 */

import { z } from 'zod';
import { CommandCandidate } from './command-candidate.schema.js';

/** A single work item in the refactoring backlog. */
export const PlanItem = z.object({
  /** The command candidate this item wraps. */
  candidate: CommandCandidate,

  /** Phase in which this item should be implemented. */
  phase: z.enum(['phase-1', 'phase-2', 'phase-3']).describe(
    'phase-1: Core commands (immediate value). phase-2: Schema enrichment. phase-3: Full coverage.',
  ),

  /** Ordering within the phase (lower = do first). */
  order: z.number().int(),

  /** Estimated effort in hours. */
  effortHours: z.number().min(0.25).max(40),

  /** Dependencies: command IDs that should be wrapped first. */
  dependsOn: z.array(z.string()).default([]),

  /** Which wire-up skills this command enables. */
  enablesWiring: z.array(z.enum([
    'palette',
    'shortcuts',
    'telemetry',
    'ai-tools',
    'mcp',
    'tests',
    'feature-flags',
  ])).default([]),

  /** Justification for the priority / phase assignment. */
  rationale: z.string().optional(),
});

/** Configuration decisions that the user needs to make. */
export const PlanDecision = z.object({
  /** What needs to be decided. */
  question: z.string(),
  /** Available options with trade-offs. */
  options: z.array(z.object({
    label: z.string(),
    description: z.string(),
  })),
  /** Recommended option (by label). */
  recommendation: z.string().optional(),
  /** Whether this blocks Phase 1. */
  blocksPhase1: z.boolean().default(false),
});

/** The full refactoring plan. */
export const RefactoringPlan = z.object({
  /** When this plan was generated. */
  timestamp: z.string().datetime(),

  /** The diagnosis report this plan was derived from. */
  diagnosisTimestamp: z.string().datetime(),

  /** Configuration decisions for the user. */
  decisions: z.array(PlanDecision),

  /** ID prefix to use for all commands (e.g., 'app' or 'myapp'). */
  idPrefix: z.string().default('app'),

  /** Proposed category list. */
  categories: z.array(z.string()),

  /** The ordered backlog. */
  items: z.array(PlanItem),

  /** Summary per phase. */
  phaseSummary: z.object({
    'phase-1': z.object({
      itemCount: z.number().int(),
      totalEffortHours: z.number(),
      description: z.string(),
    }),
    'phase-2': z.object({
      itemCount: z.number().int(),
      totalEffortHours: z.number(),
      description: z.string(),
    }),
    'phase-3': z.object({
      itemCount: z.number().int(),
      totalEffortHours: z.number(),
      description: z.string(),
    }),
  }),
});

export type RefactoringPlan = z.infer<typeof RefactoringPlan>;
export type PlanItem = z.infer<typeof PlanItem>;
export type PlanDecision = z.infer<typeof PlanDecision>;
