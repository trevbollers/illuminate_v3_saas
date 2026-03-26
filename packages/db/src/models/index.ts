// --- Platform-level models (live in the platform database) ---

export { Tenant } from "./tenant";
export type { ITenant, ITenantPlan, ITenantPlanAddOn, ITenantSettings } from "./tenant";

export { User } from "./user";
export type { IUser, IMembership } from "./user";

export { Plan } from "./plan";
export type { IPlan, IPlanAddOn, IPlanLimits, IPlanPricing } from "./plan";

export { FeatureFlag } from "./feature-flag";
export type { IFeatureFlag, IRollout } from "./feature-flag";

export { Sport } from "./sport";
export type { ISport, IPosition, IDivisionTemplate, IStatCategory } from "./sport";

export { Player } from "./player";
export type { IPlayer, IEmergencyContact, IMedicalInfo } from "./player";

export { Family } from "./family";
export type { IFamily } from "./family";

export { Verification } from "./verification";
export type { IVerification } from "./verification";

export { SystemConfig } from "./system-config";
export type {
  ISystemConfig,
  IServiceStatus,
  IStripeConfig,
  IEmailConfig,
  ISMSConfig,
  IAIConfig,
  IStorageConfig,
} from "./system-config";

// --- League tenant models (live in per-league databases) ---

export type { IEvent, IEventPricing } from "./league/event";
export type { IDivision } from "./league/division";
export type { IRegistration, IRosterEntry } from "./league/registration";
export type { IBracket, IBracketMatch } from "./league/bracket";
export type { IGame } from "./league/game";
export type { IStanding } from "./league/standing";
export type { IComplianceRule } from "./league/compliance-rule";
export type { IWaiver } from "./league/waiver";

// --- Org tenant models (live in per-org databases) ---

export type { ITeam } from "./org/team";
export type { IRoster } from "./org/roster";
export type { IOrgEvent, IRecurrence } from "./org/org-event";
export type { IAttendance } from "./org/attendance";
export type { IMessage } from "./org/message";
export type { ITransaction } from "./org/transaction";
export type { IStat } from "./org/stat";
export type { IUniformOrder, IUniformItem } from "./org/uniform-order";
export type { IInvite } from "./org/invite";
export type { IRegistrationCart, ICartItem, ICartCheckout } from "./org/registration-cart";

// --- Tenant model helpers ---

export {
  registerLeagueModels,
  registerOrgModels,
  getLeagueModels,
  getOrgModels,
} from "./tenant-models";
