export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import * as XLSX from "xlsx";

/**
 * POST /api/roster/import/parse — upload CSV/XLS/XLSX, return headers + rows
 *
 * FormData: file (CSV, XLS, or XLSX)
 * Returns: { headers: string[], rows: Record<string, string>[], totalRows: number }
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream", // some browsers send this for .csv
  ];
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!allowedTypes.includes(file.type) && !["csv", "xls", "xlsx"].includes(ext || "")) {
    return NextResponse.json({ error: "Invalid file type. Upload CSV, XLS, or XLSX." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "No sheets found in file" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName]!;
    const allRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
      raw: false,
    });

    if (allRows.length === 0) {
      return NextResponse.json({ error: "File is empty or has no data rows" }, { status: 400 });
    }

    const fileHeaders = Object.keys(allRows[0]!);
    // Return first 5 rows as sample for mapping preview
    const sampleRows = allRows.slice(0, 5);

    return NextResponse.json({
      headers: fileHeaders,
      rows: sampleRows,
      totalRows: allRows.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: `Failed to parse file: ${err.message}` }, { status: 400 });
  }
}
