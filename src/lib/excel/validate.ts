import { computeDeal } from "../calc/engine";
import type { ComputedDeal, Deal } from "../types";
import { OUTPUT_REFS, type OutputRef } from "./mapping";

export interface ValidationRow {
  key: string;
  label: string;
  cell: string;
  excelValue: number | null;
  engineValue: number;
  absDiff: number;
  relDiff: number;
  tolerance: number;
  status: "match" | "tolerable" | "mismatch" | "missing";
}

export interface ValidationReport {
  rows: ValidationRow[];
  summary: { matched: number; tolerable: number; mismatched: number; missing: number };
}

/** Pull the corresponding engine value for an output ref. */
function engineLookup(c: ComputedDeal, key: string): number {
  switch (key) {
    case "gfa": return c.massing.gfa;
    case "nla": return c.massing.nla;
    case "efficiency": return c.massing.efficiency;
    case "totalUnits": return c.massing.totalUnits;
    case "totalBeds": return c.massing.totalBeds;
    case "hardConstruction": return c.costs.hard.construction;
    case "hardCMFee": return c.costs.hard.cmFee;
    case "hardContingency": return c.costs.hard.contingency;
    case "totalHard": return c.costs.hard.total;
    case "totalLand": return c.costs.land.total;
    case "totalSoft": return c.costs.soft.total;
    case "totalFinancing": return c.costs.financing.total;
    case "totalProjectCost": return c.costs.totalProjectCost;
    case "equity": return c.sources.equity;
    case "constructionLoan": return c.sources.constructionLoan;
    case "deferredDCs": return c.sources.deferredDCs;
    case "stabNOI": return c.rental.stabilizationNOI;
    case "stabValue": return c.rental.stabilizationValue;
    case "takeoutSized": return c.takeout.sized;
    case "netDispositionProceeds": return c.waterfall.netDispositionProceeds;
    default: return NaN;
  }
}

export function buildValidationReport(deal: Deal, excelValues: Record<string, number | null>): ValidationReport {
  const c = computeDeal(deal);
  const rows: ValidationRow[] = [];
  let matched = 0, tolerable = 0, mismatched = 0, missing = 0;

  for (const ref of OUTPUT_REFS) {
    const excelValue = excelValues[ref.key] ?? null;
    const engineValue = engineLookup(c, ref.key);
    const tolerance = ref.tolerance ?? 0.01;
    let status: ValidationRow["status"] = "missing";
    let absDiff = 0, relDiff = 0;
    if (excelValue === null || !isFinite(excelValue)) {
      status = "missing";
      missing++;
    } else {
      absDiff = engineValue - excelValue;
      const denom = Math.max(Math.abs(excelValue), 1);
      relDiff = Math.abs(absDiff) / denom;
      if (Math.abs(absDiff) < 1e-6) {
        status = "match";
        matched++;
      } else if (relDiff <= tolerance) {
        status = "tolerable";
        tolerable++;
      } else {
        status = "mismatch";
        mismatched++;
      }
    }
    rows.push({
      key: ref.key,
      label: ref.label,
      cell: `${ref.sheet}!${ref.cell}`,
      excelValue,
      engineValue,
      absDiff,
      relDiff,
      tolerance,
      status,
    });
  }

  return { rows, summary: { matched, tolerable, mismatched, missing } };
}

/** Convenience re-export so callers don't need to import from mapping directly. */
export { OUTPUT_REFS };
export type { OutputRef };
