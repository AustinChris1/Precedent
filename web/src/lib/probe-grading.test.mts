import { test } from "node:test";
import assert from "node:assert/strict";
import { classify, type ProbeSpec } from "./probe-grading.ts";

const spec: ProbeSpec = {
  keyword: "data-cleaning",
  budgetUsdc: 0.01,
  deadlineMs: 60_000,
  accept: (d) => d.trim().startsWith("{"),
};

const onSpec = '{"rows": 100}';

test("no deliverable is a ghosting", () => {
  assert.equal(
    classify(spec, { elapsedMs: 90_000, quotedUsdc: 0.01, invoicedUsdc: 0.01 }),
    "ghosted",
  );
});

test("invoicing above quote is price drift, even when the work was good", () => {
  assert.equal(
    classify(spec, {
      deliverable: onSpec,
      elapsedMs: 1_000,
      quotedUsdc: 0.01,
      invoicedUsdc: 0.02,
    }),
    "price_drift",
  );
});

test("a refusal message is malformed, not a delivery", () => {
  assert.equal(
    classify(spec, {
      deliverable: "sorry, I could not complete this",
      elapsedMs: 1_000,
      quotedUsdc: 0.01,
      invoicedUsdc: 0.01,
    }),
    "malformed",
  );
});

test("good output past the deadline is late, not a breach", () => {
  assert.equal(
    classify(spec, {
      deliverable: onSpec,
      elapsedMs: 120_000,
      quotedUsdc: 0.01,
      invoicedUsdc: 0.01,
    }),
    "delivered_late",
  );
});

test("on time, on spec, on price", () => {
  assert.equal(
    classify(spec, {
      deliverable: onSpec,
      elapsedMs: 5_000,
      quotedUsdc: 0.01,
      invoicedUsdc: 0.01,
    }),
    "delivered",
  );
});
