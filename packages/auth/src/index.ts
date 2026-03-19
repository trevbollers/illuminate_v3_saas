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

// Types
export type {
  PlatformRole,
  TenantRole,
  TenantMembership,
} from "./types";
