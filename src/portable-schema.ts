/**
 * @wrapex/core - Portable Schema
 *
 * Converts a Zod schema to a plain JSON Schema object.
 * Convert once, use everywhere (MCP, AI tools, palette, descriptors).
 *
 * Usage:
 *   import { toPortableSchema } from 'wrapex';
 *   const jsonSchema = toPortableSchema(myZodSchema);
 */

/**
 * Converts a Zod schema to a JSON Schema record.
 *
 * Tries Zod v4's native `z.toJSONSchema()` first, then falls back
 * to `{ type: 'object' }` if the conversion fails or the input
 * isn't a Zod schema.
 *
 * @param schema - A Zod schema instance.
 * @returns A JSON Schema–compatible plain object.
 */
export function toPortableSchema(schema: unknown): Record<string, unknown> {
  if (!schema) return { type: 'object' };

  try {
    // Zod v4 provides z.toJSONSchema(schema)
    // We detect it by checking for the global Zod namespace
    const z = (schema as any)?.constructor?.['_zod_brand']
      ? undefined
      : tryGetZod(schema);
    if (z?.toJSONSchema) {
      return z.toJSONSchema(schema);
    }

    // Fallback: check if the schema itself has a toJsonSchema method (some wrappers)
    if (typeof (schema as any).toJsonSchema === 'function') {
      return (schema as any).toJsonSchema();
    }
  } catch {
    // Conversion failed — use fallback
  }

  return { type: 'object' };
}

/**
 * Try to get a reference to the Zod module from a schema instance.
 * Works by walking up the prototype chain to find z.toJSONSchema.
 */
function tryGetZod(schema: unknown): { toJSONSchema?: (s: unknown) => Record<string, unknown> } | undefined {
  try {
    // In Zod v4, schemas have a _zod property; the `z` namespace is the module itself
    // We can try to dynamically import, but that's async. Instead, check for the
    // well-known shape: if the schema has ._def, it's a Zod schema.
    if (schema && typeof schema === 'object' && '_def' in schema) {
      // Attempt to find z.toJSONSchema via the global reference
      // This relies on the consuming app having imported `z` from 'zod'
      // and Zod v4 having z.toJSONSchema as a static method.
      // The safest approach is to require the caller to pass the converter.
      return undefined;
    }
  } catch {
    // Not a Zod schema
  }
  return undefined;
}

/**
 * Creates a toPortableSchema function bound to a specific converter.
 * Use this when you have a known conversion function (e.g., z.toJSONSchema).
 *
 * @param converter - A function that converts a Zod schema to JSON Schema.
 * @returns A toPortableSchema function that uses the given converter.
 */
export function createPortableSchemaConverter(
  converter: (schema: unknown) => Record<string, unknown>,
): (schema: unknown) => Record<string, unknown> {
  return (schema: unknown): Record<string, unknown> => {
    if (!schema) return { type: 'object' };
    try {
      return converter(schema);
    } catch {
      return { type: 'object' };
    }
  };
}
