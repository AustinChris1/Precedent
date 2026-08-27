"use client";

import { animate, motion, useInView, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Motion primitives. */

const EASE = [0.22, 1, 0.36, 1] as const;

/** A block that rises into place once, when it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  y = 26,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.65, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Children arrive one after another rather than all at once. */
export function Stagger({
  children,
  className = "",
  gap = 0.08,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView={reduce ? undefined : "show"}
      viewport={{ once: true, margin: "-70px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
    >
      {children}
    </motion.div>
  );
}

export const staggerItem = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/** A card that lifts under the cursor. */
export function LiftCard({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : staggerItem}
      initial={reduce ? false : undefined}
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 320, damping: 26, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Type that climbs out from behind a mask, line by line. */
export function MaskedLines({
  lines,
  className = "",
  lineClassName = "",
  delay = 0,
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <span className={className}>
      {lines.map((line, i) => (
        <span key={i} className="line-mask">
          <motion.span
            className={`block ${lineClassName}`}
            initial={reduce ? false : { y: "108%" }}
            animate={reduce ? undefined : { y: "0%" }}
            transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.11 }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Counts up to a number the first time it is seen. */
export function Counter({
  to,
  format,
  className = "",
}: {
  to: number;
  format: (v: number) => string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const value = useMotionValue(0);
  const [text, setText] = useState(() => (reduce ? format(to) : format(0)));

  useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(value, to, {
      duration: 1.4,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setText(format(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, to, value, format]);

  return (
    <span ref={ref} className={className}>
      {reduce ? format(to) : text}
    </span>
  );
}
