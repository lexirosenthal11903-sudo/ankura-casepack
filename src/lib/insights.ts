/**
 * Queue-wide insights for the team leader's view. Pure functions over plain data, so they are unit-tested
 * and never touch the file system. Every figure on the page comes from these and the saved runs.
 */
import type { Deadlines } from "./deadlines";

/** Incident references look like INC-2026-1030-01: year, month and day of the incident, then a sequence number. */
const INCIDENT_RE = /INC-\d{4}-\d{4}-\d{2}/g;

export function findIncidentRefs(text: string): string[] {
  return [...new Set(text.match(INCIDENT_RE) ?? [])].sort();
}

/** The date encoded in an incident reference, as YYYY-MM-DD, or null if it is not a real date. */
export function incidentDate(ref: string): string | null {
  const m = /^INC-(\d{4})-(\d{2})(\d{2})-\d{2}$/.exec(ref);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso ? iso : null;
}

export interface Group {
  key: string;
  caseIds: string[];
}

/**
 * Counts how many cases carry each key (a case is counted once per key, however many times the key appears).
 * Sorted by most cases first, then by key so the order is stable.
 */
export function groupCases(cases: { id: string; keys: string[] }[]): Group[] {
  const map = new Map<string, Set<string>>();
  for (const c of cases) {
    for (const k of c.keys) {
      if (!map.has(k)) map.set(k, new Set());
      map.get(k)!.add(c.id);
    }
  }
  return [...map.entries()]
    .map(([key, ids]) => ({ key, caseIds: [...ids].sort() }))
    .sort((a, b) => b.caseIds.length - a.caseIds.length || a.key.localeCompare(b.key));
}

/** Incidents referenced in the notes of two or more complaints: a shared root cause worth fixing once. */
export function sharedIncidents(cases: { id: string; text: string }[]): (Group & { date: string | null })[] {
  return groupCases(cases.map((c) => ({ id: c.id, keys: findIncidentRefs(c.text) })))
    .filter((g) => g.caseIds.length >= 2)
    .map((g) => ({ ...g, date: incidentDate(g.key) }));
}

/** Rank for urgency: refund decisions overdue first, then other overdue, then by due date. */
export function byUrgency(a: Deadlines, b: Deadlines): number {
  const rank = (d: Deadlines) => (d.refundOverdue ? 0 : d.status === "overdue" ? 1 : d.status === "due_soon" ? 2 : 3);
  return rank(a) - rank(b) || a.workingDue.localeCompare(b.workingDue);
}

/** Share as a whole-number percentage. Returns "n/a" when there is nothing to divide by. */
export function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((100 * part) / whole)}%` : "n/a";
}

/** Middle value of a list of numbers, or 0 for an empty list. */
export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
