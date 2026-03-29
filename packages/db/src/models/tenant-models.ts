import { Connection } from "mongoose";

// League models
import { EventSchema, type IEvent } from "./league/event";
import { DivisionSchema, type IDivision } from "./league/division";
import { RegistrationSchema, type IRegistration } from "./league/registration";
import { BracketSchema, type IBracket } from "./league/bracket";
import { GameSchema, type IGame } from "./league/game";
import { StandingSchema, type IStanding } from "./league/standing";
import { ComplianceRuleSchema, type IComplianceRule } from "./league/compliance-rule";
import { WaiverSchema, type IWaiver } from "./league/waiver";
import { CheckInSchema, type ICheckIn } from "./league/checkin";
import { AnnouncementSchema, type IAnnouncement } from "./league/announcement";

// Org models
import { TeamSchema, type ITeam } from "./org/team";
import { RosterSchema, type IRoster } from "./org/roster";
import { OrgEventSchema, type IOrgEvent } from "./org/org-event";
import { AttendanceSchema, type IAttendance } from "./org/attendance";
import { MessageSchema, type IMessage } from "./org/message";
import { TransactionSchema, type ITransaction } from "./org/transaction";
import { StatSchema, type IStat } from "./org/stat";
import { UniformOrderSchema, type IUniformOrder } from "./org/uniform-order";
import { InviteSchema, type IInvite } from "./org/invite";
import { RegistrationCartSchema, type IRegistrationCart } from "./org/registration-cart";
import { MessageAckSchema, type IMessageAck } from "./org/message-ack";
import { ProductSchema, type IProduct } from "./org/product";
import { StorefrontOrderSchema, type IStorefrontOrder } from "./org/storefront-order";
import { MessageTemplateSchema, type IMessageTemplate } from "./shared/message-template";

/**
 * Register all league-scoped models on a tenant connection.
 * Idempotent — skips if already registered.
 */
export function registerLeagueModels(conn: Connection): void {
  if (!conn.models.Event) conn.model<IEvent>("Event", EventSchema);
  if (!conn.models.Division) conn.model<IDivision>("Division", DivisionSchema);
  if (!conn.models.Registration) conn.model<IRegistration>("Registration", RegistrationSchema);
  if (!conn.models.Bracket) conn.model<IBracket>("Bracket", BracketSchema);
  if (!conn.models.Game) conn.model<IGame>("Game", GameSchema);
  if (!conn.models.Standing) conn.model<IStanding>("Standing", StandingSchema);
  if (!conn.models.ComplianceRule) conn.model<IComplianceRule>("ComplianceRule", ComplianceRuleSchema);
  if (!conn.models.Waiver) conn.model<IWaiver>("Waiver", WaiverSchema);
  if (!conn.models.CheckIn) conn.model<ICheckIn>("CheckIn", CheckInSchema);
  if (!conn.models.Announcement) conn.model<IAnnouncement>("Announcement", AnnouncementSchema);
  if (!conn.models.MessageTemplate) conn.model<IMessageTemplate>("MessageTemplate", MessageTemplateSchema);
}

/**
 * Register all org-scoped models on a tenant connection.
 * Idempotent — skips if already registered.
 */
export function registerOrgModels(conn: Connection): void {
  if (!conn.models.Team) conn.model<ITeam>("Team", TeamSchema);
  if (!conn.models.Roster) conn.model<IRoster>("Roster", RosterSchema);
  if (!conn.models.OrgEvent) conn.model<IOrgEvent>("OrgEvent", OrgEventSchema);
  if (!conn.models.Attendance) conn.model<IAttendance>("Attendance", AttendanceSchema);
  if (!conn.models.Message) conn.model<IMessage>("Message", MessageSchema);
  if (!conn.models.Transaction) conn.model<ITransaction>("Transaction", TransactionSchema);
  if (!conn.models.Stat) conn.model<IStat>("Stat", StatSchema);
  if (!conn.models.UniformOrder) conn.model<IUniformOrder>("UniformOrder", UniformOrderSchema);
  if (!conn.models.Invite) conn.model<IInvite>("Invite", InviteSchema);
  if (!conn.models.RegistrationCart) conn.model<IRegistrationCart>("RegistrationCart", RegistrationCartSchema);
  if (!conn.models.MessageAck) conn.model<IMessageAck>("MessageAck", MessageAckSchema);
  if (!conn.models.Product) conn.model<IProduct>("Product", ProductSchema);
  if (!conn.models.StorefrontOrder) conn.model<IStorefrontOrder>("StorefrontOrder", StorefrontOrderSchema);
  if (!conn.models.MessageTemplate) conn.model<IMessageTemplate>("MessageTemplate", MessageTemplateSchema);
}

/**
 * Get typed league models from a tenant connection.
 */
export function getLeagueModels(conn: Connection) {
  return {
    Event: conn.model<IEvent>("Event"),
    Division: conn.model<IDivision>("Division"),
    Registration: conn.model<IRegistration>("Registration"),
    Bracket: conn.model<IBracket>("Bracket"),
    Game: conn.model<IGame>("Game"),
    Standing: conn.model<IStanding>("Standing"),
    ComplianceRule: conn.model<IComplianceRule>("ComplianceRule"),
    Waiver: conn.model<IWaiver>("Waiver"),
    CheckIn: conn.model<ICheckIn>("CheckIn"),
    Announcement: conn.model<IAnnouncement>("Announcement"),
    MessageTemplate: conn.model<IMessageTemplate>("MessageTemplate"),
  };
}

/**
 * Get typed org models from a tenant connection.
 */
export function getOrgModels(conn: Connection) {
  return {
    Team: conn.model<ITeam>("Team"),
    Roster: conn.model<IRoster>("Roster"),
    OrgEvent: conn.model<IOrgEvent>("OrgEvent"),
    Attendance: conn.model<IAttendance>("Attendance"),
    Message: conn.model<IMessage>("Message"),
    Transaction: conn.model<ITransaction>("Transaction"),
    Stat: conn.model<IStat>("Stat"),
    UniformOrder: conn.model<IUniformOrder>("UniformOrder"),
    Invite: conn.model<IInvite>("Invite"),
    RegistrationCart: conn.model<IRegistrationCart>("RegistrationCart"),
    MessageAck: conn.model<IMessageAck>("MessageAck"),
    Product: conn.model<IProduct>("Product"),
    StorefrontOrder: conn.model<IStorefrontOrder>("StorefrontOrder"),
    MessageTemplate: conn.model<IMessageTemplate>("MessageTemplate"),
  };
}
