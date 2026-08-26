/**
 * Pure probe grading — no network, no imports with runtime side effects.
 *
 * Separated from acp.ts so the rules that turn an agent's behavior into an
 * incident are unit-testable on their own. This is the function that decides
 * what Precedent will remember about a counterparty, so it gets tests.
 */

import type { ProbeOutcome } from "./engine";

/** The SLA a probe is graded against. Deviations become breach severity. */
export type ProbeSpec = {
  keyword: string;
  budgetUsdc: number;
  deadlineMs: number;
  /** Validates the deliverable; false => "malformed". */
  accept: (deliverable: string) => boolean;
};

export type ProbeObservation = {
  deliverable?: string;
  elapsedMs: number;
  quotedUsdc: number;
  invoicedUsdc: number;
};

/**
 * Order matters: taking payment and vanishing is worse than billing over quote,
 * which is worse than shipping garbage. First match wins.
 */
export function classify(spec: ProbeSpec, result: ProbeObservation): ProbeOutcome {
  if (result.deliverable === undefined) return "ghosted";
  if (result.invoicedUsdc > result.quotedUsdc) return "price_drift";
  if (!spec.accept(result.deliverable)) return "malformed";
  if (result.elapsedMs > spec.deadlineMs) return "delivered_late";
  return "delivered";
}
