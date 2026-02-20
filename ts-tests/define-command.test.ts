import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineCommand } from '../src/define-command.js';

describe('defineCommand', () => {
  it('returns a frozen command definition', () => {
    const cmd = defineCommand({
      id: 'test.hello',
      label: 'Hello',
      category: 'Test',
      execute: async () => ({ success: true }),
    });

    expect(cmd.id).toBe('test.hello');
    expect(cmd.label).toBe('Hello');
    expect(cmd.category).toBe('Test');
    expect(Object.isFrozen(cmd)).toBe(true);
  });

  it('preserves optional fields', () => {
    const schema = z.object({ name: z.string() });
    const cmd = defineCommand({
      id: 'test.greet',
      label: 'Greet',
      category: 'Test',
      description: 'Greets someone',
      schema,
      keybinding: { key: 'g', ctrl: true },
      when: 'app.ready',
      requiresConfirmation: true,
      tags: ['demo'],
      execute: async (params) => ({ success: true, data: params.name }),
    });

    expect(cmd.description).toBe('Greets someone');
    expect(cmd.schema).toBe(schema);
    expect(cmd.keybinding).toEqual({ key: 'g', ctrl: true });
    expect(cmd.when).toBe('app.ready');
    expect(cmd.requiresConfirmation).toBe(true);
    expect(cmd.tags).toEqual(['demo']);
  });

  it('throws when id is missing', () => {
    expect(() =>
      defineCommand({
        id: '',
        label: 'Bad',
        category: 'Test',
        execute: async () => ({ success: true }),
      }),
    ).toThrow('[wrapex]');
  });

  it('throws when label is missing', () => {
    expect(() =>
      defineCommand({
        id: 'test.bad',
        label: '',
        category: 'Test',
        execute: async () => ({ success: true }),
      }),
    ).toThrow('[wrapex]');
  });

  it('throws when category is missing', () => {
    expect(() =>
      defineCommand({
        id: 'test.bad',
        label: 'Bad',
        category: '',
        execute: async () => ({ success: true }),
      }),
    ).toThrow('[wrapex]');
  });

  it('execute handler receives params and context', async () => {
    const schema = z.object({ count: z.number() });
    const cmd = defineCommand({
      id: 'test.count',
      label: 'Count',
      category: 'Test',
      schema,
      execute: async (params, ctx) => ({
        success: true,
        data: { count: params.count, source: ctx.source },
      }),
    });

    const result = await cmd.execute(
      { count: 42 },
      { store: undefined, source: 'test' },
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ count: 42, source: 'test' });
  });
});
