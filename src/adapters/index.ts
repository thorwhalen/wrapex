/**
 * wrapex/adapters — Consumer adapters that iterate the command registry
 * and produce output for palettes, AI tools, MCP, and test generators.
 *
 * @packageDocumentation
 */

export { createPaletteAdapter } from './palette-adapter.js';
export type { PaletteEntry, PaletteAdapter } from './palette-adapter.js';

export { registerCommandsAsMcpTools } from './mcp-adapter.js';
export type { McpServerLike, McpAdapterOptions } from './mcp-adapter.js';

export {
  toVercelAiTools,
  toAnthropicTools,
  executeAiToolCall,
} from './ai-tools-adapter.js';
export type { VercelAiTool, AnthropicTool } from './ai-tools-adapter.js';

export { generateTestSkeletons } from './test-generator.js';
export type { TestGeneratorOptions } from './test-generator.js';
