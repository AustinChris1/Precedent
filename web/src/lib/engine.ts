/** Typed client for the Precedent memory engine (Python + Sibyl Memory). */

export type ProbeOutcome =
  | "delivered"
  | "delivered_late"
  | "malformed"
  | "partial"
  | "ghosted"
  | "price_drift";

export type Incident = {
  ts: string;
  kind: "breach" | "delivery";
  severity: number;
  note: string;
  job_ref: string | null;
};

export type Band = "standard" | "guarded" | "restricted" | "refuse" | "probe_first";

export type Decision = {
  agent_id: string;
  decision: Band;
  trust: number | null;
  amount_usdc?: number;
  max_amount_usdc?: number;
  upfront_pct?: number;
  collateral_pct?: number;
  penalty_x?: number;
  reason?: string;
  /** Recalled incidents that justify these terms, the load-bearing part. */
  basis: string[];
  precedents?: string[];
};

export type Dossier =
  | { agent_id: string; history: false }
  | { agent_id: string; history: true; trust: number; incidents: Incident[] };

export type CurationReport = {
  archived: string[];
  restored: string[];
  watchlist: string[];
  baseline_before: number;
  baseline_after: number;
  charter_changed: boolean;
  breach_rate: number;
  incidents_considered: number;
};

export type AgentRow = {
  agent_id: string;
  trust: number;
  incidents: number;
  last_seen: string | null;
};

export type JournalEvent = {
  id: string;
  ts: string;
  evaluated: string[] | null;
  acted: string[] | null;
  forward: string[] | null;
  extra: Record<string, unknown> | null;
};

const ENGINE_URL = process.env.ENGINE_URL ?? "http://127.0.0.1:8787";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENGINE_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(process.env.ENGINE_API_KEY ? { "x-api-key": process.env.ENGINE_API_KEY } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`engine ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Price a job against what Precedent remembers about this counterparty. */
export function underwrite(agentId: string, amountUsdc: number, jobDescription: string) {
  return call<Decision>("/underwrite", {
    method: "POST",
    body: JSON.stringify({
      agent_id: agentId,
      amount_usdc: amountUsdc,
      job_description: jobDescription,
    }),
  });
}

/** Write a probe result into memory. */
export function gradeProbe(
  agentId: string,
  outcome: ProbeOutcome,
  note: string,
  jobRef?: string,
) {
  return call<{ graded: string; outcome: ProbeOutcome }>("/grade", {
    method: "POST",
    body: JSON.stringify({ agent_id: agentId, outcome, note, job_ref: jobRef ?? null }),
  });
}

export function getDossier(agentId: string) {
  return call<Dossier>(`/dossier/${encodeURIComponent(agentId)}`);
}

/** SHA-256 of the COLD journal, anchored on Base so history is tamper-evident. */
export function getJournalDigest() {
  return call<{ journal_digest: string }>("/anchor");
}

/** Dynamic storage: migrate tiers, rewrite the charter, recompute the watchlist. */
export function runCuration() {
  return call<CurationReport>("/curate", { method: "POST" });
}

export function getWatchlist() {
  return call<{ agents: string[] }>("/watchlist");
}

export function getCharter() {
  return call<Record<string, unknown>>("/charter");
}

export function getJournal(limit = 25) {
  return call<{ events: JournalEvent[] }>(`/journal?limit=${limit}`);
}

export function listAgents() {
  return call<{ agents: AgentRow[]; archived: Record<string, string> }>("/agents");
}
