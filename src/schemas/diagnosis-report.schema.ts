/**
 * @wrapex/schemas - Diagnosis Report
 *
 * Schema for the full diagnosis output produced by the 01-diagnose skill.
 * This is the structured report of all command candidates found in a codebase.
 */

import { z } from 'zod';
import { CommandCandidate, ImplementationPattern } from './command-candidate.schema.js';

/** Detected state management approach. */
export const StateManagementType = z.enum([
  'zustand',
  'redux',
  'redux-toolkit',
  'mobx',
  'jotai',
  'recoil',
  'valtio',
  'plain-react',  // useState / useReducer only
  'other',
]);

/** Summary of a detected store or state container. */
export const StoreInfo = z.object({
  /** File path to the store definition. */
  filePath: z.string(),
  /** Name of the store / slice (e.g., 'useProjectStore', 'dataSlice'). */
  name: z.string(),
  /** State management library detected. */
  type: StateManagementType,
  /** Number of actions / methods found. */
  actionCount: z.number().int(),
  /** List of action names. */
  actionNames: z.array(z.string()),
});

/** Summary statistics for the diagnosis. */
export const DiagnosisSummary = z.object({
  /** Total command candidates found. */
  totalCandidates: z.number().int(),
  /** Breakdown by implementation pattern. */
  byPattern: z.record(ImplementationPattern, z.number().int()),
  /** Breakdown by category. */
  byCategory: z.record(z.string(), z.number().int()),
  /** Breakdown by complexity. */
  byComplexity: z.object({
    simple: z.number().int(),
    moderate: z.number().int(),
    complex: z.number().int(),
  }),
  /** Number of stores/slices detected. */
  storeCount: z.number().int(),
  /** State management type(s) detected. */
  stateManagement: z.array(StateManagementType),
});

/** The full diagnosis report. */
export const DiagnosisReport = z.object({
  /** When the diagnosis was run. */
  timestamp: z.string().datetime(),

  /** Root directory that was scanned. */
  rootDir: z.string(),

  /** Summary statistics. */
  summary: DiagnosisSummary,

  /** Detected stores / state containers. */
  stores: z.array(StoreInfo),

  /** All command candidates found. */
  candidates: z.array(CommandCandidate),

  /** Files that were scanned. */
  filesScanned: z.number().int(),

  /** Any warnings or issues encountered during scanning. */
  warnings: z.array(z.string()).default([]),
});

export type DiagnosisReport = z.infer<typeof DiagnosisReport>;
export type StoreInfo = z.infer<typeof StoreInfo>;
export type DiagnosisSummary = z.infer<typeof DiagnosisSummary>;
