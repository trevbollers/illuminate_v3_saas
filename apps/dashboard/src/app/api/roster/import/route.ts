export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { headers } from "next/headers";
import { connectTenantDB, registerOrgModels, getOrgModels, connectPlatformDB, Player, Family } from "@goparticipate/db";

interface CSVRow {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender?: string;
  jerseyNumber?: string;
  position?: string;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  medicalNotes?: string;
}

interface ImportResult {
  row: number;
  playerName: string;
  status: "created" | "added" | "duplicate" | "error";
  message: string;
}

// POST /api/roster/import — bulk import players from CSV data
export async function POST(req: NextRequest): Promise<NextResponse> {
  const h = await headers();
  const tenantSlug = h.get("x-tenant-slug");
  const userIdStr = h.get("x-user-id");
  if (!tenantSlug || !userIdStr) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { teamId, rows } = body as { teamId: string; rows: CSVRow[] };

  if (!teamId || !Types.ObjectId.isValid(teamId)) {
    return NextResponse.json({ error: "Invalid team ID" }, { status: 400 });
  }

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "No rows provided" }, { status: 400 });
  }

  if (rows.length > 100) {
    return NextResponse.json({ error: "Maximum 100 players per import" }, { status: 400 });
  }

  const conn = await connectTenantDB(tenantSlug, "organization");
  registerOrgModels(conn);
  const models = getOrgModels(conn);

  // Verify team exists
  const team = await models.Team.findById(teamId).lean();
  if (!team || !(team as any).isActive) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  await connectPlatformDB();

  const userId = new Types.ObjectId(userIdStr);
  const results: ImportResult[] = [];
  let created = 0;
  let duplicates = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;
    const rowNum = i + 1;
    const playerName = `${row.firstName?.trim() || ""} ${row.lastName?.trim() || ""}`.trim();

    // Validate required fields
    if (!row.firstName?.trim() || !row.lastName?.trim() || !row.dateOfBirth?.trim()) {
      results.push({
        row: rowNum,
        playerName: playerName || `Row ${rowNum}`,
        status: "error",
        message: "Missing required fields (firstName, lastName, dateOfBirth)",
      });
      errors++;
      continue;
    }

    // Validate date
    const dob = new Date(row.dateOfBirth);
    if (isNaN(dob.getTime())) {
      results.push({
        row: rowNum,
        playerName,
        status: "error",
        message: "Invalid date of birth format",
      });
      errors++;
      continue;
    }

    try {
      // Create family for this player
      const familyName = row.guardianName
        ? `${row.guardianName.split(" ").pop()} Family`
        : `${row.lastName.trim()} Family`;

      const family = await Family.create({
        name: familyName,
        guardianUserIds: [userId],
        playerIds: [],
      });

      // Build emergency contacts
      const emergencyContacts = [];
      if (row.emergencyContactName?.trim() && row.emergencyContactPhone?.trim()) {
        emergencyContacts.push({
          name: row.emergencyContactName.trim(),
          relationship: row.emergencyContactRelationship?.trim() || "Guardian",
          phone: row.emergencyContactPhone.trim(),
        });
      }

      // Create player
      const player = await Player.create({
        firstName: row.firstName.trim(),
        lastName: row.lastName.trim(),
        dateOfBirth: dob,
        gender: row.gender?.trim().toLowerCase() || undefined,
        familyId: family._id,
        guardianUserIds: [userId],
        emergencyContacts,
        medical: {
          notes: row.medicalNotes?.trim() || undefined,
        },
        verificationStatus: "unverified",
        isActive: true,
      });

      // Update family with player
      await Family.findByIdAndUpdate(family._id, {
        $push: { playerIds: player._id },
      });

      // Check for duplicate roster entry
      const existingRoster = await models.Roster.findOne({
        teamId: new Types.ObjectId(teamId),
        playerId: player._id,
        status: "active",
      }).lean();

      if (existingRoster) {
        results.push({
          row: rowNum,
          playerName,
          status: "duplicate",
          message: "Player already on roster",
        });
        duplicates++;
        continue;
      }

      // Add to roster
      await models.Roster.create({
        teamId: new Types.ObjectId(teamId),
        playerId: player._id,
        playerName,
        jerseyNumber: row.jerseyNumber ? parseInt(row.jerseyNumber, 10) : undefined,
        position: row.position?.trim() || undefined,
        status: "active",
        joinedAt: new Date(),
      });

      results.push({
        row: rowNum,
        playerName,
        status: "created",
        message: "Player created and added to roster",
      });
      created++;
    } catch (err: any) {
      results.push({
        row: rowNum,
        playerName,
        status: "error",
        message: err.message || "Unknown error",
      });
      errors++;
    }
  }

  return NextResponse.json({
    summary: { total: rows.length, created, duplicates, errors },
    results,
  });
}
