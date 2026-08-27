/** What Precedent probes. */

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
