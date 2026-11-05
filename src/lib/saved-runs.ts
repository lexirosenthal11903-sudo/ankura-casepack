/** Saved results from real model runs, used in saved mode and as the fallback when a live call fails. */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CasePackRun } from "./casepack";
import { computeDeadlines } from "./deadlines";
import { DEMO_TODAY } from "./demo";

export function loadSavedRun(caseId: string): CasePackRun | null {
  if (!/^HV-\d{3}$/.test(caseId)) return null;
  const file = path.join(process.cwd(), "data/saved-runs", `${caseId}.json`);
  if (!existsSync(file)) return null;
  const run = JSON.parse(readFileSync(file, "utf8")) as CasePackRun;
  // Deadlines are always recalculated by code against the demo date, never taken from the saved file.
  return { ...run, deadlines: computeDeadlines(run.redacted.received, run.clock, DEMO_TODAY) };
}
