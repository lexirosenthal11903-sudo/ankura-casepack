/**
 * POST /api/try  { name, text, confirmed: true }
 *
 * Runs the real pipeline on a complaint the visitor typed: redaction, the model, the quote check, the deadline rule.
 * Fictional text only, which the visitor confirms. The same limits as live mode apply: per visitor, per day, and a global cap.
 * Nothing is stored. If live mode is off, or the limit is reached, the visitor is told plainly.
 */
import { NextResponse } from "next/server";
import { CasePackError, generateCasePackForFile } from "@/lib/casepack";
import { DEMO_TODAY, liveModeAvailable } from "@/lib/demo";
import { checkLiveAllowed } from "@/lib/live-guard";
import { buildTryCase, validateTryInput } from "@/lib/try-case";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BODY_BYTES = 6_000;

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const v = validateTryInput(body);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  if (!liveModeAvailable()) return NextResponse.json({ error: "Live mode is switched off at the moment, so your own complaint cannot be run. The built-in cases still work." }, { status: 503 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const allowed = checkLiveAllowed(ip);
  if (!allowed.ok) return NextResponse.json({ error: allowed.reason }, { status: 429 });

  const caseFile = buildTryCase(v.input, DEMO_TODAY);
  try {
    const run = await generateCasePackForFile(caseFile, { model: "haiku", asOf: DEMO_TODAY });
    console.log(JSON.stringify({ event: "try_casepack", chars: v.input.text.length, costUsd: run.usage.costUsd, latencyMs: run.usage.latencyMs }));
    return NextResponse.json({ run });
  } catch (e) {
    const kind = e instanceof CasePackError ? e.kind : "api";
    console.error(JSON.stringify({ event: "try_casepack_failed", kind }));
    const msg =
      kind === "refusal" ? "The model declined to process that text."
      : kind === "truncated" ? "The model's answer was cut off. Try a shorter complaint."
      : "The live call did not complete. Try again in a minute.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
