import { NextResponse } from "next/server";
import { classify } from "@/lib/probe-grading";
import { acceptsDeliverable, type JsonSchema } from "@/lib/offering-spec";

/**
 * Grade a deliverable against an offering's OWN published contract.
 *
 * Pure logic, no engine and no network: this is the rule that decides whether
 * a counterparty breached, so the console lets you run it on any payload and
 * see exactly why the verdict came out the way it did.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid JSON body" }, { status: 422 });

  const {
    deliverable,
    schema,
    slaMinutes = 5,
    elapsedMs = 0,
    quotedUsdc = 0,
    invoicedUsdc = 0,
    ghosted = false,
  } = body as {
    deliverable?: string;
    schema?: JsonSchema | null;
    slaMinutes?: number;
    elapsedMs?: number;
    quotedUsdc?: number;
    invoicedUsdc?: number;
    ghosted?: boolean;
  };

  const spec = {
    keyword: "console",
    budgetUsdc: Number(quotedUsdc),
    deadlineMs: Math.max(1, Number(slaMinutes)) * 60_000,
    accept: acceptsDeliverable(schema),
  };

  const outcome = classify(spec, {
    deliverable: ghosted ? undefined : (deliverable ?? ""),
    elapsedMs: Number(elapsedMs),
    quotedUsdc: Number(quotedUsdc),
    invoicedUsdc: Number(invoicedUsdc),
  });

  const schemaOk = ghosted ? null : spec.accept(deliverable ?? "");

  return NextResponse.json({
    outcome,
    checks: {
      delivered: !ghosted,
      schemaConforms: schemaOk,
      withinSla: Number(elapsedMs) <= spec.deadlineMs,
      priceHonored: Number(invoicedUsdc) <= Number(quotedUsdc),
    },
    deadlineMs: spec.deadlineMs,
  });
}
