// --- Platform-level models (live in the platform database) ---

export { Tenant } from "./tenant";
export type { ITenant, ITenantPlan, ITenantPlanAddOn, ITenantSettings, ITenantSocials } from "./tenant";

export { User } from "./user";
export type { IUser, IMembership, ISocials as IUserSocials, INotificationPreferences } from "./user";

export { Plan } from "./plan";
export type { IPlan, IPlanAddOn, IPlanLimits, IPlanPricing } from "./plan";

export { FeatureFlag } from "./feature-flag";
export type { IFeatureFlag, IRollout } from "./feature-flag";

export { Sport } from "./sport";
export type { ISport, IPosition, IDivisionTemplate, IStatCategory } from "./sport";

export { Player } from "./player";
export type { IPlayer, IEmergencyContact, IMedicalInfo, ISocials as IPlayerSocials } from "./player";

export { Family } from "./family";
export type { IFamily } from "./family";

export { Verification } from "./verification";
export type { IVerification } from "./verification";

export { MagicCode } from "./magic-code";
export type { IMagicCode } from "./magic-code";

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
export type { IAnnouncement } from "./league/announcement";

// --- Org tenant models (live in per-org databases) ---

export type { ITeam, ITeamSocials } from "./org/team";
export type { IRoster } from "./org/roster";
export type { IOrgEvent, IRecurrence } from "./org/org-event";
export type { IAttendance } from "./org/attendance";
export type { IMessage, IDeliveryLogEntry } from "./org/message";
export type { IMessageAck } from "./org/message-ack";
export type { ITransaction } from "./org/transaction";
export type { IStat } from "./org/stat";
export type { IUniformOrder, IUniformItem } from "./org/uniform-order";
export type { IInvite } from "./org/invite";
export type { IRegistrationCart, ICartItem, ICartCheckout } from "./org/registration-cart";
export type { IProduct, IProductOption, IProductPricing } from "./org/product";
export type { IStorefrontOrder, IOrderItem, IOrderCustomer, IOrderFulfillment } from "./org/storefront-order";

// --- Shared tenant models (used in both league and org databases) ---

export type { IMessageTemplate } from "./shared/message-template";

// --- Family models (live in per-family databases) ---

export type { IFamilyProfile, IFamilyAddress } from "./family/family-profile";
export type { IFamilyGuardian } from "./family/family-guardian";
export type { IFamilyPlayer, IPlayerSizing, IPlayerPhoto, IPlayerSportProfile } from "./family/family-player";
export type { IVerificationRecord, IVerificationUsage } from "./family/verification-record";
export type { IFamilyDocument } from "./family/family-document";
export type { IDocumentGrant, IGrantAccessLog } from "./family/document-grant";

// --- Tenant model helpers ---

export {
  registerLeagueModels,
  registerOrgModels,
  registerFamilyModels,
  getLeagueModels,
  getOrgModels,
  getFamilyModels,
} from "./tenant-models";
