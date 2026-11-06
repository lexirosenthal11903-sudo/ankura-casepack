/** Loads the fictional bank's data files. Server-side only. */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import type { CaseFile } from "./types";

const DATA = path.join(process.cwd(), "data");

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join(DATA, rel), "utf8")) as T;
}

export interface PolicyParagraph {
  id: string;
  section: string;
  heading: string;
  text: string;
}

export interface Bank {
  name: string;
  products: { id: string; label: string }[];
  causes: { id: string; label: string }[];
  teams: { id: string; label: string; handover: boolean; remit: string }[];
}

export interface ChecklistItem {
  id: string;
  label: string;
  /** Plain-English name for summaries, such as "who was paid". */
  short?: string;
}

export interface Checklists {
  common: ChecklistItem[];
  teams: Record<string, ChecklistItem[]>;
  send_back_reasons: ChecklistItem[];
}

export const bank = readJson<Bank>("bank.json");
export const policy = readJson<{ id: string; title: string; version: string; paragraphs: PolicyParagraph[] }>(
  "policies/complaints-policy.json",
);
export const checklists = readJson<Checklists>("checklists.json");

export function listCaseIds(split?: "dev" | "heldout"): string[] {
  return readdirSync(path.join(DATA, "complaints"))
    .filter((f) => /^HV-\d{3}\.json$/.test(f))
    .map((f) => f.replace(".json", ""))
    .filter((id) => !split || loadCase(id).split === split)
    .sort();
}

export function loadCase(id: string): CaseFile {
  if (!/^HV-\d{3}$/.test(id)) throw new Error(`Unknown case id "${id}"`);
  return readJson<CaseFile>(`complaints/${id}.json`);
}

/** Every checklist item that could apply to a team: the common items plus the team's own. */
export function checklistFor(team: string): ChecklistItem[] {
  return [...checklists.common, ...(checklists.teams[team] ?? [])];
}
