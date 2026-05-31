import { NextRequest, NextResponse } from "next/server";
import { parseWorkbook } from "@/lib/excel/parser";

export const runtime = "nodejs";
export const maxDuration = 30; // seconds — workbooks can take a moment.

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds 25 MB limit." }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const { parsed, outputs } = await parseWorkbook(buffer);
    return NextResponse.json({
      deal: parsed.deal,
      stats: {
        cellsRead: parsed.cellsRead,
        missingCount: parsed.missingCells.length,
        missing: parsed.missingCells.slice(0, 20), // cap to avoid bloating the response
      },
      excelOutputs: outputs.values,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
