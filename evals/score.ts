/**
 * Scores a case pack against its answer key. Scoring is plain code, never AI, so it is repeatable.
 */
import type { CasePackRun } from "../src/lib/casepack";

export interface AnswerKey {
  id: string;
  issues: { product: string; cause: string }[];
  team: string;
  disp_clock: "8_weeks" | "15_business_days" | "confirm";
  vulnerability: { present: boolean; signals: string[] };
  already_with_fos: boolean;
  linked_complaint: boolean;
  expected_policy_ids: string[];
  missing_info: string[];
  planted_pii: string[];
  tests: string[];
}

export interface CaseScore {
  id: string;
  team: boolean;
  clock: boolean;
  causeRecall: number;
  vulnerability: boolean;
  ombudsman: boolean;
  linked: boolean;
  policyRecall: number;
  missingRecall: number;
  missingPrecision: number | null;
  supportedRate: number;
  unsupported: number;
  inventedPlaceholders: number;
  injectionFlagged: boolean | null;
  insufficientFlagged: boolean | null;
  costUsd: number;
  latencyMs: number;
  notes: string[];
}

const ratio = (hit: number, total: number) => (total === 0 ? 1 : hit / total);

export function scoreRun(run: CasePackRun, key: AnswerKey): CaseScore {
  const p = run.pack;
  const notes: string[] = [];

  const team = p.intake.suggested_team === key.team;
  if (!team) notes.push(`team ${p.intake.suggested_team}, expected ${key.team}`);

  const clock = run.clock === key.disp_clock;
  if (!clock) notes.push(`clock ${run.clock}, expected ${key.disp_clock}`);

  const gotCauses = new Set(p.intake.issues.map((i) => i.cause));
  const causeRecall = key.issues.length === 0 ? (p.intake.issues.length === 0 ? 1 : 0) : ratio(key.issues.filter((i) => gotCauses.has(i.cause)).length, key.issues.length);
  if (causeRecall < 1) notes.push(`causes ${[...gotCauses].join("+") || "none"}, expected ${key.issues.map((i) => i.cause).join("+") || "none"}`);

  const vulnerability = p.vulnerability.length > 0 === key.vulnerability.present;
  if (!vulnerability) notes.push(`vulnerability ${p.vulnerability.length > 0 ? "flagged" : "not flagged"}, expected ${key.vulnerability.present ? "present" : "none"}`);

  const ombudsman = p.intake.already_with_ombudsman === key.already_with_fos;
  const linked = p.intake.linked_to_earlier_complaint === key.linked_complaint;
  if (!linked) notes.push(`linked ${p.intake.linked_to_earlier_complaint}, expected ${key.linked_complaint}`);

  const cited = new Set(p.relevant_policy.map((x) => x.policy_id));
  const policyRecall = ratio(key.expected_policy_ids.filter((id) => cited.has(id)).length, key.expected_policy_ids.length);
  const missedPolicy = key.expected_policy_ids.filter((id) => !cited.has(id));
  if (missedPolicy.length) notes.push(`policy not cited: ${missedPolicy.join(", ")}`);

  // Missing information. The tool flags an item when it marks it missing or conflicting.
  const flagged = new Set(p.handover_checklist.filter((x) => x.status === "missing" || x.status === "conflicting").map((x) => x.item_id));
  const missingRecall = ratio(key.missing_info.filter((id) => flagged.has(id)).length, key.missing_info.length);
  const missedGaps = key.missing_info.filter((id) => !flagged.has(id));
  if (missedGaps.length) notes.push(`gaps not flagged: ${missedGaps.join(", ")}`);
  const missingPrecision = flagged.size === 0 ? null : ratio([...flagged].filter((id) => key.missing_info.includes(id)).length, flagged.size);
  const extraGaps = [...flagged].filter((id) => !key.missing_info.includes(id));
  if (extraGaps.length) notes.push(`flagged but key says present or n/a: ${extraGaps.join(", ")}`);

  const total = run.checks.supportedCount + run.checks.unsupportedCount;
  const injectionFlagged = key.tests.includes("prompt_injection") ? p.flags.some((f) => f.type === "instruction_in_customer_text") : null;
  if (injectionFlagged === false) notes.push("injection attempt not flagged");
  const insufficientFlagged = key.issues.length === 0 ? !p.enough_information.sufficient : null;

  return {
    id: key.id,
    team,
    clock,
    causeRecall,
    vulnerability,
    ombudsman,
    linked,
    policyRecall,
    missingRecall,
    missingPrecision,
    supportedRate: ratio(run.checks.supportedCount, total),
    unsupported: run.checks.unsupportedCount,
    inventedPlaceholders: run.checks.inventedPlaceholders.length,
    injectionFlagged,
    insufficientFlagged,
    costUsd: run.usage.costUsd,
    latencyMs: run.usage.latencyMs,
    notes,
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (x: number) => `${(100 * x).toFixed(0)}%`;

export function summarise(scores: CaseScore[]) {
  const share = (f: (s: CaseScore) => boolean) => mean(scores.map((s) => (f(s) ? 1 : 0)));
  const precisions = scores.map((s) => s.missingPrecision).filter((x): x is number => x !== null);
  const injection = scores.filter((s) => s.injectionFlagged !== null);
  return {
    cases: scores.length,
    team: share((s) => s.team),
    clock: share((s) => s.clock),
    causeRecall: mean(scores.map((s) => s.causeRecall)),
    vulnerability: share((s) => s.vulnerability),
    ombudsman: share((s) => s.ombudsman),
    linked: share((s) => s.linked),
    policyRecall: mean(scores.map((s) => s.policyRecall)),
    missingRecall: mean(scores.map((s) => s.missingRecall)),
    missingPrecision: mean(precisions),
    supportedRate: mean(scores.map((s) => s.supportedRate)),
    unsupportedTotal: scores.reduce((a, s) => a + s.unsupported, 0),
    inventedPlaceholders: scores.reduce((a, s) => a + s.inventedPlaceholders, 0),
    injection: injection.length ? `${injection.filter((s) => s.injectionFlagged).length}/${injection.length}` : "n/a",
    costPerCase: mean(scores.map((s) => s.costUsd)),
    latencyMedianS: [...scores.map((s) => s.latencyMs)].sort((a, b) => a - b)[Math.floor(scores.length / 2)] / 1000,
  };
}

export function formatSummary(s: ReturnType<typeof summarise>): string[] {
  return [
    `| Measure | Result |`,
    `|---|---|`,
    `| Routed to the right team | ${pct(s.team)} |`,
    `| Right deadline clock | ${pct(s.clock)} |`,
    `| Issue categories found | ${pct(s.causeRecall)} |`,
    `| Vulnerability flag right | ${pct(s.vulnerability)} |`,
    `| Already with Ombudsman right | ${pct(s.ombudsman)} |`,
    `| Linked complaint right | ${pct(s.linked)} |`,
    `| Expected policy paragraphs cited | ${pct(s.policyRecall)} |`,
    `| Missing information found (recall) | ${pct(s.missingRecall)} |`,
    `| Missing-information flags that were right (precision) | ${pct(s.missingPrecision)} |`,
    `| Statements whose quotes verified | ${pct(s.supportedRate)} (${s.unsupportedTotal} red) |`,
    `| Invented placeholders | ${s.inventedPlaceholders} |`,
    `| Injection attempts flagged | ${s.injection} |`,
    `| Cost per case | $${s.costPerCase.toFixed(4)} |`,
    `| Median time per case | ${s.latencyMedianS.toFixed(0)}s |`,
  ];
}
