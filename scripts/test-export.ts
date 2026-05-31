/**
 * Smoke test for the Excel export round-trip.
 *   1. Load the template, parse it into a Deal.
 *   2. Mutate a few inputs (cap rate, construction cost, vacancy).
 *   3. Write the mutated Deal back into the template.
 *   4. Re-parse the exported file.
 *   5. Assert mutated inputs round-tripped, AND formula cells are still formulas
 *      (not stomped) by spot-checking a few computed addresses.
 *
 * Usage: tsx scripts/test-export.ts <path-to-template.xlsx>
 */

import ExcelJS from "exceljs";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseWorkbook } from "../src/lib/excel/parser";
import { writeDealToTemplate } from "../src/lib/excel/writer";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: tsx scripts/test-export.ts <path-to-xlsx>");
    process.exit(1);
  }
  const absolute = resolve(filePath);
  const inputBytes = await readFile(absolute);

  console.log("1. Parsing input template…");
  const { parsed } = await parseWorkbook(inputBytes);
  console.log(`   ${parsed.cellsRead} input cells read.`);
  console.log(`   Cap rate (start):       ${parsed.deal.rental.capRate}`);
  console.log(`   Construction $/SF:      ${parsed.deal.hard.constructionPerSF}`);
  console.log(`   Vacancy:                ${parsed.deal.rental.vacancyPct}`);

  console.log("\n2. Mutating Deal…");
  const mutated = structuredClone(parsed.deal);
  mutated.rental.capRate = 0.075;
  mutated.hard.constructionPerSF = 420;
  mutated.rental.vacancyPct = 0.08;

  console.log("\n3. Writing back to template…");
  const exported = await writeDealToTemplate(mutated, inputBytes);
  const outPath = resolve("/tmp/yarra-export-test.xlsx");
  await writeFile(outPath, Buffer.from(exported));
  console.log(`   Wrote ${exported.byteLength.toLocaleString()} bytes to ${outPath}`);

  console.log("\n4. Re-parsing exported file…");
  const { parsed: reparsed } = await parseWorkbook(exported);
  console.log(`   Cap rate (after):       ${reparsed.deal.rental.capRate}`);
  console.log(`   Construction $/SF:      ${reparsed.deal.hard.constructionPerSF}`);
  console.log(`   Vacancy:                ${reparsed.deal.rental.vacancyPct}`);

  console.log("\n5. Spot-checking formula preservation…");
  const wb = new ExcelJS.Workbook();
  // exceljs's type declarations are stricter than its runtime; the cast keeps
  // tsc happy without changing behaviour.
  await wb.xlsx.load(Buffer.from(exported) as unknown as ExcelJS.Buffer);
  const formulaChecks: Array<{ sheet: string; cell: string; label: string }> = [
    { sheet: "Sources & Uses", cell: "K27", label: "K27 Construction cost (=C27*C8)" },
    { sheet: "Sources & Uses", cell: "K34", label: "K34 CM fee (=C34*K27)" },
    { sheet: "Sources & Uses", cell: "K33", label: "K33 Hard contingency" },
    { sheet: "Sources & Uses", cell: "K90", label: "K90 Total Project Cost" },
    { sheet: "Rental Overview + Sensitivity", cell: "G51", label: "G51 Year-5 NOI" },
    { sheet: "Rental Overview + Sensitivity", cell: "G53", label: "G53 Stabilization Value" },
    { sheet: "Waterfall+ Exit Sensitivity", cell: "O26", label: "O26 Takeout loan sized" },
    { sheet: "Massing Yields", cell: "D15", label: "D15 GFA (=D13-D14)" },
  ];

  let preserved = 0;
  let stomped = 0;
  for (const check of formulaChecks) {
    const ws = wb.getWorksheet(check.sheet);
    const cell = ws?.getCell(check.cell);
    const v = cell?.value;
    const isFormula =
      typeof v === "object" && v !== null && ("formula" in v || "sharedFormula" in v);
    if (isFormula) {
      preserved++;
      const f = (v as { formula?: string; sharedFormula?: string }).formula
        ?? (v as { sharedFormula?: string }).sharedFormula;
      console.log(`   ✓ ${check.label} -> still formula: =${f}`);
    } else {
      stomped++;
      console.log(`   ✗ ${check.label} -> STOMPED, value is now ${JSON.stringify(v)}`);
    }
  }

  console.log(`\nResult: ${preserved}/${formulaChecks.length} formulas preserved.`);

  const passed =
    reparsed.deal.rental.capRate === 0.075 &&
    reparsed.deal.hard.constructionPerSF === 420 &&
    reparsed.deal.rental.vacancyPct === 0.08 &&
    stomped === 0;
  if (passed) {
    console.log("\nALL CHECKS PASSED.");
    process.exit(0);
  } else {
    console.log("\nSOME CHECKS FAILED.");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
