/**
 * POST /api/casepack  { caseId: "HV-001", mode: "saved" | "live" }
 *
 * Saved mode returns a stored result from a real earlier run (free and instant).
 * Live mode runs the model now, on built-in development cases only. There is no free-text input,
 * so nobody can paste real data, and the cost per call is a fraction of a penny.
 * If a live call fails for any reason, the saved result is returned with a note, so the demo never breaks.
 */
import { NextResponse } from "next/server";
import { CasePackError, generateCasePack } from "@/lib/casepack";
import { listCaseIds } from "@/lib/data";
import { DEMO_TODAY, liveModeAvailable } from "@/lib/demo";
import { loadSavedRun } from "@/lib/saved-runs";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  let body: { caseId?: unknown; mode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const caseId = typeof body.caseId === "string" ? body.caseId : "";
  const mode = body.mode === "live" ? "live" : "saved";

  // Only the development cases are in the app. Held-back test cases are never run here.
  if (!listCaseIds("dev").includes(caseId)) {
    return NextResponse.json({ error: "Unknown case." }, { status: 404 });
  }

  if (mode === "live") {
    if (!liveModeAvailable()) {
      const saved = loadSavedRun(caseId);
      return NextResponse.json({ source: "saved", note: "Live mode is switched off, so this is a saved result.", run: saved });
    }
    try {
      const run = await generateCasePack(caseId, { model: "haiku", asOf: DEMO_TODAY });
      console.log(JSON.stringify({ event: "live_casepack", caseId, model: run.model, costUsd: run.usage.costUsd, latencyMs: run.usage.latencyMs }));
      return NextResponse.json({ source: "live", run });
    } catch (e) {
      const kind = e instanceof CasePackError ? e.kind : "api";
      console.error(JSON.stringify({ event: "live_casepack_failed", caseId, kind, message: e instanceof Error ? e.message : String(e) }));
      const saved = loadSavedRun(caseId);
      return NextResponse.json({
        source: "saved",
        note: "The live call did not complete, so this is the saved result from an earlier real run.",
        run: saved,
      });
    }
  }

  const saved = loadSavedRun(caseId);
  if (!saved) return NextResponse.json({ error: "No saved result for this case." }, { status: 404 });
  return NextResponse.json({ source: "saved", run: saved });
}
