/**
 * @wrapex/adapters - MCP Server Adapter
 *
 * Iterates the command registry and registers each command (that has a Zod schema)
 * as an MCP tool via the MCP TypeScript SDK.
 *
 * Usage:
 *   import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
 *   import { registerCommandsAsMcpTools } from 'wrapex/adapters';
 *
 *   const server = new McpServer({ name: 'my-app', version: '1.0.0' });
 *   registerCommandsAsMcpTools(registry, server);
 */

import type { CommandRegistry } from '../command-registry.js';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Minimal interface matching the MCP TypeScript SDK's McpServer.tool() signature.
 * We type against this interface rather than importing the SDK directly,
 * so the toolkit has zero hard dependencies.
 */
export interface McpServerLike {
  tool(
    name: string,
    description: string,
    schema: Record<string, unknown>,
    handler: (params: Record<string, unknown>) => Promise<{
      content: Array<{ type: string; text: string }>;
      isError?: boolean;
    }>,
  ): void;
}

// ── Adapter ────────────────────────────────────────────────────────────────

export interface McpAdapterOptions {
  /**
   * CONFIGURE: Only expose commands with these tags as MCP tools.
   * If omitted, all commands with schemas are exposed.
   */
  filterTags?: string[];

  /**
   * CONFIGURE: Prefix for MCP tool names. Default: '' (use command ID as-is).
   * MCP tool names must match [a-zA-Z0-9_-]+.
   */
  namePrefix?: string;

  /**
   * CONFIGURE: Convert command ID to MCP-safe tool name.
   * Default: replaces dots with underscores.
   */
  toToolName?: (commandId: string) => string;

  /**
   * CONFIGURE: Convert a Zod schema to JSON Schema for MCP tool registration.
   * If not provided, falls back to `{ type: 'object' }`.
   *
   * For Zod v4: `(schema) => z.toJSONSchema(schema)`
   * For Zod v3: `(schema) => zodToJsonSchema(schema)` from 'zod-to-json-schema'
   */
  toJsonSchema?: (schema: unknown) => Record<string, unknown>;
}

/**
 * Registers all schema-bearing commands from the registry as MCP tools.
 *
 * @param registry - The command registry.
 * @param server - An MCP server instance (or anything with a compatible .tool() method).
 * @param options - Configuration options.
 * @returns The number of tools registered.
 */
export function registerCommandsAsMcpTools(
  registry: CommandRegistry,
  server: McpServerLike,
  options: McpAdapterOptions = {},
): number {
  const {
    filterTags,
    namePrefix = '',
    toToolName = (id: string) => id.replace(/\./g, '_'),
    toJsonSchema,
  } = options;

  let count = 0;

  for (const command of registry.list()) {
    // Skip commands without schemas — MCP tools require inputSchema.
    if (!command.schema) continue;

    // Filter by tags if configured.
    if (filterTags && !filterTags.some((t) => command.tags?.includes(t))) {
      continue;
    }

    const toolName = namePrefix + toToolName(command.id);
    const description = command.description ?? command.label;

    // Convert Zod schema to JSON Schema using the provided converter,
    // or fall back to a generic object schema.
    const jsonSchema: Record<string, unknown> = toJsonSchema
      ? toJsonSchema(command.schema)
      : { type: 'object' };

    server.tool(toolName, description, jsonSchema, async (params) => {
      const result = await registry.execute(command.id, params, {
        source: 'mcp',
        invocation: { surface: 'mcp' as const },
        store: undefined,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
        isError: !result.success,
      };
    });

    count++;
  }

  return count;
}
