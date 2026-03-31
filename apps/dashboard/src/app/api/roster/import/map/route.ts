export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { connectPlatformDB, Tenant } from "@goparticipate/db";

/**
 * POST /api/roster/import/map — AI column mapping
 *
 * Body: { headers: string[], sampleRows: Record<string, string>[] }
 * Returns: { mapping: Record<string, string> }
 *   mapping keys = our fields, values = their column headers
 *
 * Uses tenant's BYO API key. Falls back to best-guess heuristic if no key.
 */

const TARGET_FIELDS = [
  { key: "firstName", label: "Player First Name", required: true },
  { key: "lastName", label: "Player Last Name", required: true },
  { key: "playerName", label: "Player Full Name (if not split)", required: false },
  { key: "jerseyNumber", label: "Jersey Number", required: false },
  { key: "position", label: "Position", required: false },
  { key: "dateOfBirth", label: "Date of Birth", required: false },
  { key: "parentName", label: "Parent/Guardian Name", required: false },
  { key: "parentEmail", label: "Parent/Guardian Email", required: false },
  { key: "parentPhone", label: "Parent/Guardian Phone", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "ageGroup", label: "Age Group / Division", required: false },
  { key: "topSize", label: "Top/Jersey Size", required: false },
  { key: "bottomSize", label: "Bottom/Shorts Size", required: false },
  { key: "shoeSize", label: "Shoe Size", required: false },
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const slug = h.get("x-tenant-slug");
  if (!slug) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { headers: fileHeaders, sampleRows } = body;

  if (!fileHeaders || !Array.isArray(fileHeaders)) {
    return NextResponse.json({ error: "headers array required" }, { status: 400 });
  }

  // Try AI mapping first
  await connectPlatformDB();
  const tenant = await Tenant.findOne({ slug }).select("settings").lean();
  const aiConfig = (tenant as any)?.settings?.ai;

  if (aiConfig?.apiKey) {
    try {
      const mapping = await aiMap(aiConfig, fileHeaders, sampleRows);
      return NextResponse.json({ mapping, method: "ai" });
    } catch (err) {
      console.error("[roster:import:map] AI mapping failed, falling back:", err);
    }
  }

  // Fallback: heuristic mapping
  const mapping = heuristicMap(fileHeaders);
  return NextResponse.json({ mapping, method: "heuristic" });
}

async function aiMap(
  aiConfig: { apiKey: string; model?: string },
  fileHeaders: string[],
  sampleRows: Record<string, string>[],
): Promise<Record<string, string>> {
  const model = aiConfig.model || "claude-sonnet-4-6";

  const prompt = `Map spreadsheet columns to roster fields.

Spreadsheet columns: ${JSON.stringify(fileHeaders)}
Sample data (first 3 rows): ${JSON.stringify(sampleRows?.slice(0, 3))}

Target fields:
${TARGET_FIELDS.map((f) => `- "${f.key}": ${f.label}`).join("\n")}

Return a JSON object where keys are target field names and values are the matching spreadsheet column names. Only include fields that have a match. If a column has the full name (first + last combined), map it to "playerName".

Return ONLY valid JSON, no explanation.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": aiConfig.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) throw new Error(`AI API error: ${res.status}`);

  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI did not return valid JSON");

  return JSON.parse(jsonMatch[0]);
}

function heuristicMap(fileHeaders: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lower = fileHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  const patterns: [string, RegExp[]][] = [
    ["firstName", [/^first/, /^fname/, /^playerfirst/]],
    ["lastName", [/^last/, /^lname/, /^playerlast/]],
    ["playerName", [/^name$/, /^playername/, /^player$/, /^fullname/]],
    ["jerseyNumber", [/jersey/, /number/, /^no$/, /^num$/]],
    ["position", [/^pos/, /position/]],
    ["dateOfBirth", [/^dob/, /birth/, /^bday/, /^date.*birth/]],
    ["parentName", [/parent.*name/, /guardian.*name/, /^mother/, /^father/]],
    ["parentEmail", [/parent.*email/, /guardian.*email/, /^email/]],
    ["parentPhone", [/parent.*phone/, /guardian.*phone/, /^phone/, /^cell/, /^mobile/]],
    ["gender", [/^gender/, /^sex$/]],
    ["ageGroup", [/^age.*group/, /^division/, /^agegroup/, /^grade/]],
    ["topSize", [/^top/, /^jersey.*size/, /^shirt/]],
    ["bottomSize", [/^bottom/, /^short/, /^pant/]],
    ["shoeSize", [/^shoe/]],
  ];

  for (const [field, regexes] of patterns) {
    for (let i = 0; i < lower.length; i++) {
      if (regexes.some((r) => r.test(lower[i]!))) {
        if (!Object.values(mapping).includes(fileHeaders[i]!)) {
          mapping[field] = fileHeaders[i]!;
          break;
        }
      }
    }
  }

  return mapping;
}
