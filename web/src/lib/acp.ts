/** Virtuals ACP integration (verified stack #2), the probe runner. */

import { gradeProbe, type ProbeOutcome } from "./engine.ts";
import { classify, type ProbeObservation, type ProbeSpec } from "./probe-grading.ts";

export { classify, type ProbeObservation, type ProbeSpec };

export type ProbeResult = {
  agentId: string;
  outcome: ProbeOutcome;
  note: string;
  jobRef: string;
};

/** Grade an observed probe and persist it as an incident. */
export async function recordProbe(
  agentId: string,
  spec: ProbeSpec,
  observation: ProbeObservation,
  jobRef: string,
) {
  const outcome = classify(spec, observation);
  const note = describe(outcome, spec, observation);
  await gradeProbe(agentId, outcome, note, jobRef);
  return { agentId, outcome, note, jobRef } satisfies ProbeResult;
}

/** Human-readable evidence stored with the incident and quoted back in decisions. */
function describe(outcome: ProbeOutcome, spec: ProbeSpec, o: ProbeObservation): string {
  switch (outcome) {
    case "ghosted":
      return `no deliverable after ${Math.round(o.elapsedMs / 1000)}s on "${spec.keyword}"`;
    case "price_drift":
      return `quoted ${o.quotedUsdc} USDC, invoiced ${o.invoicedUsdc}`;
    case "malformed":
      return `deliverable failed spec check on "${spec.keyword}"`;
    case "delivered_late":
      return `delivered ${Math.round((o.elapsedMs - spec.deadlineMs) / 1000)}s past deadline`;
    default:
      return `delivered on spec in ${Math.round(o.elapsedMs / 1000)}s`;
  }
}
