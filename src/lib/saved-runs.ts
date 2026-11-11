/** Saved results from real model runs, used in saved mode and as the fallback when a live call fails. */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { CasePackRun } from "./casepack";
import { computeDeadlines } from "./deadlines";
import { loadCase } from "./data";
import { DEMO_TODAY } from "./demo";
import { buildDisplay } from "./redact";
import { tidyPackCurrency } from "./format";
import { refundDutyApplies } from "./rules";

export function loadSavedRun(caseId: string): CasePackRun | null {
  if (!/^HV-\d{3}$/.test(caseId)) return null;
  const file = path.join(process.cwd(), "data/saved-runs", `${caseId}.json`);
  if (!existsSync(file)) return null;
  const run = JSON.parse(readFileSync(file, "utf8")) as CasePackRun;
  // Deadlines are always recalculated by code against the demo date, never taken from the saved file.
  // Display names are rebuilt from the bank's record, so the handler always sees the person's proper name.
  const display = buildDisplay(loadCase(caseId).record, run.redacted.replacements);
  return {
    ...run,
    redacted: { ...run.redacted, display },
    pack: tidyPackCurrency(run.pack),
    deadlines: computeDeadlines(run.redacted.received, run.clock, DEMO_TODAY, { refundDuty: refundDutyApplies(run.pack) }),
  };
}
