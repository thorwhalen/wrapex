# Skill 10: Wire MCP — Expose Commands as MCP Server Tools

## Goal

Generate an MCP server that exposes registered commands as MCP tools. External AI agents (Claude Desktop, Cursor, etc.) can then control your application via the Model Context Protocol.

---

## Prerequisites

- Skill 03 (Scaffold) — registry exists
- Skill 05 (Enrich) — commands have Zod schemas
- `@modelcontextprotocol/sdk` installed

## Output

An MCP server module in `wrapex-output/commands/mcp/`.

---

## Steps

### Step 1: Install the MCP SDK

```bash
npm install @modelcontextprotocol/sdk
```

### Step 2: Copy the MCP Adapter

Copy `templates/mcp-adapter.ts` to `wrapex-output/commands/adapters/mcp-adapter.ts`.

### Step 3: Create the MCP Server

Create `wrapex-output/commands/mcp/server.ts`:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerCommandsAsMcpTools } from '../adapters/mcp-adapter';
import { registry } from '../index';

// CONFIGURE: Import and register your command definitions
import '../definitions/index';

// Create the MCP server
const server = new McpServer({
  name: 'my-app-commands',      // CONFIGURE: Your app's name
  version: '1.0.0',             // CONFIGURE: Version
});

// Register all schema-bearing commands as MCP tools
const toolCount = registerCommandsAsMcpTools(registry, server, {
  // CONFIGURE: Optional filters
  // filterTags: ['mcp-exposed'],
  // namePrefix: 'myapp_',
});

console.error(`[wrapex-mcp] Registered ${toolCount} command tools.`);

// Start the server on stdio transport
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[wrapex-mcp] MCP server running on stdio.');
}

main().catch((err) => {
  console.error('[wrapex-mcp] Fatal error:', err);
  process.exit(1);
});
```

### Step 4: Add a Run Script

Add to `package.json`:

```json
{
  "scripts": {
    "mcp-server": "tsx wrapex-output/commands/mcp/server.ts"
  }
}
```

Or for compiled output:

```json
{
  "scripts": {
    "mcp-server": "node dist/wrapex-output/commands/mcp/server.js"
  }
}
```

### Step 5: Configure for Claude Desktop

Add to Claude Desktop's config file (`~/.config/claude/claude_desktop_config.json` on Linux, `~/Library/Application Support/Claude/claude_desktop_config.json` on Mac):

```json
{
  "mcpServers": {
    "my-app": {
      "command": "npm",
      "args": ["run", "mcp-server"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

### Step 6: Test with MCP Inspector

```bash
npx @modelcontextprotocol/inspector npm run mcp-server
```

Verify:
- `tools/list` returns all schema-bearing commands
- Each tool has `name`, `description`, and `inputSchema`
- `tools/call` with valid params executes the command
- `tools/call` with invalid params returns an error

---

## Architecture Note

The MCP server runs as a separate process (stdio transport). It needs access to your app's state to execute commands. There are two approaches:

1. **In-process**: The MCP server runs inside your app's Node.js process (e.g., as a Next.js API route). Commands have direct access to stores.

2. **Out-of-process**: The MCP server runs separately and communicates with your app via HTTP/WebSocket. Commands make API calls to your app.

For development, start with in-process. For production, consider out-of-process for isolation.

---

## Validation Checklist

- [ ] MCP SDK is installed
- [ ] MCP server starts without errors
- [ ] `tools/list` returns all schema-bearing commands
- [ ] Tool names are MCP-safe (no dots, only `[a-zA-Z0-9_-]`)
- [ ] `tools/call` executes commands through the registry pipeline
- [ ] Invalid params are rejected with clear error messages
- [ ] MCP Inspector shows all tools correctly
