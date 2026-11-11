/**
 * Runs a set of cases through the real model, scores each against its answer key and writes a report.
 *
 *   npx tsx --env-file=.env evals/run-eval.ts --split dev --model haiku --repeats 1
 *   npx tsx evals/run-eval.ts --rescore evals/results/runs/<folder>     (re-scores saved runs, no API cost)
 *
 * The held-back set needs ALLOW_HELDOUT=1, so it cannot be run by accident while the prompt is being improved.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateCasePack, MODELS as MODEL_IDS, type CasePackRun, type ModelKey } from "../src/lib/casepack";
import { PROMPT_VERSION } from "../src/lib/prompts/casepack-v4";
import { listCaseIds } from "../src/lib/data";
import { formatSummary, scoreRun, summarise, type AnswerKey, type CaseScore } from "./score";

const ROOT = path.resolve(__dirname, "..");
const AS_OF = "2026-11-09";

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

function loadKey(id: string): AnswerKey {
  return JSON.parse(readFileSync(path.join(ROOT, "evals/answer-key", `${id}.json`), "utf8"));
}

async function pool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** Machine-readable summary for the "How this works" page. Only the first repeat's per-measure results. */
function writeSummaryJson(file: string, meta: Record<string, unknown>, byRepeat: CaseScore[][]) {
  writeFileSync(file, JSON.stringify({ ...meta, generated: new Date().toISOString(), repeats: byRepeat.map(summarise) }, null, 2));
}

function report(title: string, runsDir: string, byRepeat: CaseScore[][], failures: string[]): string {
  const lines = [`# ${title}`, ``, `Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC by evals/run-eval.ts. Raw runs: \`${path.relative(ROOT, runsDir)}\`.`, ``];
  byRepeat.forEach((scores, r) => {
    if (byRepeat.length > 1) lines.push(`## Repeat ${r + 1}`, ``);
    lines.push(...formatSummary(summarise(scores)), ``);
  });
  if (byRepeat.length > 1) {
    const all = byRepeat.map(summarise);
    const spread = (f: (s: ReturnType<typeof summarise>) => number) => {
      const xs = all.map(f);
      return `${(100 * Math.min(...xs)).toFixed(0)}% to ${(100 * Math.max(...xs)).toFixed(0)}%`;
    };
    lines.push(`## Spread across ${byRepeat.length} repeats`, ``, `| Measure | Range |`, `|---|---|`,
      `| Team | ${spread((s) => s.team)} |`, `| Clock | ${spread((s) => s.clock)} |`, `| Vulnerability | ${spread((s) => s.vulnerability)} |`,
      `| Policy recall | ${spread((s) => s.policyRecall)} |`, `| Missing-info recall | ${spread((s) => s.missingRecall)} |`,
      `| Quotes verified | ${spread((s) => s.supportedRate)} |`, ``);
  }
  lines.push(`## Per case (repeat 1)`, ``, `| Case | Team | Clock | Vuln | Policy | Gaps found | Red | Notes |`, `|---|---|---|---|---|---|---|---|`);
  for (const s of byRepeat[0]) {
    const tick = (b: boolean) => (b ? "yes" : "**no**");
    lines.push(`| ${s.id} | ${tick(s.team)} | ${tick(s.clock)} | ${tick(s.vulnerability)} | ${(100 * s.policyRecall).toFixed(0)}% | ${(100 * s.missingRecall).toFixed(0)}% | ${s.unsupported} | ${s.notes.join("; ")} |`);
  }
  if (failures.length) lines.push(``, `## Failed runs`, ...failures.map((f) => `- ${f}`));
  return lines.join("\n") + "\n";
}

async function main() {
  const rescore = arg("rescore", "");
  if (rescore) {
    const dir = path.resolve(rescore);
    const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
    const repeats = [...new Set(files.map((f) => f.split(".")[1]))].sort();
    const byRepeat = repeats.map((r) =>
      files.filter((f) => f.split(".")[1] === r).sort().map((f) => {
        const run: CasePackRun = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
        return scoreRun(run, loadKey(run.caseId));
      }),
    );
    const md = report(`Re-scored: ${path.basename(dir)}`, dir, byRepeat, []);
    const [split, model] = path.basename(dir).split("-");
    const first: CasePackRun = JSON.parse(readFileSync(path.join(dir, files[0]), "utf8"));
    writeSummaryJson(path.join(ROOT, "evals/results", `summary-${split}-${model}.json`), { split, model: first.model, promptVersion: first.promptVersion, runs: path.relative(ROOT, dir) }, byRepeat);
    writeFileSync(path.join(dir, "..", "..", `eval-${path.basename(dir)}.md`), md);
    console.log(md);
    return;
  }

  const split = arg("split", "dev") as "dev" | "heldout";
  const model = arg("model", "haiku") as ModelKey;
  const repeats = Number(arg("repeats", "1"));
  const concurrency = Number(arg("concurrency", "5"));
  const only = arg("cases", "");
  if (split === "heldout" && process.env.ALLOW_HELDOUT !== "1") {
    console.error("The held-back set is only run in the final evaluation. Set ALLOW_HELDOUT=1 to confirm.");
    process.exit(1);
  }
  const ids = only ? only.split(",") : listCaseIds(split);
  const label = `${split}-${model}-${new Date().toISOString().slice(0, 16).replaceAll(":", "").replace("T", "-")}`;
  const runsDir = path.join(ROOT, "evals/results/runs", label);
  if (!existsSync(runsDir)) mkdirSync(runsDir, { recursive: true });

  const failures: string[] = [];
  const byRepeat: CaseScore[][] = [];
  for (let r = 1; r <= repeats; r++) {
    const scores = await pool(ids, concurrency, async (id) => {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const run = await generateCasePack(id, { model, asOf: AS_OF });
          writeFileSync(path.join(runsDir, `${id}.r${r}.json`), JSON.stringify(run, null, 2));
          const s = scoreRun(run, loadKey(id));
          console.log(`r${r} ${id} done in ${(run.usage.latencyMs / 1000).toFixed(0)}s, $${run.usage.costUsd.toFixed(4)}${s.notes.length ? `, ${s.notes.length} note(s)` : ""}`);
          return s;
        } catch (e) {
          const msg = `r${r} ${id} attempt ${attempt}: ${e instanceof Error ? e.message : String(e)}`;
          console.error(msg);
          if (attempt === 2) failures.push(msg);
        }
      }
      return null;
    });
    byRepeat.push(scores.filter((s): s is CaseScore => s !== null));
  }
  const md = report(`Evaluation: ${split} set on ${model}, ${repeats} repeat(s)`, runsDir, byRepeat, failures);
  writeFileSync(path.join(ROOT, "evals/results", `eval-${label}.md`), md);
  writeSummaryJson(path.join(ROOT, "evals/results", `summary-${split}-${model}.json`), { split, model: MODEL_IDS[model], promptVersion: PROMPT_VERSION, runs: path.relative(ROOT, runsDir) }, byRepeat);
  console.log(md);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
