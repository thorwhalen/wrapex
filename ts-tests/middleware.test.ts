import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { defineCommand } from '../src/define-command.js';
import {
  validationMiddleware,
  loggingMiddleware,
  errorBoundaryMiddleware,
  createConfirmationMiddleware,
  createDefaultMiddleware,
} from '../src/middleware-pipeline.js';
import { createValidationMiddleware } from '../src/validation-middleware.js';
import type { CommandContext, CommandResult } from '../src/define-command.js';

const baseCtx: CommandContext = { store: undefined, source: 'test' };

function makeNext(result: CommandResult = { success: true }) {
  return vi.fn(async () => result);
}

describe('validationMiddleware', () => {
  it('passes when no schema', async () => {
    const cmd = defineCommand({
      id: 'test.noschema',
      label: 'NoSchema',
      category: 'Test',
      execute: async () => ({ success: true }),
    });

    const next = makeNext();
    await validationMiddleware(cmd, {}, baseCtx, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes with valid params', async () => {
    const cmd = defineCommand({
      id: 'test.valid',
      label: 'Valid',
      category: 'Test',
      schema: z.object({ name: z.string() }),
      execute: async () => ({ success: true }),
    });

    const next = makeNext();
    await validationMiddleware(cmd, { name: 'Alice' }, baseCtx, next);
    expect(next).toHaveBeenCalled();
  });

  it('throws on invalid params', async () => {
    const cmd = defineCommand({
      id: 'test.invalid',
      label: 'Invalid',
      category: 'Test',
      schema: z.object({ name: z.string() }),
      execute: async () => ({ success: true }),
    });

    const next = makeNext();
    await expect(
      validationMiddleware(cmd, { name: 123 }, baseCtx, next),
    ).rejects.toThrow();
    expect(next).not.toHaveBeenCalled();
  });
});

describe('errorBoundaryMiddleware', () => {
  it('passes through successful results', async () => {
    const cmd = defineCommand({
      id: 'test.ok',
      label: 'OK',
      category: 'Test',
      execute: async () => ({ success: true }),
    });

    const next = makeNext({ success: true, data: 'hello' });
    const result = await errorBoundaryMiddleware(cmd, {}, baseCtx, next);
    expect(result.success).toBe(true);
    expect(result.data).toBe('hello');
  });

  it('catches errors and returns failure', async () => {
    const cmd = defineCommand({
      id: 'test.err',
      label: 'Err',
      category: 'Test',
      execute: async () => ({ success: true }),
    });

    const next = vi.fn(async () => {
      throw new Error('kaboom');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await errorBoundaryMiddleware(cmd, {}, baseCtx, next);
    expect(result.success).toBe(false);
    expect(result.message).toContain('kaboom');
    consoleSpy.mockRestore();
  });
});

describe('loggingMiddleware', () => {
  it('logs and delegates to next', async () => {
    const cmd = defineCommand({
      id: 'test.log',
      label: 'Log',
      category: 'Test',
      execute: async () => ({ success: true }),
    });

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const next = makeNext();
    const result = await loggingMiddleware(cmd, {}, baseCtx, next);

    expect(result.success).toBe(true);
    expect(logSpy).toHaveBeenCalledTimes(2); // before + after
    expect(next).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe('createConfirmationMiddleware', () => {
  it('skips confirmation for non-confirmation commands', async () => {
    const confirmFn = vi.fn(async () => false);
    const mw = createConfirmationMiddleware(confirmFn);

    const cmd = defineCommand({
      id: 'test.noconfirm',
      label: 'NoConfirm',
      category: 'Test',
      execute: async () => ({ success: true }),
    });

    const next = makeNext();
    await mw(cmd, {}, baseCtx, next);
    expect(confirmFn).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('blocks when user declines confirmation', async () => {
    const confirmFn = vi.fn(async () => false);
    const mw = createConfirmationMiddleware(confirmFn);

    const cmd = defineCommand({
      id: 'test.confirm',
      label: 'Confirm',
      category: 'Test',
      requiresConfirmation: true,
      execute: async () => ({ success: true }),
    });

    const next = makeNext();
    const result = await mw(cmd, {}, baseCtx, next);
    expect(result.success).toBe(false);
    expect(result.message).toContain('Cancelled');
    expect(next).not.toHaveBeenCalled();
  });

  it('proceeds when user confirms', async () => {
    const confirmFn = vi.fn(async () => true);
    const mw = createConfirmationMiddleware(confirmFn);

    const cmd = defineCommand({
      id: 'test.confirm',
      label: 'Confirm',
      category: 'Test',
      requiresConfirmation: true,
      execute: async () => ({ success: true }),
    });

    const next = makeNext();
    await mw(cmd, {}, baseCtx, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('createValidationMiddleware (configurable)', () => {
  it('throws by default on invalid params', async () => {
    const mw = createValidationMiddleware();
    const cmd = defineCommand({
      id: 'test.v',
      label: 'V',
      category: 'Test',
      schema: z.object({ x: z.number() }),
      execute: async () => ({ success: true }),
    });

    await expect(mw(cmd, { x: 'not a number' }, baseCtx, makeNext())).rejects.toThrow();
  });

  it('returns structured error with catchErrors: true', async () => {
    const mw = createValidationMiddleware({ catchErrors: true });
    const cmd = defineCommand({
      id: 'test.vc',
      label: 'VC',
      category: 'Test',
      schema: z.object({ x: z.number() }),
      execute: async () => ({ success: true }),
    });

    const result = await mw(cmd, { x: 'bad' }, baseCtx, makeNext());
    expect(result.success).toBe(false);
    expect(result.message).toContain('Validation failed');
  });

  it('passes through when no schema', async () => {
    const mw = createValidationMiddleware({ catchErrors: true });
    const cmd = defineCommand({
      id: 'test.ns',
      label: 'NS',
      category: 'Test',
      execute: async () => ({ success: true }),
    });

    const next = makeNext();
    await mw(cmd, {}, baseCtx, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('createDefaultMiddleware', () => {
  it('returns 3 middleware functions', () => {
    const stack = createDefaultMiddleware();
    expect(stack).toHaveLength(3);
    expect(stack[0]).toBe(errorBoundaryMiddleware);
    expect(stack[1]).toBe(loggingMiddleware);
    expect(stack[2]).toBe(validationMiddleware);
  });
});
