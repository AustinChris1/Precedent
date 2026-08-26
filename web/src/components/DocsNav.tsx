"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { DocMeta } from "@/lib/docs";

export function DocsNav({ docs }: { docs: DocMeta[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden w-56 shrink-0 lg:block">
      <div className="sticky top-28">
        <p className="text-[0.68rem] uppercase tracking-[0.14em] text-fg-faint">Documentation</p>
        <ul className="mt-3 space-y-1">
          {docs.map((d) => {
            const href = `/docs/${d.slug}`;
            const active = pathname === href;
            return (
              <li key={d.slug}>
                <Link
                  href={href}
                  className={`block rounded-lg px-3 py-2 text-sm transition ${
                    active
                      ? "glass text-fg"
                      : "text-fg-muted hover:bg-white/50 hover:text-fg"
                  }`}
                >
                  <span className="relative">{d.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
