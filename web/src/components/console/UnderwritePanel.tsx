"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Gavel, Quote } from "lucide-react";
import { engine } from "@/lib/client";
import type { Decision } from "@/lib/engine";
import { MemoryTape, ROW_DELAY } from "@/components/console/MemoryTape";
import { BandBadge, Button, Card, ErrorNote, Field, Input, TrustMeter } from "@/components/ui";

export function UnderwritePanel({
  onDone,
  picked,
}: {
  onDone?: () => void;
  picked?: { id: string; name: string; walletAddress: string } | null;
}) {
  const [agentId, setAgentId] = useState(picked?.walletAddress ?? "");
  const [amount, setAmount] = useState("1000");
  const [job, setJob] = useState("3-part data pipeline");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const reduce = useReducedMotion();
  const reads = decision?.memory_reads ?? [];


  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDecision(null);
    try {
      setDecision(
        await engine.post<Decision>("underwrite", {
          agent_id: agentId,
          amount_usdc: Number(amount),
          job_description: job,
        }),
      );
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Underwrite a job"
      hint="Ask what terms a counterparty earns. The answer comes from memory, not from the request."
      icon={<Gavel size={18} />}
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-[2fr_1fr]">
        <Field
          label="Counterparty agent"
          hint={picked ? `from the registry: ${picked.name}` : undefined}
        >
          <Input
            required
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="wallet address or agent id"
          />
        </Field>
        <Field label="Amount (USDC)">
          <Input
            type="number"
            min="0"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Job">
          <Input required value={job} onChange={(e) => setJob(e.target.value)} />
        </Field>
        <div className="flex items-end">
          <Button type="submit" loading={loading} className="w-full">
            Underwrite
          </Button>
        </div>
      </form>

      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

      {decision && (
        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          {reads.length > 0 && <MemoryTape reads={reads} />}

          <motion.div
            key={`${decision.agent_id}-${reads.length}`}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: reduce ? 0 : reads.length * ROW_DELAY + 0.25 }}
            className="space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl well px-4 py-3">
              <BandBadge band={decision.decision} />
              <TrustMeter value={decision.trust} />
            </div>

            {decision.reason && <p className="text-sm text-fg-muted">{decision.reason}</p>}

            {decision.decision !== "probe_first" && (
              <dl className="grid grid-cols-3 gap-3">
                {[
                  ["Upfront", `${decision.upfront_pct}%`],
                  ["Collateral", `${decision.collateral_pct}%`],
                  ["Penalty", `${decision.penalty_x}×`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl well px-3 py-2.5">
                    <dt className="text-[0.68rem] uppercase tracking-[0.12em] text-fg-faint">
                      {label}
                    </dt>
                    <dd className="mt-1 font-mono text-lg tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {decision.basis.length > 0 && (
              <div>
                <h3 className="flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-fg-faint">
                  <Quote size={12} /> Recalled from memory
                </h3>
                <ul className="mt-2 space-y-1.5">
                  {decision.basis.map((b, i) => (
                    <li
                      key={`${b}-${i}`}
                      className="rounded-xl border-l-2 border-brand/60 bg-white/65 backdrop-blur-sm px-3 py-2 font-mono text-xs text-fg-muted"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-fg-faint">
                  Delete the memory layer and this list is empty, with it, the terms above.
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}

    </Card>
  );
}
