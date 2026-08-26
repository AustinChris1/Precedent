import { NextResponse } from "next/server";
import { searchAgents, selectTargets, estimateCost, liveness, gradeLevel } from "@/lib/registry";
import {
  PROBE_CATEGORIES,
  AGENTS_PER_CATEGORY,
  CONSISTENCY_REPEATS,
  MAX_PRICE_USDC,
  MAX_SLA_MINUTES,
  type ProbeCategory,
} from "@/lib/probe-specs";

/**
 * Live ACP registry access. `/agents/search` is public, so browsing real
 * counterparties needs no credentials — only placing jobs does.
 *
 *   GET /api/registry?q=data          → raw search
 *   GET /api/registry?plan=1          → the probe plan with its true cost
 */
export async function GET(req: Request) {
  const url = new URL(req.url);

  try {
    if (url.searchParams.get("plan")) {
      const claimed = new Set<string>();
      const plan: Record<string, unknown> = {};
      let totalCost = 0;
      let totalJobs = 0;

      for (const [category, keywords] of Object.entries(PROBE_CATEGORIES)) {
        const targets = await selectTargets([...keywords], {
          perCategory: AGENTS_PER_CATEGORY,
          maxPriceUsdc: MAX_PRICE_USDC,
          maxSlaMinutes: MAX_SLA_MINUTES,
          exclude: claimed,
        });
        for (const t of targets) claimed.add(t.agentId);
        const cost = estimateCost(targets, CONSISTENCY_REPEATS);
        totalCost += cost;
        totalJobs += targets.length * CONSISTENCY_REPEATS;
        plan[category as ProbeCategory] = {
          cost,
          targets: targets.map(({ spec: _spec, ...rest }) => rest),
        };
      }

      return NextResponse.json({
        plan,
        totalCost,
        totalJobs,
        repeats: CONSISTENCY_REPEATS,
      });
    }

    const q = url.searchParams.get("q");
    if (!q) return NextResponse.json({ error: "q is required" }, { status: 422 });

    const agents = await searchAgents(q, Number(url.searchParams.get("topK") ?? 24));
    return NextResponse.json({
      agents: agents.map((a) => {
        const offerings = (a.offerings ?? []).map((o) => ({
          name: o.name,
          priceValue: Number(o.priceValue),
          slaMinutes: Number(o.slaMinutes),
          // "strict" only when a real JSON Schema is published, not prose
          grade: gradeLevel(o),
        }));
        return {
          id: a.id,
          name: a.name,
          walletAddress: a.walletAddress,
          cluster: a.cluster,
          rating: a.rating,
          liveness: liveness(a.lastActiveAt),
          offerings,
          strictCount: offerings.filter((o) => o.grade === "strict").length,
          probeableCount: offerings.filter((o) => o.grade !== "none").length,
        };
      }),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }
}
