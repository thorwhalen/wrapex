# Skill 11: Wire Tests — Generate Test Skeletons from Command Definitions

## Goal

Generate test skeleton files for all registered commands. Each skeleton includes tests for metadata correctness, parameter validation, when-clause behavior, and execution result shape. The user fills in the TODO sections to complete the tests.

---

## Prerequisites

- Skill 03 (Scaffold) — registry exists
- Skill 04 (Wrap) — commands registered
- Vitest or Jest installed

## Output

Test files in `wrapex-output/commands/__tests__/`.

---

## Steps

### Step 1: Copy the Test Generator

Copy `templates/test-generator.ts` to `wrapex-output/commands/adapters/test-generator.ts`.

### Step 2: Run the Generator

Create a script at `wrapex-output/commands/scripts/generate-tests.ts`:

```typescript
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { generateTestSkeletons } from '../adapters/test-generator';
import { registry } from '../index';

// Import all command definitions to populate the registry
import '../definitions/index';

const files = generateTestSkeletons(registry, {
  outputDir: 'wrapex-output/commands/__tests__',
  framework: 'vitest',  // CONFIGURE: 'vitest' or 'jest'
  registryImportPath: '../core/command-registry',
  commandsImportPath: '../definitions',
});

for (const [filepath, content] of files) {
  mkdirSync(dirname(filepath), { recursive: true });
  writeFileSync(filepath, content, 'utf-8');
  console.log(`Generated: ${filepath}`);
}

console.log(`\nGenerated ${files.size} test files.`);
```

Run it:

```bash
npx tsx wrapex-output/commands/scripts/generate-tests.ts
```

### Step 3: Complete the Test TODOs

Each generated test has TODO comments. Fill in:

1. **Valid params**: Provide parameters that match the command's Zod schema.
2. **Invalid params**: Provide parameters that violate the schema.
3. **Store mock**: If the command reads/writes a store, set up a mock.

**Example — completing a test**:

```typescript
// Generated skeleton:
it('should validate parameters against schema', async () => {
  // TODO: Provide valid params matching the schema
  const validParams = {};
  const result = await registry.execute('app.data.applyFilter', validParams);
  expect(result.success).toBe(true);
});

// Completed:
it('should validate parameters against schema', async () => {
  const validParams = { column: 'age', operator: '>', value: 25 };
  const result = await registry.execute('app.data.applyFilter', validParams, {
    source: 'test',
    store: mockStore,
  });
  expect(result.success).toBe(true);
});
```

### Step 4: Add Integration Tests (Optional)

For command sequences (workflows), write integration tests that exercise multiple commands:

```typescript
describe('User Story: Filter and Zoom', () => {
  it('should apply a filter then zoom to fit', async () => {
    // Setup
    const registry = createTestRegistry();

    // Step 1: Apply filter
    const filterResult = await registry.execute(
      'app.data.applyFilter',
      { column: 'age', operator: '>', value: 25 },
      { source: 'test', store: mockStore },
    );
    expect(filterResult.success).toBe(true);

    // Step 2: Zoom to fit
    const zoomResult = await registry.execute(
      'app.camera.zoomToFit',
      {},
      { source: 'test', store: mockStore },
    );
    expect(zoomResult.success).toBe(true);

    // Assert final state
    expect(mockStore.getState().filters).toHaveLength(1);
  });
});
```

### Step 5: Run Tests

```bash
npx vitest run wrapex-output/commands/__tests__/
```

---

## Validation Checklist

- [ ] Test generator runs without errors
- [ ] One test file per command is generated
- [ ] Generated tests pass once TODOs are filled in
- [ ] Integration tests cover key user stories
- [ ] Tests use the registry's middleware pipeline (not direct handler calls)
