import { NextRequest, NextResponse } from "next/server";
import { parseWorkbook } from "@/lib/excel/parser";
import { buildValidationReport } from "@/lib/excel/validate";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Validation pipeline: accepts an .xlsx upload, parses it into a Deal, runs
 * our calc engine, then diffs engine outputs against the resolved values in
 * the workbook. Returns a per-cell report.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { parsed, outputs } = await parseWorkbook(buffer);
    const report = buildValidationReport(parsed.deal, outputs.values);
    return NextResponse.json({
      report,
      stats: { cellsRead: parsed.cellsRead, missingCount: parsed.missingCells.length },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
