// Type augmentations (side-effect import to ensure module augmentation is loaded)
import "./types";

// Core NextAuth exports
export {
  auth,
  handlers,
  signIn,
  signOut,
  updateSession,
  authConfig,
  setMongoClient,
} from "./config";

// Middleware & tenant auth
export {
  withTenantAuth,
  withTenantMiddleware,
} from "./middleware";
export type { TenantContext, } from "./middleware";

// Tenant resolution
export {
  resolveTenantFromRequest,
  extractCustomDomain,
} from "./tenant-resolver";
export type { ResolvedTenant } from "./tenant-resolver";

// Magic code utilities
export {
  generateCode,
  hashCode,
  verifyCode,
  getCodeExpiry,
  canSendNewCode,
  CODE_LENGTH,
  CODE_EXPIRY_MINUTES,
  MAX_ATTEMPTS,
} from "./magic-code";

// Types
export type {
  PlatformRole,
  TenantType,
  TenantMembership,
} from "./types";
