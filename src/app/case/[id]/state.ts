/**
 * Review state for one case, shared by the handler's workspace and the specialist's handover page.
 * Kept in the browser only (localStorage). A real system would store it in the bank's case system.
 */
import type { Clock } from "@/lib/deadlines";

export type Decision = { status: "accepted" | "rejected" | "edited"; text?: string };
export type GapFix = { status: "added" | "not_available"; text: string };
export type Stage = "review" | "signed_off" | "with_specialist" | "returned" | "accepted_by_specialist";
export type AuditEntry = { at: string; actor: "System" | "Handler" | "Specialist"; action: string };

export interface ReviewState {
  decisions: Record<string, Decision>;
  gapFixes: Record<string, GapFix>;
  clockChoice: Clock | null;
  stage: Stage;
  audit: AuditEntry[];
  clicks: number;
  returnReason?: string;
  changesSinceReturn?: number;
}

export const storageKey = (id: string) => `casepack:${id}`;

export function readState(id: string): ReviewState | null {
  try {
    const raw = window.localStorage.getItem(storageKey(id));
    return raw ? (JSON.parse(raw) as ReviewState) : null;
  } catch {
    return null;
  }
}

export function writeState(id: string, s: ReviewState) {
  try {
    window.localStorage.setItem(storageKey(id), JSON.stringify(s));
  } catch {
    /* storage unavailable: the review still works for this visit */
  }
}

export function clearState(id: string) {
  try {
    window.localStorage.removeItem(storageKey(id));
  } catch {
    /* ignore */
  }
}

export const now = () => new Date().toISOString();
