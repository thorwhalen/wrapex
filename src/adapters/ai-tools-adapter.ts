/**
 * @wrapex/adapters - AI Tools Adapter
 *
 * Iterates the command registry and produces tool definitions compatible with
 * the Vercel AI SDK or Anthropic SDK tool format.
 *
 * Usage (Vercel AI SDK):
 *   import { toVercelAiTools } from 'wrapex/adapters';
 *   const tools = toVercelAiTools(registry);
 *   const result = await generateText({ model, tools, prompt });
 *
 * Usage (Anthropic SDK):
 *   import { toAnthropicTools } from 'wrapex/adapters';
 *   const tools = toAnthropicTools(registry);
 *   // Pass to messages API: { tools, messages: [...] }
 */

import type { CommandRegistry } from '../command-registry.js';

// ── Vercel AI SDK Format ───────────────────────────────────────────────────

/**
 * Shape matching Vercel AI SDK's tool() helper.
 * The SDK accepts Zod schemas directly for `parameters`.
 */
export interface VercelAiTool {
  description: string;
  parameters: unknown; // Zod schema — AI SDK handles conversion
  execute: (params: Record<string, unknown>) => Promise<unknown>;
}

/**
 * Converts registry commands to Vercel AI SDK tool definitions.
 * Only commands with Zod schemas are included.
 *
 * @returns A Record<string, VercelAiTool> keyed by command ID (dots replaced with underscores).
 */
export function toVercelAiTools(
  registry: CommandRegistry,
  options: { filterTags?: string[] } = {},
): Record<string, VercelAiTool> {
  const tools: Record<string, VercelAiTool> = {};

  for (const command of registry.listAvailable()) {
    if (!command.schema) continue;
    if (
      options.filterTags &&
      !options.filterTags.some((t) => command.tags?.includes(t))
    ) {
      continue;
    }

    const toolName = command.id.replace(/\./g, '_');

    tools[toolName] = {
      description: command.description ?? command.label,
      parameters: command.schema, // Vercel AI SDK accepts Zod directly
      execute: async (params) => {
        return registry.execute(command.id, params, {
          source: 'ai',
          invocation: { surface: 'ai' as const },
          store: undefined,
        });
      },
    };
  }

  return tools;
}

// ── Anthropic SDK Format ───────────────────────────────────────────────────

/**
 * Shape matching Anthropic API tool definitions.
 * Requires JSON Schema for input_schema (not Zod).
 */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

/**
 * Converts registry commands to Anthropic API tool definitions.
 * Requires Zod v4 (z.toJSONSchema) or zod-to-json-schema for conversion.
 *
 * @param toJsonSchema - A function that converts a Zod schema to JSON Schema.
 *   For Zod v4: `(schema) => z.toJSONSchema(schema)`
 *   For Zod v3: `(schema) => zodToJsonSchema(schema)` from 'zod-to-json-schema'
 */
export function toAnthropicTools(
  registry: CommandRegistry,
  toJsonSchema: (schema: unknown) => Record<string, unknown>,
  options: { filterTags?: string[] } = {},
): AnthropicTool[] {
  const tools: AnthropicTool[] = [];

  for (const command of registry.listAvailable()) {
    if (!command.schema) continue;
    if (
      options.filterTags &&
      !options.filterTags.some((t) => command.tags?.includes(t))
    ) {
      continue;
    }

    tools.push({
      name: command.id.replace(/\./g, '_'),
      description: command.description ?? command.label,
      input_schema: toJsonSchema(command.schema),
    });
  }

  return tools;
}

// ── Meta-Tool Pattern ───────────────────────────────────────────────────────

/**
 * Meta-tool result types.
 */
export interface MetaToolSet {
  list_commands: VercelAiTool;
  execute_command: VercelAiTool;
}

/**
 * Creates two meta-tools: `list_commands` and `execute_command`.
 * Scales better than per-command tools for large registries (50+ commands).
 *
 * - `list_commands` — returns all available command descriptors with schemas.
 * - `execute_command` — executes a command by ID with the given input.
 *
 * @param registry - The command registry.
 * @param options.toPortableSchema - Optional converter for Zod → JSON Schema in descriptors.
 */
export function createMetaTools(
  registry: CommandRegistry,
  options: {
    toPortableSchema?: (schema: unknown) => Record<string, unknown>;
  } = {},
): MetaToolSet {
  return {
    list_commands: {
      description: 'List all available commands with their IDs, descriptions, categories, and parameter schemas.',
      parameters: {} as unknown, // no params needed
      execute: async () => {
        const descriptors = registry.listDescriptors(options.toPortableSchema);
        return { commands: descriptors };
      },
    },
    execute_command: {
      description: 'Execute a command by its ID with the given input parameters.',
      parameters: {
        // Schema will be: { commandId: string, input?: object }
        // The caller (AI SDK) will handle this as a generic object
      } as unknown,
      execute: async (params: Record<string, unknown>) => {
        const commandId = params.commandId as string;
        const input = (params.input ?? {}) as Record<string, unknown>;
        if (!commandId) {
          return { success: false, message: 'commandId is required.' };
        }
        return registry.execute(commandId, input, {
          source: 'ai',
          invocation: { surface: 'ai' as const },
          store: undefined,
        });
      },
    },
  };
}

// ── Execution Router (for handling AI tool_use results) ────────────────────

/**
 * Routes an AI tool call back through the registry.
 * Call this when the AI SDK returns a tool_use block.
 *
 * @param toolName - The tool name (underscored command ID).
 * @param params - The parameters the AI produced.
 */
export async function executeAiToolCall(
  registry: CommandRegistry,
  toolName: string,
  params: Record<string, unknown>,
) {
  // Convert underscore tool name back to dot-separated command ID
  const commandId = toolName.replace(/_/g, '.');
  return registry.execute(commandId, params, {
    source: 'ai',
    invocation: { surface: 'ai' as const },
    store: undefined,
  });
}
