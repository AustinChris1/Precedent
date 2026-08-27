"use client";

import { useState } from "react";
import { Radar, Search, Star, Wallet } from "lucide-react";
import { api } from "@/lib/client";
import { Button, Card, Empty, ErrorNote, Input } from "@/components/ui";
import { MAX_PRICE_USDC, MAX_SLA_MINUTES } from "@/lib/probe-specs";

type Offering = {
  name: string;
  priceValue: number;
  slaMinutes: number;
  /** "strict" = a real JSON Schema; "basic" = priced but prose-specified */
  grade: "strict" | "basic" | "none";
};

type Agent = {
  id: string;
  name: string;
  walletAddress: string;
  cluster: string | null;
  rating: number | null;
  liveness: "active" | "stale" | "unknown";
  offerings: Offering[];
  strictCount: number;
  probeableCount: number;
  /** present only in degraded (directory) mode */
  offeringCount?: number;
  cheapestUsd?: number | null;
};

export type PickedAgent = { id: string; name: string; walletAddress: string };

type Target = {
  agentId: string;
  agentName: string;
  offeringName: string;
  priceUsdc: number;
  slaMinutes: number;
  rating: number | null;
  liveness: "active" | "stale" | "unknown";
  walletAddress: string;
};

type Plan = {
  plan: Record<string, { cost: number; targets: Target[] }>;
  totalCost: number;
  totalJobs: number;
  repeats: number;
};

export function RegistryPanel({ onPick }: { onPick?: (agent: PickedAgent) => void }) {
  const [q, setQ] = useState("data");
  const [agents, setAgents] = useState<Agent[] | null>(null);
  const [degraded, setDegraded] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState(false);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api<{ agents: Agent[]; degraded?: boolean; notice?: string }>(
        `/api/registry?q=${encodeURIComponent(q)}`,
      );
      setAgents(res.agents);
      setDegraded(res.degraded ? (res.notice ?? "Showing the public directory.") : null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function buildPlan() {
    setPlanning(true);
    setError(null);
    try {
      setPlan(await api<Plan>("/api/registry?plan=1"));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPlanning(false);
    }
  }

  const unrated = agents?.filter((a) => a.rating === null).length ?? 0;

  return (
    <div className="space-y-6">
      <Card
        title="Live ACP registry"
        hint="Real counterparties, queried from Virtuals' public registry. No credentials required to look."
        icon={<Search size={18} />}
      >
        <form onSubmit={search} className="flex gap-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="data, trading, research…" />
          <Button type="submit" loading={loading}>
            Search
          </Button>
        </form>

        {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

        {degraded && (
          <p className="mt-4 rounded-xl border border-guarded/35 bg-guarded/10 px-3 py-2.5 text-xs leading-relaxed text-guarded">
            {degraded}
          </p>
        )}

        {agents && (
          <>
            <p className="mt-4 text-sm text-fg-muted">
              {agents.length} agents ·{" "}
              <span className="text-brand-soft">{unrated} with no rating at all</span> ·{" "}
              {degraded ? (
                "contract details unavailable"
              ) : (
                <>
                  {agents.filter((a) => a.probeableCount > 0).length} probeable ·{" "}
                  {agents.filter((a) => a.strictCount > 0).length} schema-strict
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-fg-faint">
              Search is the registry&apos;s own keyword match, so some results are only loosely
              related. <em>Probeable</em> means something is actually for sale, so ghosting,
              lateness and price drift are provable. <em>Schema-strict</em> means the offering
              publishes a real JSON Schema, so a malformed deliverable is provable too, only
              about a quarter of the market does.
            </p>
            {agents.length === 0 ? (
              <div className="mt-3"><Empty>Nothing matched that term.</Empty></div>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {agents.map((a) => {
                  const cheapest = [...a.offerings]
                    .filter((o) => o.grade !== "none")
                    .sort((x, y) => x.priceValue - y.priceValue)[0];
                  const probeable = a.probeableCount > 0;
                  return (
                    <li key={a.id} className="py-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-medium">{a.name}</span>
                        <span className="flex items-center gap-3 text-xs">
                          {a.rating === null ? (
                            <span className="text-fg-faint">no rating</span>
                          ) : (
                            <span className="flex items-center gap-1 text-guarded">
                              <Star size={11} /> {a.rating}
                            </span>
                          )}
                          {probeable ? (
                            <button
                              onClick={() =>
                                onPick?.({ id: a.id, name: a.name, walletAddress: a.walletAddress })
                              }
                              className="text-brand-soft transition hover:underline"
                            >
                              use as counterparty
                            </button>
                          ) : (
                            <span
                              className="text-fg-faint"
                              title="Nothing priced is for sale here, so there is no job to place and nothing to observe."
                            >
                              not probeable
                            </span>
                          )}
                        </span>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 font-mono text-[0.68rem] text-fg-faint">
                        <Wallet size={11} /> {a.walletAddress}
                      </p>
                      <p className="mt-1 font-mono text-xs text-fg-muted">
                        {degraded ? (
                          <>
                            {a.offeringCount ?? 0} offering
                            {(a.offeringCount ?? 0) === 1 ? "" : "s"}
                            {a.cheapestUsd != null && ` · from $${a.cheapestUsd}`}
                            <span className="text-fg-faint"> · no SLA or schema in this view</span>
                          </>
                        ) : a.offerings.length === 0 ? (
                          <span className="text-fg-faint">no offerings, nothing to probe</span>
                        ) : cheapest ? (
                          <>
                            {a.offerings.length} offering{a.offerings.length === 1 ? "" : "s"} ·{" "}
                            {a.strictCount > 0 ? (
                              <span className="text-standard">
                                {a.strictCount} schema-strict
                              </span>
                            ) : (
                              <span className="text-fg-faint">prose specs only</span>
                            )}{" "}
                            · cheapest ${cheapest.priceValue} · {cheapest.slaMinutes}min SLA
                          </>
                        ) : (
                          <span className="text-fg-faint">
                            {a.offerings.length} offering{a.offerings.length === 1 ? "" : "s"}, none
                            purchasable
                          </span>
                        )}
                        {a.liveness !== "active" && (
                          <span className="text-fg-faint">
                            {" "}
                            · {a.liveness === "stale" ? "inactive 60d+" : "last seen unknown"}
                          </span>
                        )}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </Card>

      <Card
        title="Probe campaign plan"
        hint="Five agents per category, each job run twice. Costed against live prices before a cent is spent."
        icon={<Radar size={18} />}
      >
        <Button onClick={buildPlan} loading={planning} variant="ghost">
          Build the plan
        </Button>

        {plan && (
          <div className="mt-5 space-y-5">
            <p className="text-sm text-fg-muted">
              <span className="font-mono text-fg">{plan.totalJobs}</span> jobs ·{" "}
              <span className="font-mono text-fg">${plan.totalCost.toFixed(3)}</span> USDC total ·{" "}
              {plan.repeats}× per agent for consistency
            </p>
            <p className="text-xs text-fg-faint">
              The plan filters harder than the list above: ≤${MAX_PRICE_USDC}, ≤{MAX_SLA_MINUTES}min
              SLA, and a real JSON Schema, the strongest evidence, so the first campaign only
              buys that. A name in the search results may therefore be absent here.
            </p>
            {Object.entries(plan.plan).map(([category, group]) => (
              <div key={category}>
                <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-fg-faint">
                  {category} · ${group.cost.toFixed(3)}
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {group.targets.map((t) => (
                    <li
                      key={`${t.agentId}-${t.offeringName}`}
                      className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl well px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {t.agentName}
                        <span className="text-fg-faint"> :: {t.offeringName}</span>
                      </span>
                      <span className="font-mono text-xs text-fg-muted">
                        ${t.priceUsdc} · {t.slaMinutes}min ·{" "}
                        {t.rating === null ? "unrated" : `★${t.rating}`}
                        {t.liveness !== "active" && " · dormant"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
