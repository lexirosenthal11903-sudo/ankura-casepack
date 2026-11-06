/**
 * POST /api/casepack  { caseId: "HV-001", mode: "saved" | "live" }
 *
 * Saved mode returns a stored result from a real earlier run (free and instant).
 * Live mode runs the model now, on built-in development cases only. There is no free-text input,
 * so nobody can paste real data. Live runs are rate limited and a recent result for the same case is reused.
 * If a live call fails or is refused for any reason, the saved result is returned with a note, so the demo never breaks.
 */
import { NextResponse } from "next/server";
import { CasePackError, generateCasePack } from "@/lib/casepack";
import { listCaseIds } from "@/lib/data";
import { DEMO_TODAY, liveModeAvailable } from "@/lib/demo";
import { cachedLiveRun, checkLiveAllowed, storeLiveRun } from "@/lib/live-guard";
import { loadSavedRun } from "@/lib/saved-runs";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BODY_BYTES = 2_000;

function savedWithNote(caseId: string, note: string) {
  return NextResponse.json({ source: "saved", note, run: loadSavedRun(caseId) });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Request too large." }, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Expected a JSON object." }, { status: 400 });
  }
  const { caseId: rawId, mode: rawMode } = body as { caseId?: unknown; mode?: unknown };
  const caseId = typeof rawId === "string" ? rawId : "";
  const mode = rawMode === "live" ? "live" : "saved";

  // Only the development cases are in the app. Held-back test cases are never run here.
  if (!listCaseIds("dev").includes(caseId)) {
    return NextResponse.json({ error: "Unknown case." }, { status: 404 });
  }

  if (mode === "live") {
    if (!liveModeAvailable()) return savedWithNote(caseId, "Live mode is switched off, so this is a saved result.");

    const cached = cachedLiveRun(caseId);
    if (cached) return NextResponse.json({ source: "live", note: "A live result from the last 15 minutes, reused so it costs nothing.", run: cached });

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const allowed = checkLiveAllowed(ip);
    if (!allowed.ok) return savedWithNote(caseId, `${allowed.reason} Showing the saved result instead.`);

    try {
      const run = await generateCasePack(caseId, { model: "haiku", asOf: DEMO_TODAY });
      storeLiveRun(caseId, run);
      console.log(JSON.stringify({ event: "live_casepack", caseId, model: run.model, costUsd: run.usage.costUsd, latencyMs: run.usage.latencyMs }));
      return NextResponse.json({ source: "live", run });
    } catch (e) {
      const kind = e instanceof CasePackError ? e.kind : "api";
      console.error(JSON.stringify({ event: "live_casepack_failed", caseId, kind }));
      return savedWithNote(caseId, "The live call did not complete, so this is the saved result from an earlier real run.");
    }
  }

  const saved = loadSavedRun(caseId);
  if (!saved) return NextResponse.json({ error: "No saved result for this case." }, { status: 404 });
  return NextResponse.json({ source: "saved", run: saved });
}
