import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { defineCommand } from '../src/define-command.js';
import { createRegistry } from '../src/command-registry.js';
import type { CommandMiddleware } from '../src/command-registry.js';

function makeCommand(id: string, overrides: Record<string, unknown> = {}) {
  return defineCommand({
    id,
    label: id,
    category: 'Test',
    execute: async () => ({ success: true }),
    ...overrides,
  });
}

describe('createRegistry', () => {
  it('registers and retrieves a command', () => {
    const reg = createRegistry();
    const cmd = makeCommand('test.a');
    reg.register(cmd);

    expect(reg.get('test.a')).toBe(cmd);
    expect(reg.size).toBe(1);
  });

  it('throws on duplicate registration', () => {
    const reg = createRegistry();
    reg.register(makeCommand('test.dup'));
    expect(() => reg.register(makeCommand('test.dup'))).toThrow('already registered');
  });

  it('registerAll registers multiple commands', () => {
    const reg = createRegistry();
    reg.registerAll([makeCommand('a'), makeCommand('b'), makeCommand('c')]);
    expect(reg.size).toBe(3);
  });

  it('unregister removes a command', () => {
    const reg = createRegistry();
    reg.register(makeCommand('test.rm'));
    expect(reg.unregister('test.rm')).toBe(true);
    expect(reg.get('test.rm')).toBeUndefined();
    expect(reg.unregister('test.rm')).toBe(false);
  });

  it('list returns all commands', () => {
    const reg = createRegistry();
    reg.registerAll([makeCommand('x'), makeCommand('y')]);
    expect(reg.list()).toHaveLength(2);
  });

  it('execute calls the handler and returns result', async () => {
    const reg = createRegistry();
    reg.register(
      defineCommand({
        id: 'test.exec',
        label: 'Exec',
        category: 'Test',
        execute: async (params) => ({
          success: true,
          data: params,
        }),
      }),
    );

    const result = await reg.execute('test.exec', { foo: 'bar' });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ foo: 'bar' });
  });

  it('execute returns failure for unknown command', async () => {
    const reg = createRegistry();
    const result = await reg.execute('no.such.command');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Unknown command');
  });

  it('execute returns failure when handler throws', async () => {
    const reg = createRegistry();
    reg.register(
      defineCommand({
        id: 'test.throw',
        label: 'Throw',
        category: 'Test',
        execute: async () => {
          throw new Error('boom');
        },
      }),
    );

    const result = await reg.execute('test.throw');
    expect(result.success).toBe(false);
    expect(result.message).toContain('boom');
  });

  describe('when-clause', () => {
    it('blocks execution when clause fails', async () => {
      const reg = createRegistry({
        evaluateWhen: (clause) => clause === 'true',
      });

      reg.register(makeCommand('test.gated', { when: 'false' }));
      const result = await reg.execute('test.gated');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not available');
    });

    it('allows execution when clause passes', async () => {
      const reg = createRegistry({
        evaluateWhen: (clause) => clause === 'ok',
      });

      reg.register(makeCommand('test.ok', { when: 'ok' }));
      const result = await reg.execute('test.ok');
      expect(result.success).toBe(true);
    });

    it('isAvailable checks when-clause', () => {
      const reg = createRegistry({
        evaluateWhen: (clause) => clause === 'yes',
      });

      reg.register(makeCommand('test.yes', { when: 'yes' }));
      reg.register(makeCommand('test.no', { when: 'no' }));
      reg.register(makeCommand('test.none'));

      expect(reg.isAvailable('test.yes')).toBe(true);
      expect(reg.isAvailable('test.no')).toBe(false);
      expect(reg.isAvailable('test.none')).toBe(true);
      expect(reg.isAvailable('test.missing')).toBe(false);
    });

    it('listAvailable filters by when-clause', () => {
      const reg = createRegistry({
        evaluateWhen: (clause) => clause === 'show',
      });

      reg.register(makeCommand('test.show', { when: 'show' }));
      reg.register(makeCommand('test.hide', { when: 'hide' }));
      reg.register(makeCommand('test.always'));

      const available = reg.listAvailable();
      const ids = available.map((c) => c.id);
      expect(ids).toContain('test.show');
      expect(ids).toContain('test.always');
      expect(ids).not.toContain('test.hide');
    });
  });

  describe('middleware', () => {
    it('runs middleware in order', async () => {
      const order: string[] = [];

      const mw1: CommandMiddleware = async (_cmd, _p, _ctx, next) => {
        order.push('mw1-before');
        const result = await next();
        order.push('mw1-after');
        return result;
      };

      const mw2: CommandMiddleware = async (_cmd, _p, _ctx, next) => {
        order.push('mw2-before');
        const result = await next();
        order.push('mw2-after');
        return result;
      };

      const reg = createRegistry({ middleware: [mw1, mw2] });
      reg.register(
        defineCommand({
          id: 'test.mw',
          label: 'MW',
          category: 'Test',
          execute: async () => {
            order.push('handler');
            return { success: true };
          },
        }),
      );

      await reg.execute('test.mw');
      expect(order).toEqual([
        'mw1-before',
        'mw2-before',
        'handler',
        'mw2-after',
        'mw1-after',
      ]);
    });

    it('middleware can short-circuit', async () => {
      const blocker: CommandMiddleware = async () => ({
        success: false,
        message: 'blocked',
      });

      const reg = createRegistry({ middleware: [blocker] });
      const handler = vi.fn(async () => ({ success: true }));
      reg.register(
        defineCommand({
          id: 'test.blocked',
          label: 'Blocked',
          category: 'Test',
          execute: handler,
        }),
      );

      const result = await reg.execute('test.blocked');
      expect(result.success).toBe(false);
      expect(result.message).toBe('blocked');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('contextProvider', () => {
    it('injects context into execution', async () => {
      const reg = createRegistry({
        contextProvider: () => ({ appVersion: '1.0' }),
      });

      let capturedContext: unknown;
      reg.register(
        defineCommand({
          id: 'test.ctx',
          label: 'Ctx',
          category: 'Test',
          execute: async (_params, ctx) => {
            capturedContext = ctx;
            return { success: true };
          },
        }),
      );

      await reg.execute('test.ctx', {}, { source: 'palette' });
      expect(capturedContext).toMatchObject({
        source: 'palette',
        appVersion: '1.0',
      });
    });
  });
});
