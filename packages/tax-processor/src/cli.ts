import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, basename } from "node:path";
import { processVatReport, type PlanCode } from "./index.js";

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };

  const csvPath = get("--csv");
  const outDir = get("--out") || "./out";
  const plan = (get("--plan") || "0") as PlanCode;
  const period = get("--period") || "2025-MAR";
  const fileType = (get("--type") || "monthly") as "monthly" | "quarterly";

  if (!csvPath) {
    console.error("Usage: process --csv file.csv [--plan 0] [--period 2025-MAR] [--out ./out]");
    process.exit(1);
  }

  const csvText = readFileSync(resolve(csvPath), "utf8");
  const base = basename(csvPath).replace(/\.csv$/i, "");
  const result = await processVatReport(csvText, {
    planCode: plan,
    fileType,
    periodLabel: period,
    sourceFileName: basename(csvPath),
    pdf: { filerName: get("--filer") },
  });

  mkdirSync(outDir, { recursive: true });
  writeFileSync(resolve(outDir, `${base}.csvprocesado.json`), JSON.stringify(result.json, null, 2));
  writeFileSync(resolve(outDir, `${base}.csvprocesado.pdf`), result.pdf);
  writeFileSync(resolve(outDir, `${base}.csvprocesado.xlsx`), result.xlsx);
  console.log(`Wrote artifacts to ${outDir} (rows=${result.report.meta.totalRows}, processed=${result.report.meta.processedRows})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
