/**
 * Guards for live mode on the public demo. In memory, so per server instance and best effort only.
 * The hard limits are the prepaid balance and the spend limit set in the Anthropic console.
 * A production system would use a shared store (for example Redis) or the hosting firewall instead.
 */
import type { CasePackRun } from "./casepack";

const PER_MINUTE = 3;
const PER_DAY = 20;
const GLOBAL_PER_DAY = 150;
const CACHE_MS = 15 * 60 * 1000;

const hits = new Map<string, number[]>();
let globalDay = "";
let globalCount = 0;
const cache = new Map<string, { at: number; run: CasePackRun }>();

export type GuardResult = { ok: true } | { ok: false; reason: string };

export function checkLiveAllowed(ip: string, nowMs = Date.now()): GuardResult {
  const today = new Date(nowMs).toISOString().slice(0, 10);
  if (today !== globalDay) {
    globalDay = today;
    globalCount = 0;
  }
  if (globalCount >= GLOBAL_PER_DAY) return { ok: false, reason: "The demo's daily limit for live runs has been reached." };
  const recent = (hits.get(ip) ?? []).filter((t) => nowMs - t < 24 * 60 * 60 * 1000);
  if (recent.filter((t) => nowMs - t < 60 * 1000).length >= PER_MINUTE) return { ok: false, reason: "Too many live runs in the last minute." };
  if (recent.length >= PER_DAY) return { ok: false, reason: "Daily live-run limit reached for this visitor." };
  recent.push(nowMs);
  hits.set(ip, recent);
  globalCount++;
  return { ok: true };
}

/** A live result from the last 15 minutes for the same case, so repeat clicks cost nothing. */
export function cachedLiveRun(caseId: string, nowMs = Date.now()): CasePackRun | null {
  const c = cache.get(caseId);
  return c && nowMs - c.at < CACHE_MS ? c.run : null;
}

export function storeLiveRun(caseId: string, run: CasePackRun, nowMs = Date.now()) {
  cache.set(caseId, { at: nowMs, run });
}
