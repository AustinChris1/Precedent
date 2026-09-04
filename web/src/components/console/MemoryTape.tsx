"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownToLine, ArrowUpFromLine, CircleSlash } from "lucide-react";
import type { MemoryRead } from "@/lib/engine";

const TIER_CLASS: Record<string, string> = {
  HOT: "border-refuse/40 text-refuse",
  WARM: "border-brand/45 text-brand",
  "WARM/FTS5": "border-brand/45 text-brand",
  COLD: "border-guarded/45 text-guarded",
  REFERENCE: "border-standard/40 text-standard",
  ARCHIVE: "border-unknown/50 text-unknown",
};

/** Seconds each row waits before it appears, so the reads are watched, not just listed. */
export const ROW_DELAY = 0.19;

export function MemoryTape({ reads }: { reads: MemoryRead[] }) {
  const reduce = useReducedMotion();

  return (
    <div className="rounded-2xl well p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[0.7rem] uppercase tracking-[0.12em] text-fg-faint">
          Memory, read live
        </h3>
        <span className="font-mono text-[0.68rem] text-fg-faint">
          {reads.filter((r) => r.mode === "read").length} reads ·{" "}
          {reads.filter((r) => r.mode === "write").length} writes
        </span>
      </div>

      <ol className="mt-3 space-y-1.5">
        {reads.map((r, i) => (
          <motion.li
            key={r.seq}
            initial={reduce ? false : { opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: reduce ? 0 : i * ROW_DELAY }}
            className={`rounded-xl border-l-2 bg-white/70 px-3 py-2 ${
              r.mode === "read" ? "border-brand/50" : "border-line-strong"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`rounded border px-1.5 py-0.5 font-mono text-[0.6rem] tracking-wide ${
                  TIER_CLASS[r.tier] ?? "border-line-strong text-fg-faint"
                }`}
              >
                {r.tier}
              </span>
              <span className="flex items-center gap-1 font-mono text-xs text-fg">
                {r.mode === "read" ? (
                  <ArrowDownToLine size={11} className="text-fg-faint" />
                ) : (
                  <ArrowUpFromLine size={11} className="text-fg-faint" />
                )}
                {r.op}
              </span>
              <span className="ml-auto font-mono text-[0.62rem] text-fg-faint">
                {r.ms.toFixed(1)}ms
              </span>
            </div>

            <p className="mt-1 truncate font-mono text-[0.72rem] text-fg-muted" title={r.target}>
              {r.target}
            </p>

            {r.mode === "read" && (
              <p
                className={`mt-0.5 flex items-center gap-1 text-[0.68rem] ${
                  r.hit ? "text-standard" : "text-restricted"
                }`}
              >
                {!r.hit && <CircleSlash size={10} />}
                {r.hit
                  ? r.count !== null
                    ? `found ${r.count}`
                    : "found"
                  : r.count !== null
                    ? "no rows"
                    : "not on file"}
              </p>
            )}
          </motion.li>
        ))}
      </ol>

      <p className="mt-3 text-[0.68rem] leading-relaxed text-fg-faint">
        Every call the engine made against Sibyl Memory to answer this request, in order. The
        verdict is downstream of these rows, not of the question.
      </p>
    </div>
  );
}
