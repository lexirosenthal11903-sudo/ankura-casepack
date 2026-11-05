/**
 * Builds a case pack: redact -> one AI call -> code checks -> deadlines.
 * The AI never sees the unredacted case, the answer key or the outcome of any check.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { checklistFor, loadCase, policy } from "./data";
import { computeDeadlines, type Clock, type Deadlines } from "./deadlines";
import { buildUserMessage, PROMPT_VERSION, SYSTEM_PROMPT } from "./prompts/casepack-v2";
import { checkItem, type CheckedCitation, type Citation } from "./provenance";
import { findInventedPlaceholders, redactCase, type RedactedCase } from "./redact";
import { CasePackSchema, type CasePack } from "./schema";

export const MODELS = {
  haiku: "claude-haiku-5-5",
  sonnet: "claude-sonnet-5-5",
} as const;
export type ModelKey = keyof typeof MODELS;

// US dollars per million tokens (Anthropic price list, checked 5 Nov 2026). Cache reads cost 10% of input.
const PRICES: Record<string, { input: number; output: number; cacheWrite: number; cacheRead: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheWrite: 0.125, cacheRead: 0.01 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
};

export interface StatementCheck {
  path: string;
  text: string;
  supported: boolean;
  citations: CheckedCitation[];
}

export interface CasePackChecks {
  statements: StatementCheck[];
  supportedCount: number;
  unsupportedCount: number;
  inventedPlaceholders: string[];
  checklist: { required: number; present: number; missing: string[]; conflicting: string[] };
}

export interface CasePackRun {
  caseId: string;
  createdAt: string;
  model: string;
  promptVersion: string;
  redacted: RedactedCase;
  pack: CasePack;
  checks: CasePackChecks;
  clock: Clock;
  deadlines: Deadlines;
  usage: { inputTokens: number; outputTokens: number; cacheReadTokens: number; cacheWriteTokens: number; costUsd: number; latencyMs: number };
}

export function clockFromPack(pack: CasePack): Clock {
  return pack.intake.payment_services === "yes" ? "15_business_days" : pack.intake.payment_services === "unclear" ? "confirm" : "8_weeks";
}

/** Runs every code check on a pack. Pure, so it is unit-tested and reused by the evaluation. */
export function checkPack(pack: CasePack, redacted: RedactedCase): CasePackChecks {
  const sources: Record<string, string> = {};
  for (const d of redacted.documents) sources[d.id] = d.text;
  for (const p of policy.paragraphs) sources[p.id] = `${p.heading}. ${p.text}`;

  const statements: StatementCheck[] = [];
  const add = (path: string, text: string, citations: Citation[]) => {
    const r = checkItem(citations, sources);
    statements.push({ path, text, supported: r.supported, citations: r.citations });
  };
  pack.intake.issues.forEach((x, i) => add(`intake.issues.${i}`, x.description, x.citations));
  add("intake.team_reason", pack.intake.team_reason.text, pack.intake.team_reason.citations);
  add("intake.payment_services_reason", pack.intake.payment_services_reason.text, pack.intake.payment_services_reason.citations);
  pack.summary.forEach((x, i) => add(`summary.${i}`, x.text, x.citations));
  pack.timeline.forEach((x, i) => add(`timeline.${i}`, `${x.date}: ${x.event}`, x.citations));
  add("outcome_sought", pack.outcome_sought.text, pack.outcome_sought.citations);
  pack.vulnerability.forEach((x, i) => add(`vulnerability.${i}`, x.signal, x.citations));
  pack.relevant_policy.forEach((x, i) => add(`relevant_policy.${i}`, `${x.policy_id}: ${x.why_relevant}`, x.citations));
  pack.handover_checklist
    .filter((x) => x.status === "present" || x.status === "conflicting")
    .forEach((x) => add(`handover_checklist.${x.item_id}`, `${x.item_id}: ${x.value}`, x.citations));
  pack.conflicts.forEach((x, i) => add(`conflicts.${i}`, x.text, x.citations));
  pack.flags.forEach((x, i) => add(`flags.${i}`, `${x.type}: ${x.description}`, x.citations));

  const team = pack.intake.suggested_team;
  const applicable = checklistFor(team)
    .map((i) => i.id)
    .filter((id) => !(team === "frontline" && id === "customer_told_of_handover"));
  const byId = new Map(pack.handover_checklist.map((x) => [x.item_id, x]));
  const required = applicable.filter((id) => byId.get(id)?.status !== "not_applicable");
  const present = required.filter((id) => byId.get(id)?.status === "present").length;

  return {
    statements,
    supportedCount: statements.filter((s) => s.supported).length,
    unsupportedCount: statements.filter((s) => !s.supported).length,
    inventedPlaceholders: findInventedPlaceholders(JSON.stringify(pack), redacted.placeholders),
    checklist: {
      required: required.length,
      present,
      missing: required.filter((id) => !byId.has(id) || byId.get(id)!.status === "missing"),
      conflicting: required.filter((id) => byId.get(id)?.status === "conflicting"),
    },
  };
}

export class CasePackError extends Error {
  constructor(message: string, readonly kind: "refusal" | "truncated" | "invalid_output" | "api") {
    super(message);
  }
}

export async function generateCasePack(caseId: string, opts: { model?: ModelKey; asOf: string; client?: Anthropic }): Promise<CasePackRun> {
  const model = MODELS[opts.model ?? "haiku"];
  const client = opts.client ?? new Anthropic();
  const redacted = redactCase(loadCase(caseId));
  const started = Date.now();

  let response;
  try {
    response = await client.messages.parse({
      model,
      max_tokens: 16000,
      // The policy and instructions are identical on every call, so they are cached (cheaper and faster).
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildUserMessage(redacted) }],
      output_config: { format: zodOutputFormat(CasePackSchema), effort: "medium" },
    });
  } catch (e) {
    throw new CasePackError(e instanceof Error ? e.message : String(e), "api");
  }
  const latencyMs = Date.now() - started;

  if (response.stop_reason === "refusal") throw new CasePackError("The model declined to process this case.", "refusal");
  if (response.stop_reason === "max_tokens") throw new CasePackError("The model's answer was cut off before it finished.", "truncated");
  const pack = response.parsed_output;
  if (!pack) throw new CasePackError("The model's answer did not match the case pack form.", "invalid_output");

  const u = response.usage;
  const price = PRICES[model];
  const cacheRead = u.cache_read_input_tokens ?? 0;
  const cacheWrite = u.cache_creation_input_tokens ?? 0;
  const costUsd =
    (u.input_tokens * price.input + u.output_tokens * price.output + cacheRead * price.cacheRead + cacheWrite * price.cacheWrite) / 1_000_000;

  const clock = clockFromPack(pack);
  return {
    caseId,
    createdAt: new Date().toISOString(),
    model,
    promptVersion: PROMPT_VERSION,
    redacted,
    pack,
    checks: checkPack(pack, redacted),
    clock,
    deadlines: computeDeadlines(redacted.received, clock, opts.asOf),
    usage: { inputTokens: u.input_tokens, outputTokens: u.output_tokens, cacheReadTokens: cacheRead, cacheWriteTokens: cacheWrite, costUsd, latencyMs },
  };
}
