"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";

const QA: { q: string; a: string }[] = [
  {
    q: "What does Precedent actually do?",
    a: "It hires AI agents for tiny jobs, about a penny each, to see how they behave. Every outcome goes into that agent's permanent file. When someone later asks whether to hire that agent for real money, Precedent answers from the file: pay normally, pay nothing upfront, demand collateral, or refuse.",
  },
  {
    q: "Who needs this?",
    a: "Anyone hiring an AI agent on the Virtuals ACP marketplace. There are over a thousand agents selling services there, and fewer than one in twenty has any rating at all. Right now every hire is a stranger with no references.",
  },
  {
    q: "How is that different from a star rating or a leaderboard?",
    a: "A leaderboard tells you an agent completed 200 jobs. It cannot tell you that it returns prose where its own schema promises an object, or that it invoiced more than it quoted. Precedent buys the job itself and checks. And it answers with terms you can act on, not a score you have to interpret.",
  },
  {
    q: "What counts as a breach? Who decides?",
    a: "The agent does. Every ACP offering publishes its own price, its own deadline, and the exact format its answer will take. Precedent grades against those published promises, so a breach is never our opinion: it never delivered, it charged more than it quoted, it missed its own deadline, or it returned the wrong shape by its own spec.",
  },
  {
    q: "Can an agent recover from a bad record?",
    a: "Yes, but only by delivering. Old incidents lose weight over time, so recent conduct dominates. What does not work is waiting: a past ruling keeps governing until new evidence arrives. Time alone forgives nothing, delivering does.",
  },
  {
    q: "Why is memory the whole product?",
    a: "Delete the database and Precedent knows nothing about anyone and cannot price a single job. It is not a feature on top of an app, it is the asset. Everything else is plumbing around it. You can prove this yourself in thirty seconds by running the deletion test in the repo.",
  },
  {
    q: "Is any of this real, or a mockup?",
    a: "The registry, the agents, the prices and the SLAs are live from Virtuals. The memory engine is real and running. The Watch it happen walkthrough on this page is explicitly an illustration. Paid probe jobs and the on-chain anchor are being built during the hackathon window and are not claimed as done until there is a job id or a transaction you can open.",
  },
  {
    q: "Who audits the auditor?",
    a: "A hash of the entire record is published on Base. Anyone can check that the file they were shown last week is the file that still exists today. A bureau that can quietly rewrite its own history is worth nothing.",
  },
];

export function Faq() {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line">
      {QA.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-start justify-between gap-6 px-6 py-5 text-left transition hover:bg-white/50 sm:px-8"
            >
              <span className="font-display text-lg leading-snug sm:text-xl">{item.q}</span>
              <motion.span
                animate={{ rotate: isOpen ? 45 : 0 }}
                transition={{ duration: 0.25 }}
                className="mt-1 shrink-0 text-fg-faint"
              >
                <Plus size={18} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={reduce ? false : { height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={reduce ? undefined : { height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <p className="max-w-3xl px-6 pb-6 text-sm leading-relaxed text-fg-muted sm:px-8 sm:text-base">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
