"use client";

import { useEffect, useState } from "react";
import { Check, FlaskConical, ScanLine, X } from "lucide-react";
import { engine, api } from "@/lib/client";
import type { ProbeOutcome } from "@/lib/engine";
import { Button, Card, ErrorNote, Field, Input, Select, Textarea } from "@/components/ui";

const OUTCOMES: ProbeOutcome[] = [
  "delivered",
  "delivered_late",
  "malformed",
  "partial",
  "ghosted",
  "price_drift",
];

const SAMPLE_SCHEMA = `{
  "type": "object",
  "properties": { "result": { "type": "object" } }
}`;

type ClassifyResult = {
  outcome: ProbeOutcome;
  checks: {
    delivered: boolean;
    schemaConforms: boolean | null;
    withinSla: boolean;
    priceHonored: boolean;
  };
};

/** Grade a deliverable against a published contract — the rule, run live. */
function Grader() {
  const [deliverable, setDeliverable] = useState('{"result": {"price": 101.2}}');
  const [schema, setSchema] = useState(SAMPLE_SCHEMA);
  const [slaMinutes, setSla] = useState("60");
  const [elapsedMin, setElapsed] = useState("30");
  const [quoted, setQuoted] = useState("2");
  const [invoiced, setInvoiced] = useState("2");
  const [ghosted, setGhosted] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      let parsedSchema: unknown = null;
      if (schema.trim()) {
        try {
          parsedSchema = JSON.parse(schema);
        } catch {
          throw new Error("the schema itself is not valid JSON");
        }
      }
      setResult(
        await api<ClassifyResult>("/api/classify", {
          method: "POST",
          body: JSON.stringify({
            deliverable,
            schema: parsedSchema,
            slaMinutes: Number(slaMinutes),
            elapsedMs: Number(elapsedMin) * 60_000,
            quotedUsdc: Number(quoted),
            invoicedUsdc: Number(invoiced),
            ghosted,
          }),
        }),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const CHECKS: [string, boolean | null][] = result
    ? [
        ["Delivered at all", result.checks.delivered],
        ["Matches its own schema", result.checks.schemaConforms],
        ["Within its own SLA", result.checks.withinSla],
        ["Honored its own quote", result.checks.priceHonored],
      ]
    : [];

  return (
    <Card
      title="Grade against the published contract"
      hint="A breach is never our opinion — it is the agent failing the terms it published itself."
      icon={<ScanLine size={18} />}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Field label="Deliverable returned">
          <Textarea rows={5} value={deliverable} onChange={(e) => setDeliverable(e.target.value)} />
        </Field>
        <Field label="Offering's declared deliverable schema">
          <Textarea rows={5} value={schema} onChange={(e) => setSchema(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Field label="SLA (min)">
          <Input type="number" value={slaMinutes} onChange={(e) => setSla(e.target.value)} />
        </Field>
        <Field label="Took (min)">
          <Input type="number" value={elapsedMin} onChange={(e) => setElapsed(e.target.value)} />
        </Field>
        <Field label="Quoted">
          <Input type="number" step="any" value={quoted} onChange={(e) => setQuoted(e.target.value)} />
        </Field>
        <Field label="Invoiced">
          <Input type="number" step="any" value={invoiced} onChange={(e) => setInvoiced(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-fg-muted">
          <input
            type="checkbox"
            checked={ghosted}
            onChange={(e) => setGhosted(e.target.checked)}
            className="accent-[var(--brand)]"
          />
          Never delivered (ghosted)
        </label>
        <Button onClick={run} loading={loading}>
          Grade it
        </Button>
      </div>

      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}

      {result && (
        <div className="mt-5 rounded-xl well p-4">
          <p className="font-mono text-sm">
            verdict:{" "}
            <span
              className={
                result.outcome === "delivered"
                  ? "text-standard"
                  : result.outcome === "delivered_late"
                    ? "text-guarded"
                    : "text-refuse"
              }
            >
              {result.outcome}
            </span>
          </p>
          <ul className="mt-3 space-y-1.5">
            {CHECKS.map(([label, ok]) => (
              <li key={label} className="flex items-center gap-2 text-sm text-fg-muted">
                {ok === null ? (
                  <span className="text-fg-faint">—</span>
                ) : ok ? (
                  <Check size={14} className="text-standard" />
                ) : (
                  <X size={14} className="text-refuse" />
                )}
                {label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Write a probe outcome into memory. */
function Recorder({
  onDone,
  picked,
}: {
  onDone?: () => void;
  picked?: { id: string; name: string; walletAddress: string } | null;
}) {
  const [agentId, setAgentId] = useState(picked?.walletAddress ?? "");
  const [outcome, setOutcome] = useState<ProbeOutcome>("malformed");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (picked?.walletAddress) setAgentId(picked.walletAddress);
  }, [picked]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      // no job_ref: only the probe runner may attach one, and the engine
      // enforces that regardless of what the browser sends
      await engine.post("grade", { agent_id: agentId, outcome, note });
      setStatus(`recorded ${outcome} for ${agentId}`);
      setNote("");
      onDone?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Record a probe outcome — admin override"
      hint="Normally written by the ACP probe runner from a real job. Exposed here so the memory path is testable before live jobs land; entries made by hand carry no job reference."
      icon={<FlaskConical size={18} />}
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Agent" hint={picked ? `from the registry: ${picked.name}` : undefined}>
          <Input
            required
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            placeholder="wallet address or agent id"
          />
        </Field>
        <Field label="Outcome">
          <Select value={outcome} onChange={(e) => setOutcome(e.target.value as ProbeOutcome)}>
            {OUTCOMES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="What happened">
          <Input
            required
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="40% corrupted rows in milestone 2"
          />
        </Field>
        <Field label="Job reference" hint="Only the ACP probe runner can attach one — hand entries are stored without evidence and marked [manual entry].">
          <Input value="" disabled placeholder="probe runner only" />
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" loading={loading}>
            Write to memory
          </Button>
        </div>
      </form>

      {error && <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>}
      {status && (
        <p className="mt-4 rounded-md border border-standard/30 bg-standard/10 px-3 py-2 text-sm text-standard">
          {status}
        </p>
      )}
    </Card>
  );
}

export function ProbePanel({
  onDone,
  picked,
}: {
  onDone?: () => void;
  picked?: { id: string; name: string; walletAddress: string } | null;
}) {
  return (
    <div className="space-y-6">
      <Grader />
      <Recorder onDone={onDone} picked={picked} />
    </div>
  );
}
