import ExcelJS from "exceljs";
import { seedDeal } from "../seed";
import type { Deal, UnitTypeKey } from "../types";
import { INPUT_MAP, UNIT_MIX_ROWS, OUTPUT_REFS, type OutputRef } from "./mapping";

export interface ParseResult {
  deal: Deal;
  /** Number of cell mappings that resolved to a usable value. */
  cellsRead: number;
  /** Cells that were missing, blank, or had formula errors. */
  missingCells: Array<{ sheet: string; cell: string; path: string; reason: string }>;
}

export interface ExcelOutputs {
  /** Map from OutputRef.key to the resolved numeric value in the workbook. */
  values: Record<string, number | null>;
}

/**
 * Read a workbook buffer and produce a Deal plus the resolved values of the
 * outputs we want to validate against. Starts from the seed Deal so any cells
 * we couldn't read keep sensible defaults.
 */
export async function parseWorkbook(
  buffer: ArrayBuffer | Buffer | Uint8Array,
): Promise<{ parsed: ParseResult; outputs: ExcelOutputs }> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ArrayBuffer);

  const sheetsByName = new Map<string, ExcelJS.Worksheet>();
  wb.worksheets.forEach((ws) => sheetsByName.set(ws.name, ws));

  // Start from the seed so unmapped fields retain template defaults.
  const deal: Deal = structuredClone(seedDeal);
  let cellsRead = 0;
  const missingCells: ParseResult["missingCells"] = [];

  // ---- Scalar input mappings ----
  for (const m of INPUT_MAP) {
    const ws = sheetsByName.get(m.sheet);
    if (!ws) {
      missingCells.push({ sheet: m.sheet, cell: m.cell, path: m.path, reason: "sheet not found" });
      continue;
    }
    const raw = readCellValue(ws, m.cell);
    if (raw === undefined || raw === null || raw === "") {
      missingCells.push({ sheet: m.sheet, cell: m.cell, path: m.path, reason: "blank" });
      continue;
    }
    const transformed = transformValue(raw, m.transform);
    if (transformed === undefined) {
      missingCells.push({ sheet: m.sheet, cell: m.cell, path: m.path, reason: `unparseable: ${JSON.stringify(raw)}` });
      continue;
    }
    try {
      assignDotPath(deal as unknown as Record<string, unknown>, m.path, transformed);
      cellsRead++;
    } catch (e) {
      missingCells.push({
        sheet: m.sheet,
        cell: m.cell,
        path: m.path,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // ---- Unit mix ----
  const unitMixSheet = sheetsByName.get("Unit Mix");
  if (unitMixSheet) {
    for (const { unitKey, row } of UNIT_MIX_ROWS) {
      // Unit Mix sheet: col B beds, C count, E SF/unit, N rent/bed.
      const beds = toNum(readCellValue(unitMixSheet, `B${row}`));
      const count = toNum(readCellValue(unitMixSheet, `C${row}`));
      const avgSF = toNum(readCellValue(unitMixSheet, `E${row}`));
      const rentPerBed = toNum(readCellValue(unitMixSheet, `N${row}`));
      const u = (deal.units as Record<string, { beds: number; count: number; avgSF: number; rentPerBed: number }>)[unitKey];
      if (!u) continue;
      if (beds !== null) u.beds = beds;
      if (count !== null) u.count = count;
      if (avgSF !== null) u.avgSF = avgSF;
      if (rentPerBed !== null) u.rentPerBed = rentPerBed;
      cellsRead += 4;
    }
  }

  // ---- Deal id/name from address ----
  if (deal.property.address) {
    deal.id = slug(deal.property.address);
    deal.name = deal.property.address;
  }

  // ---- Output values for validation ----
  const outputs: ExcelOutputs = { values: {} };
  for (const ref of OUTPUT_REFS) {
    const ws = sheetsByName.get(ref.sheet);
    if (!ws) {
      outputs.values[ref.key] = null;
      continue;
    }
    const raw = readCellValue(ws, ref.cell);
    const n = toNum(raw);
    outputs.values[ref.key] = n;
  }

  // Touch UnitTypeKey to keep tsc happy on the type import.
  const _exhaustive: UnitTypeKey = "fourBed";
  void _exhaustive;

  return { parsed: { deal, cellsRead, missingCells }, outputs };
}

/* ---------- Cell helpers ---------- */

function readCellValue(ws: ExcelJS.Worksheet, addr: string): ExcelJS.CellValue | undefined {
  const cell = ws.getCell(addr);
  // ExcelJS exposes formulas as { result, formula } — prefer result.
  const v = cell.value;
  if (v === null || v === undefined) return undefined;
  if (typeof v === "object" && "result" in v) {
    const r = (v as { result?: ExcelJS.CellValue }).result;
    if (r === null || r === undefined) return undefined;
    return r;
  }
  if (typeof v === "object" && "error" in v) {
    return undefined; // #REF! / #N/A / etc.
  }
  return v;
}

function transformValue(v: ExcelJS.CellValue, kind?: CellMapTransform): unknown {
  switch (kind) {
    case "asNumber":
      return toNum(v);
    case "asString":
      return v == null ? undefined : String(v);
    case "asDateISO":
      return toDateISO(v);
    default:
      return v;
  }
}

type CellMapTransform = "asNumber" | "asString" | "asDateISO";

function toNum(v: ExcelJS.CellValue | undefined): number | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^0-9.\-]/g, "");
    if (!cleaned) return null;
    const n = Number(cleaned);
    return isFinite(n) ? n : null;
  }
  if (typeof v === "object") {
    if ("result" in v) {
      const r = (v as { result?: ExcelJS.CellValue }).result;
      return r === undefined ? null : toNum(r);
    }
    if (v instanceof Date) return v.getTime();
  }
  return null;
}

function toDateISO(v: ExcelJS.CellValue | undefined): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  if (typeof v === "number") {
    // Excel serial date (days since 1899-12-30).
    const ms = (v - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return undefined;
}

function assignDotPath(target: Record<string, unknown>, path: string, value: unknown): void {
  if (value === undefined) return;
  const parts = path.split(".");
  let cursor: Record<string, unknown> = target;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cursor[parts[i]];
    if (next === undefined || next === null || typeof next !== "object") {
      throw new Error(`Path missing: ${parts.slice(0, i + 1).join(".")}`);
    }
    cursor = next as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "deal";
}

/* Re-export for validation script convenience. */
export type { OutputRef };
