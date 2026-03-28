import { Connection, Types } from "mongoose";
import { connectPlatformDB } from "../connection";
import type { IUser } from "../models/user";
import type { IPlayer } from "../models/player";
import type { IRoster } from "../models/org/roster";
import type { ITeam } from "../models/org/team";

// ---------------------------------------------------------------------------
// Cross-DB recipient resolution
//
// Messages are stored in org tenant DBs, but recipients (parents/guardians)
// are platform-level users. This utility crosses the DB boundary at send time
// to resolve who should receive a message.
// ---------------------------------------------------------------------------

export interface ResolvedRecipient {
  userId: string;
  name: string;
  email: string;
  phone?: string;
  notificationPreferences: {
    emailMessages: boolean;
    smsUrgent: boolean;
    emailAnnouncements: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
}

type MessageChannel = "team" | "coaches" | "parents" | "org";

/**
 * Resolve the list of platform users who should receive a message.
 *
 * Resolution paths:
 *  - parents:  Roster → Player IDs → Player.guardianUserIds → Users
 *  - coaches:  Team.headCoachId + coachIds + managerIds → Users
 *  - team:     Union of parents + coaches
 *  - org:      All active teams → union of all team recipients, deduplicated
 */
export async function resolveRecipients(
  orgConn: Connection,
  channel: MessageChannel,
  teamId?: string
): Promise<ResolvedRecipient[]> {
  if (channel === "org") {
    return resolveOrgWide(orgConn);
  }

  if (!teamId) {
    throw new Error(`resolveRecipients: teamId is required for channel "${channel}"`);
  }

  const teamOid = new Types.ObjectId(teamId);

  switch (channel) {
    case "parents":
      return resolveParents(orgConn, teamOid);
    case "coaches":
      return resolveCoaches(orgConn, teamOid);
    case "team":
      return resolveTeamAll(orgConn, teamOid);
    default:
      throw new Error(`resolveRecipients: unknown channel "${channel}"`);
  }
}

// ---------------------------------------------------------------------------
// Channel resolvers
// ---------------------------------------------------------------------------

async function resolveParents(
  orgConn: Connection,
  teamId: Types.ObjectId
): Promise<ResolvedRecipient[]> {
  const Roster = orgConn.model<IRoster>("Roster");

  // Get active roster entries for this team
  const rosterEntries = await Roster.find({
    teamId,
    status: "active",
  }).lean();

  if (rosterEntries.length === 0) return [];

  const playerIds = rosterEntries.map((r) => r.playerId);

  // Cross to platform DB — look up players to get guardian user IDs
  const platformDb = await connectPlatformDB();
  const Player = platformDb.model<IPlayer>("Player");

  const players = await Player.find({
    _id: { $in: playerIds },
    isActive: true,
  }).lean();

  const guardianUserIds = new Set<string>();
  for (const player of players) {
    for (const gid of player.guardianUserIds) {
      guardianUserIds.add(gid.toString());
    }
  }

  if (guardianUserIds.size === 0) return [];

  return fetchUsers([...guardianUserIds]);
}

async function resolveCoaches(
  orgConn: Connection,
  teamId: Types.ObjectId
): Promise<ResolvedRecipient[]> {
  const Team = orgConn.model<ITeam>("Team");
  const team = await Team.findById(teamId).lean();
  if (!team) return [];

  const coachUserIds = new Set<string>();

  if (team.headCoachId) {
    coachUserIds.add(team.headCoachId.toString());
  }
  for (const id of team.coachIds) {
    coachUserIds.add(id.toString());
  }
  for (const id of team.managerIds) {
    coachUserIds.add(id.toString());
  }

  if (coachUserIds.size === 0) return [];

  return fetchUsers([...coachUserIds]);
}

async function resolveTeamAll(
  orgConn: Connection,
  teamId: Types.ObjectId
): Promise<ResolvedRecipient[]> {
  const [parents, coaches] = await Promise.all([
    resolveParents(orgConn, teamId),
    resolveCoaches(orgConn, teamId),
  ]);

  return deduplicateRecipients([...parents, ...coaches]);
}

async function resolveOrgWide(
  orgConn: Connection
): Promise<ResolvedRecipient[]> {
  const Team = orgConn.model<ITeam>("Team");
  const teams = await Team.find({ isActive: true }).lean();

  if (teams.length === 0) return [];

  // Resolve all teams in parallel
  const allRecipients = await Promise.all(
    teams.map((team) =>
      resolveTeamAll(orgConn, team._id as Types.ObjectId)
    )
  );

  return deduplicateRecipients(allRecipients.flat());
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchUsers(userIds: string[]): Promise<ResolvedRecipient[]> {
  const platformDb = await connectPlatformDB();
  const User = platformDb.model<IUser>("User");

  const objectIds = userIds.map((id) => new Types.ObjectId(id));
  const users = await User.find({ _id: { $in: objectIds } }).lean();

  return users.map((u) => ({
    userId: (u._id as Types.ObjectId).toString(),
    name: u.name,
    email: u.email,
    phone: u.phone,
    notificationPreferences: {
      emailMessages: u.notificationPreferences?.emailMessages ?? true,
      smsUrgent: u.notificationPreferences?.smsUrgent ?? false,
      emailAnnouncements: u.notificationPreferences?.emailAnnouncements ?? true,
      quietHoursStart: u.notificationPreferences?.quietHoursStart,
      quietHoursEnd: u.notificationPreferences?.quietHoursEnd,
    },
  }));
}

function deduplicateRecipients(
  recipients: ResolvedRecipient[]
): ResolvedRecipient[] {
  const seen = new Map<string, ResolvedRecipient>();
  for (const r of recipients) {
    if (!seen.has(r.userId)) {
      seen.set(r.userId, r);
    }
  }
  return [...seen.values()];
}
