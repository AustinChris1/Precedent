/** ACP registry client + probe target selection. */

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

/** How recently the registry saw this agent. */
export type Liveness = "active" | "stale" | "unknown";

export function liveness(lastActiveAt: string | null | undefined, now = Date.now()): Liveness {
  if (!lastActiveAt) return "unknown";
  const t = Date.parse(lastActiveAt);
  if (Number.isNaN(t)) return "unknown";
  // a sentinel far in the future is a placeholder, not a heartbeat
  if (t > now + 86_400_000) return "unknown";
  return now - t <= 60 * 86_400_000 ? "active" : "stale";
}

/** How strictly an offering can be graded. */
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
  /** Registry rating, if the agent has one at all. */
  rating: number | null;
  liveness: Liveness;
  spec: ProbeSpec;
};

/** Upstream outages get their own error type so their 500 does not read as our bug. */
export class RegistryUnavailableError extends Error {
  constructor(readonly status: number) {
    super(
      `The Virtuals ACP registry is not responding (it returned ${status}). ` +
        `This is their API, not Precedent, try again shortly.`,
    );
    this.name = "RegistryUnavailableError";
  }
}

const RETRY_DELAYS_MS = [400, 1200];

export async function searchAgents(query: string, topK = 100): Promise<AcpAgentRecord[]> {
  let lastStatus = 0;

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${REGISTRY}?query=${encodeURIComponent(query)}&topK=${topK}`);
    } catch {
      lastStatus = 0; // network-level failure; treat as upstream and retry
      await sleep(RETRY_DELAYS_MS[attempt] ?? 0);
      continue;
    }

    if (res.ok) {
      const body = (await res.json()) as { data?: AcpAgentRecord[] };
      return body.data ?? [];
    }

    lastStatus = res.status;
    // 4xx means we asked wrongly, retrying will not help
    if (res.status < 500) break;
    await sleep(RETRY_DELAYS_MS[attempt] ?? 0);
  }

  throw new RegistryUnavailableError(lastStatus);
}

const sleep = (ms: number) => (ms > 0 ? new Promise((r) => setTimeout(r, ms)) : Promise.resolve());

/** Fallback: the public ACP directory. */
const DIRECTORY = "https://acpx.virtuals.io/api/agents";

type DirectoryOffering = { name?: string; price?: number; priceUsd?: number };

export type DirectoryAgent = {
  id: string;
  name: string;
  walletAddress: string;
  cluster: string | null;
  rating: number | null;
  lastActiveAt: string | null;
  offeringCount: number;
  cheapestUsd: number | null;
};

export async function searchDirectory(query: string, limit = 24): Promise<DirectoryAgent[]> {
  const params = new URLSearchParams();
  params.set("pagination[pageSize]", String(limit));
  params.set("pagination[page]", "1");
  if (query.trim()) params.set("filters[name][$containsi]", query.trim());

  const res = await fetch(`${DIRECTORY}?${params}`, {
    headers: { origin: "https://app.virtuals.io" },
  });
  if (!res.ok) throw new RegistryUnavailableError(res.status);

  const body = (await res.json()) as { data?: Record<string, unknown>[] };
  return (body.data ?? []).map((r) => {
    const offerings = (r.offerings as DirectoryOffering[] | undefined) ?? [];
    const prices = offerings
      .map((o) => Number(o.priceUsd ?? o.price))
      .filter((n) => Number.isFinite(n) && n > 0);
    return {
      id: String(r.id ?? r.documentId ?? ""),
      name: String(r.name ?? "unnamed"),
      walletAddress: String(r.walletAddress ?? ""),
      cluster: (r.cluster as string | null) ?? null,
      rating: (r.rating as number | null) ?? null,
      lastActiveAt: (r.lastActiveAt as string | null) ?? null,
      offeringCount: offerings.length,
      cheapestUsd: prices.length ? Math.min(...prices) : null,
    };
  });
}

export type SelectionOptions = {
  /** Skip anything pricier than this. */
  maxPriceUsdc?: number;
  /** Skip long SLAs: a probe must resolve inside the build window. */
  maxSlaMinutes?: number;
  perCategory?: number;
  /** Agent ids already claimed by another category, so coverage stays wide. */
  exclude?: Set<string>;
};

/** Pick probe targets for one category. */
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
      // only offerings publishing a REAL schema, prose is not a contract
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
