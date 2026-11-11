"use client";
/**
 * What the visitor has done in this browser: cases signed off, with a specialist, sent back or accepted.
 * Review state lives in localStorage (see case/[id]/state.ts), so the server-rendered board cannot see it.
 * This adds it on the client, so the journey ends on the board instead of stopping at the handover page.
 */
import Link from "next/link";
import { useEffect, useState } from "react";
import { readState, type Stage } from "../case/[id]/state";

const LABEL: Record<Stage, string> = {
  review: "under review",
  signed_off: "signed off, waiting for the specialist",
  with_specialist: "with the specialist",
  returned: "sent back by the specialist",
  accepted_by_specialist: "accepted by the specialist",
};

export default function YourReviews({ cases, mode }: { cases: { id: string; name: string; team: string }[]; mode: "tile" | "section" }) {
  const [items, setItems] = useState<{ id: string; name: string; team: string; stage: Stage }[]>([]);
  useEffect(() => {
    const found = cases
      .map((c) => ({ ...c, stage: readState(c.id)?.stage }))
      .filter((c): c is { id: string; name: string; team: string; stage: Stage } => !!c.stage && c.stage !== "review");
    setItems(found);
  }, [cases]);
  if (!items.length) return null;
  const handed = items.filter((c) => c.stage !== "returned").length;
  if (mode === "tile") {
    return <dd className="small">Plus {handed} handed over by you in this browser</dd>;
  }
  return (
    <section aria-labelledby="yours">
      <h2 id="yours">What you have done in this session</h2>
      <p className="small muted">Kept in this browser only. A real system would record it in the bank&apos;s case system and the board would update for everyone.</p>
      <ul>
        {items.map((c) => (
          <li key={c.id}>
            <Link href={`/case/${c.id}`}>{c.name}</Link> ({c.id}, {c.team}): {LABEL[c.stage]}.
          </li>
        ))}
      </ul>
    </section>
  );
}
