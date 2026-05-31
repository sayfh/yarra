import ExcelJS from "exceljs";
import type { Deal } from "../types";
import { INPUT_MAP, UNIT_MIX_ROWS } from "./mapping";

/**
 * Load the user's Excel template, overwrite the input cells with values from the
 * current Deal, and return the modified workbook bytes. Formulas in cells we do
 * not touch are preserved verbatim; Excel will recalculate them on open because
 * we flip the `fullCalcOnLoad` workbook flag.
 */
export async function writeDealToTemplate(
  deal: Deal,
  templateBuffer: ArrayBuffer | Uint8Array | Buffer,
): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(templateBuffer as ArrayBuffer);

  // Force Excel to recompute everything on open since we modified inputs.
  const calcProps = wb.calcProperties as { fullCalcOnLoad?: boolean } | undefined;
  if (calcProps) calcProps.fullCalcOnLoad = true;

  let cellsWritten = 0;
  const skipped: Array<{ sheet: string; cell: string; reason: string }> = [];

  // ---- Scalar inputs ----
  for (const m of INPUT_MAP) {
    const ws = wb.getWorksheet(m.sheet);
    if (!ws) {
      skipped.push({ sheet: m.sheet, cell: m.cell, reason: "sheet missing in template" });
      continue;
    }
    const value = readDotPath(deal as unknown as Record<string, unknown>, m.path);
    if (value === undefined || value === null) {
      skipped.push({ sheet: m.sheet, cell: m.cell, reason: `deal.${m.path} is empty` });
      continue;
    }
    setCellValue(ws, m.cell, value, m.transform);
    cellsWritten++;
  }

  // ---- Unit mix ----
  const unitMixSheet = wb.getWorksheet("Unit Mix");
  if (unitMixSheet) {
    for (const { unitKey, row } of UNIT_MIX_ROWS) {
      const u = (deal.units as Record<string, { beds: number; count: number; avgSF: number; rentPerBed: number }>)[unitKey];
      if (!u) continue;
      setCellValue(unitMixSheet, `B${row}`, u.beds);
      setCellValue(unitMixSheet, `C${row}`, u.count);
      setCellValue(unitMixSheet, `E${row}`, u.avgSF);
      setCellValue(unitMixSheet, `N${row}`, u.rentPerBed);
      cellsWritten += 4;
    }
  }

  // We could write a hidden audit log sheet here, but it would clutter the
  // template — left for the database/audit-trail session.
  void skipped;
  void cellsWritten;

  const out = await wb.xlsx.writeBuffer();
  return new Uint8Array(out as ArrayBuffer);
}

/**
 * Set a cell value, applying the same transform conventions used when reading
 * (dates round-trip through ISO strings, etc.). Overwrites formulas with literal
 * values for input cells — that's intentional, since INPUT_MAP entries describe
 * Excel cells the modeller would type into by hand.
 */
function setCellValue(
  ws: ExcelJS.Worksheet,
  addr: string,
  value: unknown,
  transform?: string,
): void {
  if (value === undefined || value === null) return;
  const cell = ws.getCell(addr);
  if (transform === "asDateISO" && typeof value === "string") {
    cell.value = new Date(value);
    return;
  }
  // ExcelJS happily accepts number | string | Date | boolean here.
  cell.value = value as ExcelJS.CellValue;
}

function readDotPath(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cursor: unknown = obj;
  for (const p of parts) {
    if (cursor == null || typeof cursor !== "object") return undefined;
    cursor = (cursor as Record<string, unknown>)[p];
  }
  return cursor;
}
