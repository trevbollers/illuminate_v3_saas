// Connection management
export {
  connectPlatformDB,
  connectDB, // deprecated alias
  connectTenantDB,
  disconnectTenantDB,
  disconnectAllTenantDBs,
} from "./connection";

// Models & helpers
export * from "./models";

// Utilities
export { resolveRecipients } from "./utils/resolve-recipients";
export type { ResolvedRecipient } from "./utils/resolve-recipients";
export { seedDefaultTemplates } from "./utils/default-templates";
