import { describe, it, expect } from 'vitest';
import {
  CommandCandidate,
  ParameterCandidate,
  ImplementationPattern,
  ComplexityEstimate,
} from '../src/schemas/command-candidate.schema.js';
import {
  DiagnosisReport,
  StoreInfo,
  StateManagementType,
} from '../src/schemas/diagnosis-report.schema.js';
import {
  RefactoringPlan,
  PlanItem,
  PlanDecision,
} from '../src/schemas/refactoring-plan.schema.js';

describe('CommandCandidate schema', () => {
  const validCandidate = {
    proposedId: 'app.data.applyFilter',
    currentLocation: 'src/store/dataStore.ts:142',
    currentImplementation: 'function applyFilter(filter: Filter) { ... }',
    pattern: 'zustand-action',
    category: 'Data',
    complexity: 'simple',
    parameterCandidates: [
      { name: 'filter', type: 'Filter', required: true },
    ],
    surfaces: ['button', 'keyboard-shortcut'],
    hasSideEffects: false,
    isAsync: false,
    priority: 4,
  };

  it('parses a valid candidate', () => {
    const result = CommandCandidate.safeParse(validCandidate);
    expect(result.success).toBe(true);
  });

  it('applies defaults', () => {
    const minimal = {
      proposedId: 'app.test.minimal',
      currentLocation: 'src/test.ts:1',
      currentImplementation: 'function test() {}',
      pattern: 'standalone-function',
      category: 'Test',
      complexity: 'simple',
    };
    const result = CommandCandidate.parse(minimal);
    expect(result.parameterCandidates).toEqual([]);
    expect(result.surfaces).toEqual([]);
    expect(result.hasSideEffects).toBe(false);
    expect(result.isAsync).toBe(false);
    expect(result.priority).toBe(3);
  });

  it('rejects invalid pattern', () => {
    const bad = { ...validCandidate, pattern: 'not-a-pattern' };
    expect(CommandCandidate.safeParse(bad).success).toBe(false);
  });

  it('rejects priority out of range', () => {
    expect(CommandCandidate.safeParse({ ...validCandidate, priority: 0 }).success).toBe(false);
    expect(CommandCandidate.safeParse({ ...validCandidate, priority: 6 }).success).toBe(false);
  });
});

describe('ParameterCandidate schema', () => {
  it('parses with defaults', () => {
    const result = ParameterCandidate.parse({ name: 'x', type: 'number' });
    expect(result.required).toBe(true);
  });

  it('rejects missing name', () => {
    expect(ParameterCandidate.safeParse({ type: 'string' }).success).toBe(false);
  });
});

describe('ImplementationPattern enum', () => {
  it('accepts valid values', () => {
    for (const v of ['zustand-action', 'redux-action', 'event-handler', 'api-call', 'standalone-function', 'class-method', 'other']) {
      expect(ImplementationPattern.safeParse(v).success).toBe(true);
    }
  });

  it('rejects invalid value', () => {
    expect(ImplementationPattern.safeParse('invalid').success).toBe(false);
  });
});

describe('DiagnosisReport schema', () => {
  const validReport = {
    timestamp: '2025-01-15T10:30:00Z',
    rootDir: '/project',
    summary: {
      totalCandidates: 2,
      byPattern: { 'zustand-action': 1, 'event-handler': 1 },
      byCategory: { Data: 1, UI: 1 },
      byComplexity: { simple: 1, moderate: 1, complex: 0 },
      storeCount: 1,
      stateManagement: ['zustand'],
    },
    stores: [
      {
        filePath: 'src/store.ts',
        name: 'useStore',
        type: 'zustand',
        actionCount: 5,
        actionNames: ['add', 'remove', 'update', 'clear', 'reset'],
      },
    ],
    candidates: [
      {
        proposedId: 'app.data.add',
        currentLocation: 'src/store.ts:10',
        currentImplementation: 'add() {}',
        pattern: 'zustand-action',
        category: 'Data',
        complexity: 'simple',
      },
    ],
    filesScanned: 20,
  };

  it('parses a valid report', () => {
    const result = DiagnosisReport.safeParse(validReport);
    expect(result.success).toBe(true);
  });

  it('applies warnings default', () => {
    const parsed = DiagnosisReport.parse(validReport);
    expect(parsed.warnings).toEqual([]);
  });

  it('rejects invalid timestamp', () => {
    const bad = { ...validReport, timestamp: 'not-a-date' };
    expect(DiagnosisReport.safeParse(bad).success).toBe(false);
  });
});

describe('StoreInfo schema', () => {
  it('rejects invalid state management type', () => {
    expect(
      StoreInfo.safeParse({
        filePath: 'x.ts',
        name: 'store',
        type: 'angular-signals',
        actionCount: 1,
        actionNames: ['a'],
      }).success,
    ).toBe(false);
  });
});

describe('RefactoringPlan schema', () => {
  const validPlan = {
    timestamp: '2025-01-15T12:00:00Z',
    diagnosisTimestamp: '2025-01-15T10:30:00Z',
    decisions: [
      {
        question: 'Which prefix?',
        options: [{ label: 'app', description: 'Default' }],
        recommendation: 'app',
      },
    ],
    categories: ['Data', 'UI'],
    items: [
      {
        candidate: {
          proposedId: 'app.data.add',
          currentLocation: 'src/store.ts:10',
          currentImplementation: 'add() {}',
          pattern: 'zustand-action',
          category: 'Data',
          complexity: 'simple',
        },
        phase: 'phase-1',
        order: 1,
        effortHours: 0.5,
      },
    ],
    phaseSummary: {
      'phase-1': { itemCount: 1, totalEffortHours: 0.5, description: 'Core commands' },
      'phase-2': { itemCount: 0, totalEffortHours: 0, description: 'Schema enrichment' },
      'phase-3': { itemCount: 0, totalEffortHours: 0, description: 'Full coverage' },
    },
  };

  it('parses a valid plan', () => {
    const result = RefactoringPlan.safeParse(validPlan);
    expect(result.success).toBe(true);
  });

  it('applies defaults for plan items', () => {
    const parsed = RefactoringPlan.parse(validPlan);
    expect(parsed.items[0].dependsOn).toEqual([]);
    expect(parsed.items[0].enablesWiring).toEqual([]);
    expect(parsed.idPrefix).toBe('app');
  });

  it('rejects invalid phase', () => {
    const badItem = {
      ...validPlan,
      items: [
        {
          ...validPlan.items[0],
          phase: 'phase-99',
        },
      ],
    };
    expect(RefactoringPlan.safeParse(badItem).success).toBe(false);
  });

  it('rejects effort out of range', () => {
    const badItem = {
      ...validPlan,
      items: [
        {
          ...validPlan.items[0],
          effortHours: 0.1, // min is 0.25
        },
      ],
    };
    expect(RefactoringPlan.safeParse(badItem).success).toBe(false);
  });
});

describe('PlanDecision schema', () => {
  it('parses valid decision', () => {
    const result = PlanDecision.safeParse({
      question: 'Which framework?',
      options: [{ label: 'React', description: 'Popular' }],
    });
    expect(result.success).toBe(true);
  });

  it('applies blocksPhase1 default', () => {
    const parsed = PlanDecision.parse({
      question: 'Q?',
      options: [{ label: 'A', description: 'B' }],
    });
    expect(parsed.blocksPhase1).toBe(false);
  });
});
