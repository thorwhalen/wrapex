# Skill 09: Wire AI Tools — Expose Commands as AI-Callable Tools

## Goal

Expose registered commands (those with Zod schemas) as AI-callable tools using the Vercel AI SDK or Anthropic SDK. This lets an AI assistant control the app by calling commands through the same registry pipeline.

---

## Prerequisites

- Skill 03 (Scaffold) — registry exists
- Skill 05 (Enrich) — commands have Zod schemas and descriptions
- Vercel AI SDK (`ai`) or Anthropic SDK installed

## Output

An AI tools adapter and integration module in `wrapex-output/commands/adapters/`.

---

## Steps

### Step 1: Copy the AI Tools Adapter

Copy `templates/ai-tools-adapter.ts` to `wrapex-output/commands/adapters/ai-tools-adapter.ts`.

### Step 2A: Integrate with Vercel AI SDK

```typescript
// wrapex-output/commands/integrations/ai-tools.ts
import { toVercelAiTools } from '../adapters/ai-tools-adapter';
import { registry } from '../index';

/**
 * Returns all schema-bearing commands as Vercel AI SDK tool definitions.
 * Pass to generateText() or streamText():
 *
 *   const tools = getAiTools();
 *   const result = await generateText({ model, tools, prompt });
 */
export function getAiTools() {
  return toVercelAiTools(registry, {
    // CONFIGURE: Only expose commands tagged for AI use
    // filterTags: ['ai-exposed'],
  });
}
```

Usage in your AI chat handler:

```typescript
import { generateText } from 'ai';
import { getAiTools } from '../wrapex-output/commands/integrations/ai-tools';

const result = await generateText({
  model: yourModel,
  tools: getAiTools(),
  prompt: userMessage,
  system: 'You are an assistant that can control the application using tools.',
});
```

### Step 2B: Integrate with Anthropic SDK

```typescript
import { toAnthropicTools, executeAiToolCall } from '../adapters/ai-tools-adapter';
import { z } from 'zod';
import { registry } from '../index';

// Convert Zod schemas to JSON Schema for Anthropic API
const toJsonSchema = (schema: unknown) => z.toJSONSchema(schema as any);

const tools = toAnthropicTools(registry, toJsonSchema, {
  // filterTags: ['ai-exposed'],
});

// Pass to Anthropic messages API:
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  tools,
  messages: [{ role: 'user', content: userMessage }],
});

// Handle tool_use blocks in the response:
for (const block of response.content) {
  if (block.type === 'tool_use') {
    const result = await executeAiToolCall(registry, block.name, block.input);
    // Feed result back to the model as tool_result
  }
}
```

### Step 3: Add System Prompt Context

Help the AI understand what tools are available and when to use them:

```typescript
function buildSystemPrompt(): string {
  const commands = registry.listAvailable()
    .filter(cmd => cmd.schema)
    .map(cmd => `- ${cmd.id}: ${cmd.description ?? cmd.label}`)
    .join('\n');

  return `You are an AI assistant that can control the application.

Available commands:
${commands}

Use these tools to help the user. Always confirm destructive operations before executing.`;
}
```

### Step 4: Test AI Tool Execution

Verify the round-trip:

1. Call `getAiTools()` — should return a non-empty object.
2. Each tool should have `description`, `parameters` (Zod schema), and `execute`.
3. Calling `execute` with valid params should go through the registry pipeline.
4. The `source` in telemetry events should be `'ai'`.

---

## What You Get

After wiring AI tools:
- The AI can execute any schema-bearing command
- All commands go through the same middleware (validation, telemetry, error handling)
- The AI can only call commands it has schemas for (safe by construction)
- Telemetry tracks AI-initiated vs. user-initiated command usage
- Adding new commands to the registry automatically exposes them to the AI

---

## Validation Checklist

- [ ] `getAiTools()` returns tools for all schema-bearing commands
- [ ] Tool descriptions match command descriptions
- [ ] Tool parameters match Zod schemas
- [ ] Executing a tool goes through the full middleware pipeline
- [ ] Telemetry events show `source: 'ai'`
- [ ] Invalid parameters are rejected by the validation middleware
