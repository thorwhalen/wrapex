# Skill 02: Plan — Produce a Prioritized Refactoring Plan

## Goal

Transform the diagnosis report from Skill 01 into a prioritized, phased refactoring plan. The plan assigns each command candidate to a phase, estimates effort, identifies dependencies, and surfaces configuration decisions for the user.

**No files are modified in the target codebase.** Output goes to `wrapex-output/`.

---

## Inputs

- `wrapex-output/diagnosis-report.json` (from Skill 01)
- (Optional) User preferences for categories, ID prefix, and priority overrides.

## Output

- `wrapex-output/refactoring-plan.json` conforming to the `RefactoringPlan` schema.
- `wrapex-output/refactoring-plan.md` — human-readable plan document.

---

## Steps

### Step 1: Load and Validate the Diagnosis

Read `wrapex-output/diagnosis-report.json`. Verify it's well-formed. If it's missing or invalid, instruct the user to run Skill 01 first.

### Step 2: Propose Configuration Decisions

Generate a list of `PlanDecision` entries for user input. Common decisions:

1. **ID prefix**: What namespace prefix for command IDs?
   - Options: `app`, the project name, a custom prefix
   - Default: `app`

2. **Categories**: Confirm or adjust the auto-detected categories.
   - Show the categories found in diagnosis, let user merge/rename/add.

3. **State management adapter**: Which store pattern to use for command context?
   - Options depend on what was detected (Zustand, Redux, etc.)

4. **Analytics provider**: Which analytics to wire up?
   - Options: PostHog, Sentry, Amplitude, Mixpanel, none

5. **Test framework**: Which framework for generated tests?
   - Options: Vitest, Jest

6. **Phase 1 scope**: How many commands in the first phase?
   - Options: 10-15 (conservative), 15-25 (moderate), 25+ (aggressive)

### Step 3: Assign Phases

Distribute candidates across three phases using these criteria:

**Phase 1 — Core commands (immediate value)**:
- Priority 4-5 candidates
- Simple or moderate complexity
- User-facing actions (have button/shortcut surfaces)
- Core to the app's primary use case
- Target: 15-20 commands

**Phase 2 — Schema enrichment**:
- Priority 3-4 candidates
- Commands from Phase 1 that need Zod schemas added
- Additional moderate-complexity candidates
- API-related commands (tRPC mutations, etc.)
- Target: 15-20 additional commands

**Phase 3 — Full coverage**:
- Remaining priority 1-3 candidates
- Complex candidates
- Internal/programmatic actions
- Target: everything else

### Step 4: Estimate Effort

Apply effort estimates per candidate:

| Complexity | Pattern | Effort (hours) |
|------------|---------|---------------|
| simple | zustand-action | 0.25 |
| simple | event-handler | 0.5 |
| simple | api-call | 0.5 |
| moderate | zustand-action | 0.5 |
| moderate | event-handler | 1 |
| moderate | api-call | 1 |
| complex | any | 2-4 |

Add setup overhead for Phase 1:
- Registry scaffold: 2 hours
- Middleware setup: 1 hour
- First adapter (palette): 2 hours

### Step 5: Identify Dependencies

Mark dependency relationships:
- Commands in the same store should be wrapped in the same batch.
- Composite operations (e.g., "load and initialize") depend on their sub-commands.
- Adapter wiring depends on having ≥5 commands registered.

### Step 6: Map Wiring Opportunities

For each command, note which wire-up skills it enables:
- Has params → enables `ai-tools`, `mcp`
- Has a natural keybinding → enables `shortcuts`
- Is user-facing → enables `palette`
- Has side effects → enables `telemetry`
- All commands → enable `tests`

### Step 7: Compile the Plan

Write `wrapex-output/refactoring-plan.json` and `wrapex-output/refactoring-plan.md`.

The markdown plan should include:
1. Configuration decisions (as a checklist the user fills in)
2. Phase 1 table: command ID, label, category, complexity, effort, notes
3. Phase 2 table: same format
4. Phase 3 table: same format
5. Dependency graph (text-based)
6. Total effort estimate per phase
7. Recommended execution order within Phase 1

---

## Validation Checklist

- [ ] Every candidate from the diagnosis appears in exactly one phase
- [ ] Phase 1 contains 15-20 commands
- [ ] Effort estimates are reasonable (Phase 1 total: 15-30 hours)
- [ ] Dependencies are acyclic
- [ ] Configuration decisions have clear options and recommendations
- [ ] Output is in `wrapex-output/`, no existing files modified
