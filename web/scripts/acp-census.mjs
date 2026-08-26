const BASE = "https://api.acp.virtuals.io/agents/search";
const terms = "abcdefghijklmnopqrstuvwxyz".split("");
const extra = ["data", "trading", "research", "image", "video", "music", "analytics",
  "news", "defi", "nft", "social", "meme", "market", "summary", "index", "signal"];

const agents = new Map();
for (const q of [...terms, ...extra]) {
  try {
    const res = await fetch(`${BASE}?query=${encodeURIComponent(q)}&topK=100`);
    if (!res.ok) continue;
    for (const a of (await res.json()).data ?? []) agents.set(a.id, a);
  } catch {}
}

const all = [...agents.values()];
const offers = all.flatMap((a) =>
  (a.offerings ?? []).map((o) => ({
    agent: a.name,
    agentId: a.id,
    cluster: a.cluster,
    rating: a.rating,
    offering: o.name,
    price: Number(o.priceValue),
    priceType: o.priceType,
    sla: o.slaMinutes,
    // truthy is not enough: most deliverables are prose, not a JSON Schema
    hasSchema: !!o.deliverable && typeof o.deliverable === "object" && !Array.isArray(o.deliverable)
      && (typeof o.deliverable.type === "string" || typeof o.deliverable.properties === "object"),
    proseSpec: typeof o.deliverable === "string",
    hasReqs: !!o.requirements,
  })),
);

const priced = offers.filter((o) => Number.isFinite(o.price));
const sorted = [...priced].map((o) => o.price).sort((a, b) => a - b);
const pct = (p) => sorted[Math.floor(sorted.length * p)];

console.log("unique agents:", all.length, "| offerings:", offers.length);
console.log("priced offerings:", priced.length);
console.log(`price USD  min=${sorted[0]} p25=${pct(0.25)} median=${pct(0.5)} p75=${pct(0.75)} max=${sorted[sorted.length - 1]}`);
console.log("free ($0):", priced.filter((o) => o.price === 0).length);
console.log("<= $1:", priced.filter((o) => o.price > 0 && o.price <= 1).length);
console.log("<= $3:", priced.filter((o) => o.price > 0 && o.price <= 3).length);
console.log("with a REAL deliverable schema:", offers.filter((o) => o.hasSchema).length);
console.log("with prose where a schema should be:", offers.filter((o) => o.proseSpec).length);
console.log("with requirements schema:", offers.filter((o) => o.hasReqs).length);
console.log("with declared SLA:", offers.filter((o) => Number.isFinite(o.sla)).length);

const slas = offers.map((o) => o.sla).filter(Number.isFinite).sort((a, b) => a - b);
console.log(`SLA minutes  min=${slas[0]} median=${slas[Math.floor(slas.length / 2)]} max=${slas[slas.length - 1]}`);

console.log("\ncheapest gradeable offerings (schema + SLA, price > 0):");
for (const o of priced
  .filter((o) => o.hasSchema && Number.isFinite(o.sla) && o.price > 0)
  .sort((a, b) => a.price - b.price)
  .slice(0, 12)) {
  console.log(`  $${o.price}  ${o.sla}min  ${o.agent} :: ${o.offering}  rating=${o.rating ?? "none"}`);
}
