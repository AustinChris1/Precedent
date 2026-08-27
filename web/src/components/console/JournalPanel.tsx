"use client";

import { useEffect, useState } from "react";
import { Fingerprint, ScrollText } from "lucide-react";
import { engine } from "@/lib/client";
import type { JournalEvent } from "@/lib/engine";
import { Button, Card, Empty, ErrorNote } from "@/components/ui";

export function JournalPanel({ refreshKey }: { refreshKey: number }) {
  const [events, setEvents] = useState<JournalEvent[]>([]);
  const [digest, setDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    engine
      .get<{ events: JournalEvent[] }>("journal?limit=40")
      .then((res) => {
        if (!alive) return;
        setEvents(res.events);
        setError(null);
      })
      .catch((err: Error) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [refreshKey]);

  async function anchor() {
    setLoading(true);
    setError(null);
    try {
      const res = await engine.get<{ journal_digest: string }>("anchor");
      setDigest(res.journal_digest);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <ErrorNote>{error}</ErrorNote>}

      <Card
        title="Tamper-evident anchor"
        hint="A hash of the whole journal. Posting it to Base is what stops the bureau quietly rewriting its own history."
        icon={<Fingerprint size={18} />}
      >
        <Button onClick={anchor} loading={loading} variant="ghost">
          Compute journal digest
        </Button>
        {digest && (
          <p className="mt-4 break-all rounded-xl well px-3 py-2.5 font-mono text-xs text-brand-soft">
            {digest}
          </p>
        )}
        {digest && (
          <p className="mt-2 text-xs text-fg-faint">
            Record one more incident and this changes, that is the point. On Base, the old
            digest stays published, so any edit to history becomes visible.
          </p>
        )}
      </Card>

      <Card
        title="COLD journal"
        hint="Append-only. Every incident, ruling and curation run, newest first."
        icon={<ScrollText size={18} />}
      >
        {events.length === 0 ? (
          <Empty>The journal is empty. Record a probe outcome to write the first entry.</Empty>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="rounded-xl well px-3 py-2">
                <p className="font-mono text-[0.68rem] text-fg-faint">
                  {e.ts.slice(0, 19).replace("T", " ")}
                </p>
                {(["evaluated", "acted", "forward"] as const).map((k) =>
                  e[k]?.length ? (
                    <p key={k} className="mt-1 text-sm text-fg-muted">
                      <span className="text-[0.68rem] uppercase tracking-[0.1em] text-fg-faint">
                        {k}
                      </span>{" "}
                      {e[k]!.join(" · ")}
                    </p>
                  ) : null,
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
