/** Build a probe spec from an agent's OWN published contract. */

import type { ProbeSpec } from "./probe-grading";

export type JsonSchema = {
  type?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
};

export type AcpOffering = {
  name: string;
  priceValue: number | string;
  slaMinutes: number;
  deliverable?: JsonSchema | null;
  requirements?: JsonSchema | null;
};

/** Is this deliverable an actual JSON Schema, or just a sentence describing one? */
export function isJsonSchema(d: unknown): d is JsonSchema {
  if (!d || typeof d !== "object" || Array.isArray(d)) return false;
  const o = d as Record<string, unknown>;
  return typeof o.type === "string" || typeof o.properties === "object";
}

export function matchesSchema(value: unknown, schema: JsonSchema | null | undefined): boolean {
  if (!schema || !schema.type) return true; // no declared constraint

  switch (schema.type) {
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
      const obj = value as Record<string, unknown>;
      for (const key of schema.required ?? []) {
        if (!(key in obj)) return false;
      }
      for (const [key, sub] of Object.entries(schema.properties ?? {})) {
        if (key in obj && !matchesSchema(obj[key], sub)) return false;
      }
      return true;
    }
    case "array":
      return Array.isArray(value) && value.every((v) => matchesSchema(v, schema.items));
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "integer":
      return typeof value === "number" && Number.isInteger(value);
    case "boolean":
      return typeof value === "boolean";
    case "null":
      return value === null;
    default:
      return true; // unknown keyword: do not manufacture a breach
  }
}

/** A deliverable arrives as a string; it counts only if it parses AND conforms. */
export function acceptsDeliverable(schema: unknown) {
  return (deliverable: string): boolean => {
    // prose or absent: the only honest check left is "did anything arrive"
    if (!isJsonSchema(schema) || !schema.type) return deliverable.trim().length > 0;
    let parsed: unknown;
    try {
      parsed = JSON.parse(deliverable);
    } catch {
      return false;
    }
    return matchesSchema(parsed, schema);
  };
}

/** Turn a live offering into the spec its provider will be graded against. */
export function specFromOffering(offering: AcpOffering): ProbeSpec {
  return {
    keyword: offering.name,
    budgetUsdc: Number(offering.priceValue),
    deadlineMs: Math.max(1, Number(offering.slaMinutes)) * 60_000,
    accept: acceptsDeliverable(offering.deliverable),
  };
}
