import { NextRequest, NextResponse } from "next/server";
import { writeDealToTemplate } from "@/lib/excel/writer";
import type { Deal } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Accepts a multipart form with two fields:
 *   - template:  the original .xlsx the user uploaded (we don't store templates server-side)
 *   - deal:      JSON-serialised current Deal
 *
 * Writes the Deal's inputs back into the template (preserving formulas), and
 * returns the modified workbook as a binary download.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("template");
    const dealJSON = formData.get("deal");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing template file." }, { status: 400 });
    }
    if (typeof dealJSON !== "string") {
      return NextResponse.json({ error: "Missing deal payload." }, { status: 400 });
    }
    let deal: Deal;
    try {
      deal = JSON.parse(dealJSON) as Deal;
    } catch {
      return NextResponse.json({ error: "Deal payload is not valid JSON." }, { status: 400 });
    }
    const buffer = await file.arrayBuffer();
    const out = await writeDealToTemplate(deal, buffer);
    const safeName = (deal.name || "deal").replace(/[^a-z0-9-]+/gi, "_");
    // Convert to Buffer so Next.js NextResponse accepts it as BodyInit. The
    // round-trip preserves bytes 1:1.
    const body = Buffer.from(out);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeName}_yarra.xlsx"`,
        "Content-Length": String(body.byteLength),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
