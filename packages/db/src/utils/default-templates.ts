/**
 * System default message templates.
 * Seeded into tenant DBs on first access if no templates exist.
 */

interface DefaultTemplate {
  name: string;
  description: string;
  category: "general" | "scheduling" | "payment" | "roster" | "event" | "safety";
  subject: string;
  body: string;
  context: "message" | "announcement";
  suggestedPriority?: "normal" | "urgent";
  suggestedAckOptions?: string[];
}

// --- Org Message Templates (for coaches, org admins) ---

export const ORG_MESSAGE_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Practice Cancelled",
    description: "Notify the team that practice has been cancelled",
    category: "scheduling",
    subject: "Practice Cancelled",
    body: `Hi team,

Unfortunately, practice scheduled for [DATE] at [LOCATION] has been cancelled due to [REASON].

Our next practice will be [NEXT DATE/TIME]. Please make sure to stay prepared and keep up with any at-home drills.

Let me know if you have any questions.`,
    context: "message",
    suggestedPriority: "urgent",
    suggestedAckOptions: ["Got it"],
  },
  {
    name: "Schedule Change",
    description: "Inform the team about a time or location change",
    category: "scheduling",
    subject: "Schedule Change",
    body: `Hi team,

We have a change to the schedule:

Event: [EVENT NAME]
Original: [ORIGINAL DATE/TIME/LOCATION]
Updated: [NEW DATE/TIME/LOCATION]

Reason: [REASON]

Please update your calendars. Let me know if this causes any conflicts.`,
    context: "message",
    suggestedAckOptions: ["Got it", "Can't make it"],
  },
  {
    name: "Game Reminder",
    description: "Remind the team about an upcoming game",
    category: "scheduling",
    subject: "Game Reminder",
    body: `Game day! Here are the details:

Opponent: [OPPONENT]
Date: [DATE]
Time: Arrive by [ARRIVAL TIME], game starts at [GAME TIME]
Location: [VENUE ADDRESS]

What to bring:
- Full uniform (jersey, shorts, socks)
- Water bottle
- Positive attitude!

See you there!`,
    context: "message",
    suggestedAckOptions: ["See you there!", "Can't make it"],
  },
  {
    name: "Payment Reminder",
    description: "Remind parents about outstanding dues or fees",
    category: "payment",
    subject: "Payment Reminder",
    body: `Hi,

This is a friendly reminder that [PAYMENT TYPE] of [AMOUNT] is due by [DUE DATE].

You can make your payment through the app or contact us if you need to discuss payment arrangements.

Thank you for your prompt attention to this.`,
    context: "message",
    suggestedAckOptions: ["Will pay", "Need to discuss"],
  },
  {
    name: "Welcome New Player",
    description: "Welcome a new player and their family to the team",
    category: "roster",
    subject: "Welcome to the Team!",
    body: `Welcome to [TEAM NAME]!

We're excited to have [PLAYER NAME] join our team this season. Here's what you need to know to get started:

Practice Schedule: [SCHEDULE]
Location: [LOCATION]
What to bring: [EQUIPMENT LIST]

Important dates:
- First practice: [DATE]
- First game: [DATE]

Please make sure to complete all registration forms in the app. Don't hesitate to reach out with any questions!`,
    context: "message",
  },
  {
    name: "Weather Delay",
    description: "Alert about weather-related delays or changes",
    category: "safety",
    subject: "Weather Update",
    body: `Weather alert for today's [EVENT TYPE]:

Due to [WEATHER CONDITION], we are [DELAYING/CANCELLING/MOVING INDOORS] today's event.

Updated plan: [NEW PLAN OR STATUS]

We will send another update by [TIME] if conditions change. Player safety is our top priority.

Stay safe!`,
    context: "message",
    suggestedPriority: "urgent",
    suggestedAckOptions: ["Got it"],
  },
  {
    name: "End of Season",
    description: "End of season wrap-up and thank you message",
    category: "general",
    subject: "End of Season Wrap-Up",
    body: `Team,

What a season! I want to thank every player and family for your commitment and support this [SEASON].

Season highlights:
- [HIGHLIGHT 1]
- [HIGHLIGHT 2]
- [HIGHLIGHT 3]

End of season celebration: [DATE/TIME/LOCATION]

Please return all team equipment by [DATE]. Registration for next season will open on [DATE].

It's been a privilege coaching this group. Thank you!`,
    context: "message",
  },
  {
    name: "Volunteer Request",
    description: "Ask parents to volunteer for an upcoming need",
    category: "general",
    subject: "Volunteers Needed",
    body: `Hi team families,

We need volunteers for [EVENT/NEED]:

Date: [DATE]
Time: [TIME]
Location: [LOCATION]
Roles needed: [DESCRIPTION OF ROLES]

If you can help, please respond below. We need [NUMBER] volunteers to make this happen.

Thank you for supporting our team!`,
    context: "message",
    suggestedAckOptions: ["I can help!", "Sorry, can't this time"],
  },
  {
    name: "Uniform/Equipment",
    description: "Information about uniforms or equipment distribution",
    category: "roster",
    subject: "Uniform & Equipment Info",
    body: `Hi team,

Uniforms/equipment will be distributed on [DATE] at [LOCATION] from [TIME].

Please bring:
- [REQUIREMENTS]

Sizing information:
- If you haven't submitted sizes, please do so by [DEADLINE]
- [SIZE GUIDE OR INSTRUCTIONS]

Cost: [AMOUNT] (if applicable)

Let me know if you have any questions about sizing or pickup.`,
    context: "message",
    suggestedAckOptions: ["Got it", "Need to discuss sizing"],
  },
  {
    name: "Tournament Details",
    description: "Share tournament logistics and schedule",
    category: "event",
    subject: "Tournament Details",
    body: `Tournament information:

Tournament: [TOURNAMENT NAME]
Dates: [DATES]
Location: [VENUE/ADDRESS]

Schedule:
- Game 1: [TIME] vs [OPPONENT] at [FIELD]
- Game 2: [TIME] vs [OPPONENT] at [FIELD]
- [ADDITIONAL GAMES]

Logistics:
- Arrival time: [TIME]
- Parking: [DETAILS]
- Check-in: [PROCESS]

What to bring:
- Full uniform, cleats, water, snacks
- [ADDITIONAL ITEMS]

Please confirm attendance by [DATE].`,
    context: "message",
    suggestedAckOptions: ["We'll be there!", "Can't make it"],
  },
];

// --- League Announcement Templates (for league admins) ---

export const LEAGUE_ANNOUNCEMENT_TEMPLATES: DefaultTemplate[] = [
  {
    name: "Schedule Update",
    description: "Notify organizations about schedule changes",
    category: "scheduling",
    subject: "Schedule Update",
    body: `Attention all registered organizations,

There has been an update to the schedule:

[DESCRIBE CHANGES]

Affected dates: [DATES]
Affected teams/divisions: [DETAILS]

Updated schedules are available in the platform. Please review and update your teams accordingly.

Contact us with any questions.`,
    context: "announcement",
  },
  {
    name: "Registration Open",
    description: "Announce that registration is open for an event",
    category: "event",
    subject: "Registration Now Open",
    body: `Registration is now open!

Event: [EVENT NAME]
Dates: [EVENT DATES]
Location: [VENUE]
Divisions: [DIVISION LIST]

Registration deadline: [DEADLINE]
Entry fee: [FEE]

Register your teams through the platform. Spots are limited — early registration is encouraged.

[ADDITIONAL DETAILS OR REQUIREMENTS]`,
    context: "announcement",
  },
  {
    name: "Rules & Compliance Update",
    description: "Communicate rule changes or compliance requirements",
    category: "event",
    subject: "Rules & Compliance Update",
    body: `Important update regarding rules and compliance:

[DESCRIBE CHANGES]

Effective date: [DATE]

What this means for your organization:
- [IMPACT 1]
- [IMPACT 2]

Required actions:
- [ACTION 1]
- [ACTION 2]

Deadline for compliance: [DATE]

Please review the updated rules in full on the platform. Non-compliance may affect eligibility.`,
    context: "announcement",
    suggestedPriority: "urgent",
  },
  {
    name: "Event Cancellation",
    description: "Announce cancellation of a league event",
    category: "scheduling",
    subject: "Event Cancellation Notice",
    body: `We regret to inform you that the following event has been cancelled:

Event: [EVENT NAME]
Original dates: [DATES]
Location: [VENUE]

Reason: [REASON]

Refund policy: [REFUND DETAILS]

[RESCHEDULED INFO IF APPLICABLE]

We apologize for any inconvenience. Please reach out with questions.`,
    context: "announcement",
    suggestedPriority: "urgent",
  },
  {
    name: "Verification Reminder",
    description: "Remind orgs to complete player verification",
    category: "roster",
    subject: "Player Verification Reminder",
    body: `Reminder: Player verification deadline is approaching.

Deadline: [DATE]
Event: [EVENT NAME]

Organizations with incomplete verifications:
- All rosters must be submitted and verified before [DEADLINE]
- Required documents: [DOCUMENT LIST]
- Players without completed verification will NOT be eligible to compete

Submit verification materials through the platform as soon as possible. Processing takes [TIMEFRAME].

Contact us if you have any issues with the verification process.`,
    context: "announcement",
  },
  {
    name: "Weather/Safety Alert",
    description: "Urgent safety or weather notification",
    category: "safety",
    subject: "Weather/Safety Alert",
    body: `IMPORTANT SAFETY NOTICE

Due to [CONDITION], the following actions are being taken:

[DESCRIBE ACTIONS — delays, cancellations, relocations]

Affected events: [LIST]
Affected dates: [DATES]

Safety instructions:
- [INSTRUCTION 1]
- [INSTRUCTION 2]

We will provide updates as the situation develops. Check the platform for real-time updates.

Player safety is our highest priority.`,
    context: "announcement",
    suggestedPriority: "urgent",
  },
  {
    name: "Season Wrap-Up",
    description: "End of season summary and next steps",
    category: "general",
    subject: "Season Wrap-Up",
    body: `The [SEASON/YEAR] season has officially concluded. Thank you to all participating organizations!

Season highlights:
- [NUMBER] teams competed across [NUMBER] divisions
- [HIGHLIGHT 1]
- [HIGHLIGHT 2]

Congratulations to our champions:
- [DIVISION]: [WINNER]

Next season:
- Registration opens: [DATE]
- Season starts: [DATE]
- Key changes: [CHANGES]

Thank you for being part of our league. See you next season!`,
    context: "announcement",
  },
];

/**
 * Seed default templates into a tenant DB if none exist.
 * Call this when templates are first accessed.
 */
export async function seedDefaultTemplates(
  MessageTemplate: any,
  context: "message" | "announcement"
): Promise<void> {
  const count = await MessageTemplate.countDocuments({ isSystem: true });
  if (count > 0) return;

  const templates =
    context === "message"
      ? ORG_MESSAGE_TEMPLATES
      : LEAGUE_ANNOUNCEMENT_TEMPLATES;

  await MessageTemplate.insertMany(
    templates.map((t) => ({
      ...t,
      isSystem: true,
    }))
  );
}
