import { Types, Connection } from "mongoose";
import {
  connectPlatformDB,
  registerOrgModels,
  getOrgModels,
  User,
} from "@goparticipate/db";
import { sendEmail, sendSMS, detectSMSProvider } from "@goparticipate/email";

/**
 * Notify parents of all players on a team (or multiple teams).
 * Looks up roster → player → guardian users → sends email/SMS.
 *
 * Fire-and-forget — errors are logged, not thrown.
 */
export async function notifyTeamParents(
  orgConn: Connection,
  opts: {
    teamIds: string[];
    subject: string;
    body: string;
    smsBody?: string;
    urgent?: boolean;
  },
) {
  try {
    registerOrgModels(orgConn);
    const models = getOrgModels(orgConn);

    // Get all players on these teams
    const rosters = await models.Roster.find({
      teamId: { $in: opts.teamIds.map((id) => new Types.ObjectId(id)) },
      status: "active",
    })
      .select("playerId")
      .lean();

    const playerIds = [...new Set((rosters as any[]).map((r) => r.playerId.toString()))];
    if (playerIds.length === 0) return;

    // Get guardian user IDs from platform Player records
    await connectPlatformDB();
    const { Player } = await import("@goparticipate/db");
    const players = await Player.find({
      _id: { $in: playerIds.map((id) => new Types.ObjectId(id)) },
    })
      .select("guardianUserIds")
      .lean();

    const guardianIds = new Set<string>();
    for (const p of players as any[]) {
      for (const gid of p.guardianUserIds || []) {
        guardianIds.add(gid.toString());
      }
    }

    if (guardianIds.size === 0) return;

    // Get guardian contact info
    const guardians = await User.find({
      _id: { $in: [...guardianIds].map((id) => new Types.ObjectId(id)) },
    })
      .select("email phone notificationPreferences")
      .lean();

    const smsProvider = opts.urgent ? detectSMSProvider() : null;

    for (const guardian of guardians as any[]) {
      // Email
      if (guardian.email) {
        try {
          await sendEmail({
            to: guardian.email,
            subject: opts.subject,
            html: `
              <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:20px;">
                <h2 style="color:#1e293b;">${opts.subject}</h2>
                <p style="color:#475569;">${opts.body}</p>
                <p style="font-size:13px;color:#94a3b8;margin-top:20px;">— Go Participate</p>
              </div>
            `,
          });
        } catch (err) {
          console.error("[notify] email failed for", guardian.email, err);
        }
      }

      // SMS (urgent only)
      if (opts.urgent && smsProvider && guardian.phone) {
        try {
          await sendSMS({
            to: guardian.phone,
            body: opts.smsBody || `${opts.subject}: ${opts.body.slice(0, 120)}`,
          });
        } catch (err) {
          console.error("[notify] SMS failed for", guardian.phone, err);
        }
      }
    }
  } catch (err) {
    console.error("[notify] notifyTeamParents failed:", err);
  }
}
