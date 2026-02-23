/**
 * @wrapex/adapters - Test Skeleton Generator
 *
 * Iterates the command registry and generates Vitest (or Jest) test skeletons.
 * Each command gets a test file with: basic execution, validation, when-clause,
 * and result shape assertions.
 *
 * Usage:
 *   import { generateTestSkeletons } from './test-generator';
 *   const files = generateTestSkeletons(registry);
 *   // files is a Map<filepath, content> — write them to disk.
 */

import type { CommandRegistry } from './command-registry';
import type { CommandDefinition } from './define-command';

// ── Types ──────────────────────────────────────────────────────────────────

export interface TestGeneratorOptions {
  /** Directory path for generated test files (relative or absolute). */
  outputDir: string;
  /** Test framework import style. Default: 'vitest'. */
  framework?: 'vitest' | 'jest';
  /** Path to the registry module (for imports in generated tests). */
  registryImportPath: string;
  /** Path to the command definitions (for imports in generated tests). */
  commandsImportPath: string;
}

// ── Generator ──────────────────────────────────────────────────────────────

function commandIdToFilename(id: string): string {
  // 'app.data.applyFilter' → 'app-data-applyFilter.test.ts'
  return id.replace(/\./g, '-') + '.test.ts';
}

function commandIdToVarName(id: string): string {
  // 'app.data.applyFilter' → 'applyFilter'
  const parts = id.split('.');
  return parts[parts.length - 1];
}

function generateSingleTestFile(
  command: CommandDefinition,
  options: TestGeneratorOptions,
): string {
  const fw = options.framework ?? 'vitest';
  const importLine =
    fw === 'vitest'
      ? `import { describe, it, expect, beforeEach } from 'vitest';`
      : `// Jest — globals are available`;

  const varName = commandIdToVarName(command.id);

  const lines: string[] = [
    `/**`,
    ` * Auto-generated test skeleton for command: ${command.id}`,
    ` * Label: ${command.label}`,
    ` * Category: ${command.category}`,
    ` *`,
    ` * Fill in the TODOs to complete the tests.`,
    ` */`,
    ``,
    importLine,
    `import { createRegistry } from '${options.registryImportPath}';`,
    `import { ${varName}Command } from '${options.commandsImportPath}/${varName}';`,
    ``,
    `describe('${command.id}', () => {`,
    `  let registry: ReturnType<typeof createRegistry>;`,
    ``,
    `  beforeEach(() => {`,
    `    registry = createRegistry();`,
    `    registry.register(${varName}Command);`,
    `    // TODO: Set up store mock if needed`,
    `  });`,
    ``,
    `  it('should be registered with correct metadata', () => {`,
    `    const cmd = registry.get('${command.id}');`,
    `    expect(cmd).toBeDefined();`,
    `    expect(cmd!.label).toBe('${command.label}');`,
    `    expect(cmd!.category).toBe('${command.category}');`,
    `  });`,
    ``,
  ];

  // Test for schema validation if schema exists
  if (command.schema) {
    lines.push(
      `  it('should validate parameters against schema', async () => {`,
      `    // TODO: Provide valid params matching the schema`,
      `    const validParams = {};`,
      `    const result = await registry.execute('${command.id}', validParams, { source: 'test', store: undefined });`,
      `    expect(result.success).toBe(true);`,
      `  });`,
      ``,
      `  it('should reject invalid parameters', async () => {`,
      `    // TODO: Provide params that violate the schema`,
      `    const invalidParams = {};`,
      `    const result = await registry.execute('${command.id}', invalidParams, { source: 'test', store: undefined });`,
      `    // Behavior depends on middleware: may throw or return { success: false }`,
      `    expect(result.success).toBe(false);`,
      `  });`,
      ``,
    );
  }

  // Test for when-clause if present
  if (command.when) {
    lines.push(
      `  it('should respect when-clause: ${command.when}', () => {`,
      `    // With evaluateWhen returning false, command should be unavailable`,
      `    const strictRegistry = createRegistry({`,
      `      evaluateWhen: () => false,`,
      `    });`,
      `    strictRegistry.register(${varName}Command);`,
      `    expect(strictRegistry.isAvailable('${command.id}')).toBe(false);`,
      `  });`,
      ``,
    );
  }

  lines.push(
    `  it('should execute and return a CommandResult', async () => {`,
    `    // TODO: Set up store mock and provide valid params`,
    `    const result = await registry.execute('${command.id}', {}, { source: 'test', store: undefined });`,
    `    expect(result).toHaveProperty('success');`,
    `    expect(typeof result.success).toBe('boolean');`,
    `  });`,
    `});`,
    ``,
  );

  return lines.join('\n');
}

/**
 * Generates test skeleton files for all commands in the registry.
 *
 * @returns A Map from file path to file content. The caller is responsible
 *   for writing these to disk.
 */
export function generateTestSkeletons(
  registry: CommandRegistry,
  options: TestGeneratorOptions,
): Map<string, string> {
  const files = new Map<string, string>();

  for (const command of registry.list()) {
    const filename = commandIdToFilename(command.id);
    const filepath = `${options.outputDir}/${filename}`;
    const content = generateSingleTestFile(command, options);
    files.set(filepath, content);
  }

  return files;
}
