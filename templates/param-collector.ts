/**
 * @wrapex/templates - Parameter Collector Utilities
 *
 * Pure functions for schema introspection, type coercion, and collection
 * pattern selection. No React or UI framework dependency — these utilities
 * support any palette implementation.
 *
 * Usage:
 *   Copy this file to wrapex-output/commands/consumers/param-collector.ts
 *   and adapt the CONFIGURE sections.
 *
 * See skills/13-wire-palette-params.md for integration instructions.
 */

// CONFIGURE: Adjust import path if your project re-exports Zod differently
import { z } from 'zod';

// ── Types ──────────────────────────────────────────────────────────────────

export type FieldType = 'string' | 'number' | 'boolean' | 'enum' | 'json';

export interface FieldDescriptor {
  /** Property name in the schema (e.g., 'level', 'column'). */
  name: string;
  /** Classified field type for UI rendering. */
  type: FieldType;
  /** Whether the field is required (not optional, no default). */
  required: boolean;
  /** Human-readable description (from .describe() or fallback to name). */
  description: string;
  /** Default value if the field has one. */
  defaultValue?: unknown;
  /** Enum options for 'enum' type fields. */
  enumValues?: string[];
  /** Validation constraints extracted from the schema. */
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  /** The raw Zod schema for this field (useful for safeParse). */
  zodSchema: z.ZodTypeAny;
}

export type CollectionPattern = 'immediate' | 'inline' | 'form' | 'delegate';

// CONFIGURE: If your command definition supports paletteHint, define the shape here.
export interface PaletteHint {
  type: 'focus-panel' | 'inline-input';
  panel?: string;
  section?: string;
  livePreview?: boolean;
}

// Minimal command shape — adjust to match your defineCommand() output.
export interface CommandLike {
  id: string;
  schema?: z.ZodTypeAny;
  paletteHint?: PaletteHint;
}

// ── Detection ──────────────────────────────────────────────────────────────

/**
 * Returns true if the command can be executed without collecting parameters.
 *
 * A command is parameter-free if:
 * - It has no schema, OR
 * - Its schema is a ZodObject with zero required fields
 *   (all fields are optional or have defaults)
 */
export function isParameterFree(schema?: z.ZodTypeAny): boolean {
  if (!schema) return true;

  // Unwrap ZodEffects (preprocess, refine, transform)
  const unwrapped = unwrapSchema(schema);

  if (!(unwrapped instanceof z.ZodObject)) return false;

  const shape = unwrapped.shape;
  const keys = Object.keys(shape);
  if (keys.length === 0) return true;

  // Check if every field is optional or has a default
  return keys.every((key) => {
    const fieldSchema = shape[key];
    return isFieldOptional(fieldSchema);
  });
}

// ── Schema Introspection ───────────────────────────────────────────────────

/**
 * Walk a ZodObject's shape and return a FieldDescriptor for each property.
 * Fields are returned in schema definition order.
 */
export function introspectSchema(schema: z.ZodTypeAny): FieldDescriptor[] {
  const unwrapped = unwrapSchema(schema);
  if (!(unwrapped instanceof z.ZodObject)) {
    return [];
  }

  const shape = unwrapped.shape as Record<string, z.ZodTypeAny>;
  return Object.entries(shape).map(([name, fieldSchema]) =>
    describeField(name, fieldSchema),
  );
}

/**
 * Build a params object pre-filled with default values for optional fields.
 * Required fields without defaults are omitted (user must supply them).
 */
export function buildDefaultParams(
  fields: FieldDescriptor[],
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.defaultValue !== undefined) {
      params[field.name] = field.defaultValue;
    }
  }
  return params;
}

// ── Pattern Selection ──────────────────────────────────────────────────────

/**
 * Determine which collection pattern the palette should use for a command.
 *
 * Decision tree (from parameterized_command_palette_guide.md §5):
 *   paletteHint 'focus-panel'?  →  'delegate'
 *   No required params?         →  'immediate'
 *   Single required param?      →  'inline'
 *   Multiple params?            →  'form'
 */
export function selectCollectionPattern(command: CommandLike): CollectionPattern {
  if (command.paletteHint?.type === 'focus-panel') return 'delegate';
  if (isParameterFree(command.schema)) return 'immediate';

  const fields = introspectSchema(command.schema!);
  const requiredFields = fields.filter((f) => f.required);

  if (requiredFields.length === 0) return 'immediate';
  if (requiredFields.length === 1 && fields.length <= 2) return 'inline';
  return 'form';
}

// ── Type Coercion ──────────────────────────────────────────────────────────

/**
 * Convert a raw string value (from text input) to the type expected by a Zod schema.
 *
 * Rules:
 * - ZodNumber → parseFloat(raw)
 * - ZodBoolean → raw === 'true'
 * - ZodEnum → passthrough (string)
 * - ZodString → passthrough
 * - ZodArray / ZodObject / ZodRecord → JSON.parse(raw)
 * - ZodOptional / ZodDefault → recurse into inner schema
 */
export function coerceValue(raw: string, schema: z.ZodTypeAny): unknown {
  const inner = unwrapOptional(schema);

  if (raw === '' && isFieldOptional(schema)) return undefined;

  if (inner instanceof z.ZodNumber) {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n; // Return raw string so Zod can produce a clear error
  }
  if (inner instanceof z.ZodBoolean) {
    return raw === 'true' || raw === '1';
  }
  if (inner instanceof z.ZodEnum) {
    return raw; // Passthrough — enum validation handles correctness
  }
  if (inner instanceof z.ZodString) {
    return raw;
  }
  // Complex types: attempt JSON parse
  if (
    inner instanceof z.ZodArray ||
    inner instanceof z.ZodObject ||
    inner instanceof z.ZodRecord ||
    inner instanceof z.ZodTuple ||
    inner instanceof z.ZodUnion
  ) {
    try {
      return JSON.parse(raw);
    } catch {
      return raw; // Return raw so Zod can produce a type error
    }
  }
  return raw;
}

// ── Internal Helpers ───────────────────────────────────────────────────────

/** Unwrap ZodEffects (preprocess, refine, transform) to get the underlying schema. */
function unwrapSchema(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodEffects) {
    return unwrapSchema(schema.innerType());
  }
  return schema;
}

/** Unwrap ZodOptional and ZodDefault to get the inner schema. */
function unwrapOptional(schema: z.ZodTypeAny): z.ZodTypeAny {
  if (schema instanceof z.ZodOptional) {
    return unwrapOptional(schema.unwrap());
  }
  if (schema instanceof z.ZodDefault) {
    return unwrapOptional(schema.removeDefault());
  }
  if (schema instanceof z.ZodEffects) {
    return unwrapOptional(schema.innerType());
  }
  return schema;
}

/** Check if a field schema is optional (has ZodOptional or ZodDefault wrapper). */
function isFieldOptional(schema: z.ZodTypeAny): boolean {
  if (schema instanceof z.ZodOptional) return true;
  if (schema instanceof z.ZodDefault) return true;
  if (schema instanceof z.ZodEffects) return isFieldOptional(schema.innerType());
  return false;
}

/** Classify a Zod schema into a FieldType for UI rendering. */
function classifyFieldType(schema: z.ZodTypeAny): FieldType {
  const inner = unwrapOptional(schema);
  if (inner instanceof z.ZodNumber) return 'number';
  if (inner instanceof z.ZodBoolean) return 'boolean';
  if (inner instanceof z.ZodEnum) return 'enum';
  if (inner instanceof z.ZodString) return 'string';
  // Everything else (array, object, record, union, tuple) → JSON textarea
  return 'json';
}

/** Extract enum values from a ZodEnum schema. */
function extractEnumValues(schema: z.ZodTypeAny): string[] | undefined {
  const inner = unwrapOptional(schema);
  if (inner instanceof z.ZodEnum) {
    return inner.options as string[];
  }
  return undefined;
}

/** Extract numeric validation constraints. */
function extractValidation(
  schema: z.ZodTypeAny,
): FieldDescriptor['validation'] {
  const inner = unwrapOptional(schema);
  if (inner instanceof z.ZodNumber) {
    const checks = (inner as any)._def.checks as Array<{
      kind: string;
      value?: number;
    }>;
    if (!checks) return undefined;
    const validation: FieldDescriptor['validation'] = {};
    for (const check of checks) {
      if (check.kind === 'min') validation.min = check.value;
      if (check.kind === 'max') validation.max = check.value;
    }
    return Object.keys(validation).length > 0 ? validation : undefined;
  }
  return undefined;
}

/** Extract default value from a ZodDefault schema. */
function extractDefault(schema: z.ZodTypeAny): unknown | undefined {
  if (schema instanceof z.ZodDefault) {
    return schema._def.defaultValue();
  }
  if (schema instanceof z.ZodOptional) {
    return undefined;
  }
  return undefined;
}

/** Build a FieldDescriptor from a field name and its Zod schema. */
function describeField(name: string, schema: z.ZodTypeAny): FieldDescriptor {
  return {
    name,
    type: classifyFieldType(schema),
    required: !isFieldOptional(schema),
    description: schema.description ?? name,
    defaultValue: extractDefault(schema),
    enumValues: extractEnumValues(schema),
    validation: extractValidation(schema),
    zodSchema: unwrapOptional(schema),
  };
}
