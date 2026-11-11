import type { Metadata } from "next";
import { bank } from "@/lib/data";
import { liveModeAvailable } from "@/lib/demo";
import { EXAMPLE_COMPLAINT, TRY_MAX_CHARS } from "@/lib/try-case";
import TryForm from "./TryForm";
import styles from "./try.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Try your own complaint | Harbour & Vale case pack prototype (fictional bank)" };

export default function TryPage() {
  const teams = Object.fromEntries(bank.teams.map((t) => [t.id, t.label]));
  return (
    <div className={styles.page}>
      <h1>Try your own complaint</h1>
      <p className={styles.lede}>
        Write a made-up complaint, or use the example, and watch the whole pipeline run on it: personal details hidden, the AI drafts a pack, every quote checked by code, the deadline rule applied. About 45 seconds.
      </p>
      <p className="small muted">
        Fictional text only. Nothing you type is stored. Live runs are limited to a few per visitor and a daily cap, and the AI only ever sees the text after the hiding step, which you can inspect below.
      </p>
      <TryForm liveAvailable={liveModeAvailable()} example={EXAMPLE_COMPLAINT} maxChars={TRY_MAX_CHARS} teams={teams} />
    </div>
  );
}
