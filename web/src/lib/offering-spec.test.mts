import { test } from "node:test";
import assert from "node:assert/strict";
import { acceptsDeliverable, isJsonSchema, matchesSchema, specFromOffering } from "./offering-spec.ts";
import { classify } from "./probe-grading.ts";

// The real shape published by "Asia Equity Data :: asia-equity-quote" on ACP.
const realOffering = {
  name: "asia-equity-quote",
  priceValue: 2,
  slaMinutes: 60,
  deliverable: {
    type: "object",
    properties: { result: { type: "object" } },
  },
  requirements: {
    type: "object",
    properties: {
      range: { type: "string" },
      market: { type: "string" },
      symbol: { type: "string" },
    },
  },
};

test("spec inherits the provider's own SLA and price", () => {
  const spec = specFromOffering(realOffering);
  assert.equal(spec.deadlineMs, 60 * 60_000);
  assert.equal(spec.budgetUsdc, 2);
});

test("output conforming to the published schema is accepted", () => {
  const accept = acceptsDeliverable(realOffering.deliverable);
  assert.ok(accept('{"result": {"price": 101.2}}'));
});

test("output violating the published schema is a breach", () => {
  const accept = acceptsDeliverable(realOffering.deliverable);
  assert.equal(accept('{"result": "not an object"}'), false);
  assert.equal(accept("could not fetch quote"), false);
});

test("required keys are enforced", () => {
  const schema = { type: "object", properties: { a: { type: "string" } }, required: ["a"] };
  assert.equal(matchesSchema({}, schema), false);
  assert.ok(matchesSchema({ a: "x" }, schema));
});

test("arrays validate their items", () => {
  const schema = { type: "array", items: { type: "number" } };
  assert.ok(matchesSchema([1, 2, 3], schema));
  assert.equal(matchesSchema([1, "two"], schema), false);
});

test("an unconstrained schema never manufactures a breach", () => {
  assert.ok(acceptsDeliverable(null)("anything at all"));
  assert.ok(matchesSchema({ whatever: true }, { type: "weird-future-keyword" }));
});

test("end to end: late against the provider's own SLA", () => {
  const spec = specFromOffering(realOffering);
  const outcome = classify(spec, {
    deliverable: '{"result": {"price": 101.2}}',
    elapsedMs: 61 * 60_000,
    quotedUsdc: 2,
    invoicedUsdc: 2,
  });
  assert.equal(outcome, "delivered_late");
});

test("end to end: honored contract, on time and on price", () => {
  const spec = specFromOffering(realOffering);
  const outcome = classify(spec, {
    deliverable: '{"result": {"price": 101.2}}',
    elapsedMs: 30 * 60_000,
    quotedUsdc: 2,
    invoicedUsdc: 2,
  });
  assert.equal(outcome, "delivered");
});

test("prose is not a schema, even though it is truthy", () => {
  // 79% of live ACP offerings look like this
  assert.equal(isJsonSchema("Detailed review report with issues and fixes"), false);
  assert.equal(isJsonSchema('{"answer": "Response to your question"}'), false, "a JSON-ish string is still a string");
  assert.equal(isJsonSchema(null), false);
  assert.equal(isJsonSchema(undefined), false);
  assert.equal(isJsonSchema([]), false);
  assert.equal(isJsonSchema({}), false, "an object with no type or properties constrains nothing");
});

test("a real schema object is recognised", () => {
  assert.ok(isJsonSchema({ type: "object", properties: { result: { type: "object" } } }));
  assert.ok(isJsonSchema({ properties: { a: { type: "string" } } }));
});

test("prose deliverables fall back to 'did anything arrive', never a false breach", () => {
  const accept = acceptsDeliverable("Analysis report with charts and key findings");
  assert.ok(accept("here is your report"), "prose spec must not manufacture a breach");
  assert.equal(accept("   "), false, "but nothing at all is still nothing");
});
