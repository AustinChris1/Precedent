"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, BookMarked, Eye, RefreshCw, Users } from "lucide-react";
import { engine } from "@/lib/client";
import type { AgentRow, CurationReport, Dossier } from "@/lib/engine";
import { Button, Card, Empty, ErrorNote, TrustMeter } from "@/components/ui";

export function BureauPanel({ refreshKey }: { refreshKey: number }) {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [archived, setArchived] = useState<Record<string, string>>({});
  const [watch, setWatch] = useState<string[]>([]);
  const [charter, setCharter] = useState<Record<string, unknown> | null>(null);
  const [selected, setSelected] = useState<Dossier | null>(null);
  const [report, setReport] = useState<CurationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [curating, setCurating] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, wl, ch] = await Promise.all([
        engine.get<{ agents: AgentRow[]; archived: Record<string, string> }>("agents"),
        engine.get<{ agents: string[] }>("watchlist"),
        engine.get<Record<string, unknown>>("charter"),
      ]);
      setAgents(list.agents);
      setArchived(list.archived);
      setWatch(wl.agents);
      setCharter(ch);
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function curate() {
    setCurating(true);
    setError(null);
    try {
      setReport(await engine.post<CurationReport>("curate"));
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCurating(false);
    }
  }

  async function open(agentId: string) {
    try {
      setSelected(await engine.get<Dossier>(`dossier/${encodeURIComponent(agentId)}`));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const baseline = charter?.baseline_trust as number | undefined;
  const provenance = charter?.provenance as
    | { derived_from_incidents?: number; observed_breach_rate?: number }
    | undefined;

  return (
    <div className="space-y-6">
      {error && <ErrorNote>{error}</ErrorNote>}

      <Card
        title="Dynamic storage"
        hint="Migrate dormant dossiers to ARCHIVE, rewrite the charter from journal evidence, recompute the watchlist."
        icon={<RefreshCw size={18} />}
      >
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={curate} loading={curating}>
            Run curation
          </Button>
          {baseline !== undefined && (
            <p className="text-sm text-fg-muted">
              Current baseline trust for strangers:{" "}
              <span className="font-mono text-fg">{baseline}</span>
              {provenance?.derived_from_incidents !== undefined && (
                <span className="text-fg-faint">
                  {" "}
                  · learned from {provenance.derived_from_incidents} incidents (
                  {((provenance.observed_breach_rate ?? 0) * 100).toFixed(0)}% breach rate)
                </span>
              )}
            </p>
          )}
        </div>

        {report && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Breach rate", `${(report.breach_rate * 100).toFixed(0)}%`],
              [
                "Baseline trust",
                `${report.baseline_before} → ${report.baseline_after}`,
              ],
              ["Archived", String(report.archived.length)],
              ["Watchlist", String(report.watchlist.length)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl well px-3 py-2.5">
                <p className="text-[0.68rem] uppercase tracking-[0.12em] text-fg-faint">{label}</p>
                <p className="mt-1 font-mono text-sm">{value}</p>
              </div>
            ))}
            {report.charter_changed && (
              <p className="sm:col-span-2 lg:col-span-4 text-xs text-brand-soft">
                The charter rewrote itself. Every future decision — in this session or any
                other — now uses the new rule.
              </p>
            )}
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Counterparties on file" hint="Lowest trust first." icon={<Users size={18} />}>
          {agents.length === 0 ? (
            <Empty>No dossiers yet. Record a probe outcome to open one.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {agents.map((a) => (
                <li key={a.agent_id}>
                  <button
                    onClick={() => open(a.agent_id)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-left transition hover:text-brand-soft"
                  >
                    <span className="truncate font-mono text-sm">{a.agent_id}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-fg-faint">{a.incidents} inc.</span>
                      <TrustMeter value={a.trust} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {Object.keys(archived).length > 0 && (
            <div className="mt-4 rounded-xl well px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[0.68rem] uppercase tracking-[0.12em] text-fg-faint">
                <Archive size={12} /> Archived (restored automatically on contact)
              </p>
              <p className="mt-1.5 font-mono text-xs text-fg-muted">
                {Object.keys(archived).join(", ")}
              </p>
            </div>
          )}
        </Card>

        <Card title="Dossier" hint="Every incident, oldest first." icon={<BookMarked size={18} />}>
          {!selected ? (
            <Empty>Select a counterparty to read its file.</Empty>
          ) : !selected.history ? (
            <Empty>No history on record for {selected.agent_id}.</Empty>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="truncate font-mono text-sm">{selected.agent_id}</span>
                <TrustMeter value={selected.trust} />
              </div>
              <ul className="space-y-2">
                {selected.incidents.map((inc, i) => (
                  <li
                    key={`${inc.ts}-${i}`}
                    className={`rounded-xl border-l-2 bg-white/65 backdrop-blur-sm px-3 py-2 ${
                      inc.severity < 0 ? "border-refuse/60" : "border-standard/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-xs">
                      <span className="text-fg-faint">{inc.ts.slice(0, 19).replace("T", " ")}</span>
                      <span className={inc.severity < 0 ? "text-refuse" : "text-standard"}>
                        {inc.severity > 0 ? "+" : ""}
                        {inc.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-fg-muted">{inc.note}</p>
                    {inc.job_ref && (
                      <p className="mt-1 font-mono text-[0.68rem] text-fg-faint">ref {inc.job_ref}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>

      <Card title="Watchlist" hint="Read from HOT state — a fresh session knows this without scanning." icon={<Eye size={18} />}>
        {watch.length === 0 ? (
          <Empty>Nobody on probation. Run curation after recording incidents.</Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {watch.map((a) => (
              <span
                key={a}
                className="rounded border border-restricted/35 bg-restricted/10 px-2 py-1 font-mono text-xs text-restricted"
              >
                {a}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
