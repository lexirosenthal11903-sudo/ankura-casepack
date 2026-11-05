/**
 * Measures redaction against the planted identifiers in each answer key.
 * An identifier counts as caught when it no longer appears as a whole word anywhere in the redacted text.
 *
 * Run: npx tsx evals/redaction.ts [dev|heldout|all]
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { redactCase } from "../src/lib/redact";
import type { CaseFile } from "../src/lib/types";

const root = path.resolve(__dirname, "..");
const which = process.argv[2] ?? "dev";
const files = readdirSync(path.join(root, "data/complaints")).filter((f) => f.endsWith(".json")).sort();

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const present = (text: string, s: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(s)}(?![\\p{L}\\p{N}])`, "u").test(text);

let planted = 0;
let caught = 0;
const leaks: string[] = [];
const nearMatches: string[] = [];
const rows: string[] = [];

for (const f of files) {
  const c: CaseFile = JSON.parse(readFileSync(path.join(root, "data/complaints", f), "utf8"));
  if (which !== "all" && c.split !== which) continue;
  const key = JSON.parse(readFileSync(path.join(root, "evals/answer-key", f), "utf8"));
  const r = redactCase(c);
  const text = r.documents.map((d) => d.text).join("\n");
  let caseCaught = 0;
  for (const s of key.planted_pii as string[]) {
    planted++;
    if (present(text, s)) leaks.push(`${c.id}: "${s}"`);
    else { caught++; caseCaught++; }
  }
  for (const rep of r.replacements.filter((x) => x.layer === "near_match")) nearMatches.push(`${c.id}: "${rep.original}" -> ${rep.placeholder}`);
  rows.push(`| ${c.id} | ${caseCaught}/${key.planted_pii.length} | ${r.replacements.length} |`);
}

const pct = planted ? ((100 * caught) / planted).toFixed(1) : "n/a";
const report = [
  `# Redaction results (${which} set)`,
  ``,
  `Generated ${new Date().toISOString().slice(0, 10)} by evals/redaction.ts.`,
  ``,
  `**${caught} of ${planted} planted identifiers caught (${pct}%).**`,
  ``,
  `| Case | Caught | Replacements made |`,
  `|---|---|---|`,
  ...rows,
  ``,
  `## Missed (${leaks.length})`,
  ...(leaks.length ? leaks.map((l) => `- ${l}`) : ["None."]),
  ``,
  `## Caught by near-match only (check these are people, not ordinary words)`,
  ...(nearMatches.length ? nearMatches.map((l) => `- ${l}`) : ["None."]),
  ``,
].join("\n");
writeFileSync(path.join(root, `evals/results/redaction-${which}.md`), report);
console.log(report);
