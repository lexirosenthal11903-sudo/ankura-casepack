/**
 * Runs one case through the real model and saves the full result.
 * Run: npx tsx --env-file=.env evals/run-one.ts HV-001 [haiku|sonnet]
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { generateCasePack, type ModelKey } from "../src/lib/casepack";
import { loadCase } from "../src/lib/data";

async function main() {
  const id = process.argv[2] ?? "HV-001";
  const model = (process.argv[3] ?? "haiku") as ModelKey;
  if (loadCase(id).split === "heldout" && process.env.ALLOW_HELDOUT !== "1") {
    console.error(`${id} is a held-back case. It is only run in the final evaluation.`);
    process.exit(1);
  }
  const run = await generateCasePack(id, { model, asOf: "2026-11-09" });
  const dir = path.resolve(__dirname, "results/runs");
  mkdirSync(dir, { recursive: true });
  const stamp = run.createdAt.replaceAll(":", "-").replaceAll(".", "-");
  const file = path.join(dir, `${id}.${model}.${stamp}.json`);
  writeFileSync(file, JSON.stringify(run, null, 2));

  const c = run.checks;
  const u = run.usage;
  console.log(`${id} on ${run.model} (${run.promptVersion}) in ${(u.latencyMs / 1000).toFixed(1)}s, cost $${u.costUsd.toFixed(4)}`);
  console.log(`tokens: in ${u.inputTokens}, out ${u.outputTokens}, cache read ${u.cacheReadTokens}, cache write ${u.cacheWriteTokens}`);
  console.log(`statements: ${c.supportedCount} supported, ${c.unsupportedCount} unsupported. invented placeholders: ${c.inventedPlaceholders.join(", ") || "none"}`);
  console.log(`team ${run.pack.intake.suggested_team}, clock ${run.clock}, due ${run.deadlines.workingDue}, checklist ${c.checklist.present}/${c.checklist.required}, missing: ${c.checklist.missing.join(", ")}`);
  for (const s of c.statements.filter((x) => !x.supported)) {
    console.log(`  RED ${s.path}: ${s.citations.map((x) => `${x.source} ${x.result} "${x.quote}"`).join(" | ")}`);
  }
  console.log(`saved ${path.relative(process.cwd(), file)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
