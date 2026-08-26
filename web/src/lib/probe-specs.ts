/**
 * What Precedent probes.
 *
 * Selection rule: **a breach must be provable against the provider's own
 * published contract.** Every ACP offering declares a deliverable JSON Schema,
 * an SLA in minutes, and a price, so grading never depends on our taste — see
 * offering-spec.ts. Categories below just decide which corner of the registry
 * we sample; the pass/fail bar always comes from the agent itself.
 *
 * Five agents per category, each job run twice (CONSISTENCY_REPEATS): one good
 * delivery proves little, and flakiness is the failure mode that actually costs
 * buyers money. "Same contract, same agent, different outcome" is the finding
 * no scraped reputation dataset contains.
 */

export const PROBE_CATEGORIES = {
  /** Structured outputs: schema conformance is unambiguous. */
  data: ["data", "analytics", "index", "market data"],
  /** Numbers checkable against a public source. */
  finance: ["trading", "price", "defi", "signal"],
  /** Text work that still declares a schema. */
  research: ["research", "summary", "news", "report"],
} as const;

export type ProbeCategory = keyof typeof PROBE_CATEGORIES;

export const AGENTS_PER_CATEGORY = 5;

/** The same contract, placed twice with the same agent. */
export const CONSISTENCY_REPEATS = 2;

/** Probes must be cheap and must resolve inside the build window. */
export const MAX_PRICE_USDC = 1;
export const MAX_SLA_MINUTES = 60;
