/* Print the probe plan: who gets probed and what it costs. Spends nothing. */
import { selectTargets, estimateCost } from "../src/lib/registry.ts";
import {
  PROBE_CATEGORIES,
  AGENTS_PER_CATEGORY,
  CONSISTENCY_REPEATS,
  MAX_PRICE_USDC,
  MAX_SLA_MINUTES,
} from "../src/lib/probe-specs.ts";

let total = 0;
let jobs = 0;
let unrated = 0;
let count = 0;
/* One agent is probed for one category only, so 15 targets means 15 counterparties. */
const claimed = new Set();

for (const [category, keywords] of Object.entries(PROBE_CATEGORIES)) {
  const targets = await selectTargets([...keywords], {
    perCategory: AGENTS_PER_CATEGORY,
    maxPriceUsdc: MAX_PRICE_USDC,
    maxSlaMinutes: MAX_SLA_MINUTES,
    exclude: claimed,
  });
  for (const t of targets) claimed.add(t.agentId);
  const cost = estimateCost(targets, CONSISTENCY_REPEATS);
  total += cost;
  jobs += targets.length * CONSISTENCY_REPEATS;

  console.log(`\n${category.toUpperCase()}  (${targets.length} agents, $${cost.toFixed(3)})`);
  for (const t of targets) {
    count++;
    if (t.rating === null) unrated++;
    console.log(
      `  $${String(t.priceUsdc).padEnd(6)} ${String(t.slaMinutes).padStart(3)}min  ` +
        `${t.agentName} :: ${t.offeringName}  rating=${t.rating ?? "none"}`,
    );
  }
}

console.log(`\n${jobs} jobs across ${count} agents · estimated $${total.toFixed(3)} USDC`);
console.log(`${unrated}/${count} selected agents have no rating at all`);
