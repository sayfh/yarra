/**
 * Standalone validation script. Loads an Excel template, runs our calc engine,
 * and prints a side-by-side diff vs. the resolved values in the workbook.
 *
 * Usage:  npx tsx scripts/validate.ts path/to/template.xlsx
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseWorkbook } from "../src/lib/excel/parser";
import { buildValidationReport } from "../src/lib/excel/validate";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: tsx scripts/validate.ts <path-to-xlsx>");
    process.exit(1);
  }
  const absolute = resolve(filePath);
  const buffer = await readFile(absolute);
  const { parsed, outputs } = await parseWorkbook(buffer);
  const report = buildValidationReport(parsed.deal, outputs.values);

  console.log(`\nValidation report for ${absolute}\n`);
  console.log(`Inputs read: ${parsed.cellsRead}, missing: ${parsed.missingCells.length}`);
  if (parsed.missingCells.length > 0) {
    console.log("\nMissing input cells:");
    for (const m of parsed.missingCells.slice(0, 30)) {
      console.log(`  - ${m.sheet}!${m.cell} (${m.path}): ${m.reason}`);
    }
  }

  console.log("\nOutput comparison:");
  console.log(
    "  STATUS    LABEL".padEnd(60) +
    "EXCEL".padStart(18) +
    "ENGINE".padStart(18) +
    "Δ%".padStart(10) +
    "  CELL",
  );
  for (const row of report.rows) {
    const status = formatStatus(row.status);
    const excel = row.excelValue == null ? "—" : fmtNum(row.excelValue);
    const engine = fmtNum(row.engineValue);
    const rel = row.excelValue == null ? "" : `${(row.relDiff * 100).toFixed(2)}%`;
    console.log(
      `  ${status}  ${row.label.padEnd(50).slice(0, 50)}` +
      excel.padStart(18) +
      engine.padStart(18) +
      rel.padStart(10) +
      `  ${row.cell}`,
    );
  }

  console.log(
    `\nSummary: ${report.summary.matched} match · ${report.summary.tolerable} tolerable · ` +
    `${report.summary.mismatched} mismatch · ${report.summary.missing} missing`,
  );
  process.exit(report.summary.mismatched > 0 ? 1 : 0);
}

function formatStatus(s: string): string {
  switch (s) {
    case "match": return "MATCH    ";
    case "tolerable": return "TOLERABLE";
    case "mismatch": return "MISMATCH ";
    case "missing": return "MISSING  ";
    default: return s.padEnd(9);
  }
}

function fmtNum(n: number): string {
  if (!isFinite(n)) return "n/a";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(4);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
