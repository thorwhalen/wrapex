/**
 * wrapex/schemas — Zod schemas for diagnosis reports, command candidates,
 * and refactoring plans.
 *
 * @packageDocumentation
 */

export {
  CommandCandidate,
  ParameterCandidate,
  ImplementationPattern,
  ComplexityEstimate,
  InvocationSurface,
} from './command-candidate.schema.js';

export {
  DiagnosisReport,
  DiagnosisSummary,
  StoreInfo,
  StateManagementType,
} from './diagnosis-report.schema.js';

export {
  RefactoringPlan,
  PlanItem,
  PlanDecision,
} from './refactoring-plan.schema.js';

// Re-export inferred types
export type { CommandCandidate as CommandCandidateType } from './command-candidate.schema.js';
export type { ParameterCandidate as ParameterCandidateType } from './command-candidate.schema.js';
export type { DiagnosisReport as DiagnosisReportType } from './diagnosis-report.schema.js';
export type { StoreInfo as StoreInfoType } from './diagnosis-report.schema.js';
export type { DiagnosisSummary as DiagnosisSummaryType } from './diagnosis-report.schema.js';
export type { RefactoringPlan as RefactoringPlanType } from './refactoring-plan.schema.js';
export type { PlanItem as PlanItemType } from './refactoring-plan.schema.js';
export type { PlanDecision as PlanDecisionType } from './refactoring-plan.schema.js';
