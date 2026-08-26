/**
 * ACP registry client + probe target selection.
 *
 * `/agents/search` is publicly readable, so target selection needs no
 * credentials — only placing jobs does. That means the probe plan can be
 * computed and reviewed before spending anything.
 */

import { isJsonSchema, specFromOffering, type AcpOffering } from "./offering-spec.ts";
import type { ProbeSpec } from "./probe-grading.ts";

const REGISTRY = "https://api.acp.virtuals.io/agents/search";

export type AcpAgentRecord = {
  id: string;
  name: string;
  walletAddress: string;
  cluster: string | null;
  rating: number | null;
  lastActiveAt?: string | null;
  offerings?: (AcpOffering & { isHidden?: boolean })[];
};

/**
 * How recently the registry saw this agent.
 *
 * `null` means never seen; some records carry a far-future sentinel
 * (2999-12-31) which tells us nothing either. Neither is a good first probe
 * target, so both are surfaced rather than silently ranked.
 */
export type Liveness = "active" | "stale" | "unknown";

export function liveness(lastActiveAt: string | null | undefined, now = Date.now()): Liveness {
  if (!lastActiveAt) return "unknown";
  const t = Date.parse(lastActiveAt);
  if (Number.isNaN(t)) return "unknown";
  // a sentinel far in the future is a placeholder, not a heartbeat
  if (t > now + 86_400_000) return "unknown";
  return now - t <= 60 * 86_400_000 ? "active" : "stale";
}

/**
 * How strictly an offering can be graded.
 *
 *  - "strict": publishes a real JSON Schema, so a *malformed* deliverable is
 *    provable against the provider's own contract.
 *  - "basic":  priced with an SLA but only prose where a schema should be.
 *    Ghosting, lateness and price drift are still provable — three of the five
 *    breach types need no schema at all — but "wrong shape" is not.
 *  - "none":   nothing to buy, so nothing to observe.
 *
 * Only about a quarter of live offerings reach "strict", so requiring one would
 * have thrown away three quarters of the market for no gain on the breaches
 * that do not need it.
 */
export type GradeLevel = "strict" | "basic" | "none";

export function gradeLevel(o: AcpOffering & { isHidden?: boolean }): GradeLevel {
  const price = Number(o.priceValue);
  if (o.isHidden || !Number.isFinite(price) || price <= 0) return "none";
  if (!Number.isFinite(Number(o.slaMinutes))) return "none";
  return isJsonSchema(o.deliverable) ? "strict" : "basic";
}

/** Strictest grading: the provider published a schema we can check against. */
export function isGradeable(o: AcpOffering & { isHidden?: boolean }): boolean {
  return gradeLevel(o) === "strict";
}

/** Buyable at all, so ghosting / lateness / price drift are observable. */
export function isProbeable(o: AcpOffering & { isHidden?: boolean }): boolean {
  return gradeLevel(o) !== "none";
}

export type ProbeTarget = {
  agentId: string;
  agentName: string;
  walletAddress: string;
  offeringName: string;
  priceUsdc: number;
  slaMinutes: number;
  /** Registry rating, if the agent has one at all. Most do not. */
  rating: number | null;
  liveness: Liveness;
  spec: ProbeSpec;
};

export async function searchAgents(query: string, topK = 100): Promise<AcpAgentRecord[]> {
  const res = await fetch(`${REGISTRY}?query=${encodeURIComponent(query)}&topK=${topK}`);
  if (!res.ok) throw new Error(`registry search failed: ${res.status}`);
  const body = (await res.json()) as { data?: AcpAgentRecord[] };
  return body.data ?? [];
}

export type SelectionOptions = {
  /** Skip anything pricier than this. Probes are meant to be cheap. */
  maxPriceUsdc?: number;
  /** Skip long SLAs: a probe must resolve inside the build window. */
  maxSlaMinutes?: number;
  perCategory?: number;
  /** Agent ids already claimed by another category, so coverage stays wide. */
  exclude?: Set<string>;
};

/**
 * Pick probe targets for one category.
 *
 * Cheapest-first, one offering per agent, so the budget buys breadth of
 * counterparties rather than depth on a single one.
 */
export async function selectTargets(
  keywords: string[],
  opts: SelectionOptions = {},
): Promise<ProbeTarget[]> {
  const { maxPriceUsdc = 1, maxSlaMinutes = 60, perCategory = 5, exclude } = opts;

  const agents = new Map<string, AcpAgentRecord>();
  for (const keyword of keywords) {
    for (const agent of await searchAgents(keyword)) {
      if (exclude?.has(agent.id)) continue;
      agents.set(agent.id, agent);
    }
  }

  const candidates: ProbeTarget[] = [];
  for (const agent of agents.values()) {
    const usable = (agent.offerings ?? [])
      .filter((o) => !o.isHidden)
      .filter((o) => {
        const price = Number(o.priceValue);
        return Number.isFinite(price) && price > 0 && price <= maxPriceUsdc;
      })
      .filter((o) => Number.isFinite(Number(o.slaMinutes)) && Number(o.slaMinutes) <= maxSlaMinutes)
      // only offerings publishing a REAL schema — prose is not a contract
      .filter((o) => isGradeable(o))
      .sort((a, b) => Number(a.priceValue) - Number(b.priceValue));

    const cheapest = usable[0];
    if (!cheapest) continue;

    candidates.push({
      agentId: agent.id,
      agentName: agent.name,
      walletAddress: agent.walletAddress,
      offeringName: cheapest.name,
      priceUsdc: Number(cheapest.priceValue),
      slaMinutes: Number(cheapest.slaMinutes),
      rating: agent.rating ?? null,
      liveness: liveness(agent.lastActiveAt),
      spec: specFromOffering(cheapest),
    });
  }

  return candidates
    .sort((a, b) => a.priceUsdc - b.priceUsdc)
    .slice(0, perCategory);
}

export function estimateCost(targets: ProbeTarget[], repeats: number): number {
  return targets.reduce((sum, t) => sum + t.priceUsdc * repeats, 0);
}
