import mongoose, { Connection } from "mongoose";

// ---------------------------------------------------------------------------
// Database-per-tenant connection architecture
//
// - PLATFORM DB:  Single database for SaaS-level data (tenants, users, plans,
//                 feature flags). Connected via the default mongoose instance.
//
// - TENANT DBs:   Each tenant gets its own MongoDB database, resolved by
//                 tenant slug (e.g. "tenant_acme_meat_co"). Connections are
//                 pooled and cached for the process lifetime.
// ---------------------------------------------------------------------------

const MONGODB_URI = process.env.MONGODB_URI!;

// --- Platform DB (default mongoose connection) ---

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
  conn: null,
  promise: null,
};
if (!global.mongooseCache) global.mongooseCache = cached;

/**
 * Connect to the **platform** database (tenants, users, plans, feature flags).
 * Uses the default mongoose connection. Safe to call multiple times — returns
 * the cached connection after the first call.
 */
export async function connectPlatformDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env"
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/** @deprecated Use connectPlatformDB() instead. Alias kept for migration convenience. */
export const connectDB = connectPlatformDB;

// --- Tenant DB connections ---

interface TenantDBCache {
  [tenantSlug: string]: {
    conn: Connection | null;
    promise: Promise<Connection> | null;
  };
}

declare global {
  var tenantDBCache: TenantDBCache | undefined;
}

const tenantCache: TenantDBCache = global.tenantDBCache ?? {};
if (!global.tenantDBCache) global.tenantDBCache = tenantCache;

/**
 * Derive the MongoDB URI for a tenant database. Given a platform URI like
 * `mongodb+srv://user:pass@cluster.mongodb.net/illuminate?retryWrites=true`
 * this returns
 * `mongodb+srv://user:pass@cluster.mongodb.net/tenant_<slug>?retryWrites=true`
 */
function buildTenantURI(tenantSlug: string): string {
  const dbName = `tenant_${tenantSlug.replace(/-/g, "_")}`;
  const url = new URL(MONGODB_URI);
  // URL pathname is "/<dbname>" — replace it
  url.pathname = `/${dbName}`;
  return url.toString();
}

/**
 * Get (or create) a cached Mongoose Connection to a **tenant database**.
 *
 * Each tenant's data (products, recipes, ingredients, orders, etc.) lives in
 * its own database, providing full data isolation at the database level.
 *
 * The returned Connection already has all tenant-scoped models registered on
 * it via `registerTenantModels()`.
 *
 * @param tenantSlug - The tenant's unique slug (e.g. "acme-meat-co")
 */
export async function connectTenantDB(tenantSlug: string): Promise<Connection> {
  if (!tenantSlug) {
    throw new Error("connectTenantDB requires a non-empty tenantSlug");
  }

  // Return cached connection if available
  if (tenantCache[tenantSlug]?.conn) {
    return tenantCache[tenantSlug].conn!;
  }

  // Ensure platform DB is connected first (mongoose default connection)
  await connectPlatformDB();

  if (!tenantCache[tenantSlug]) {
    tenantCache[tenantSlug] = { conn: null, promise: null };
  }

  if (!tenantCache[tenantSlug].promise) {
    const uri = buildTenantURI(tenantSlug);
    const conn = mongoose.createConnection(uri, {
      bufferCommands: false,
    });

    tenantCache[tenantSlug].promise = conn.asPromise().then((c) => {
      // Register tenant-scoped models on this connection
      const { registerTenantModels } = require("./models/tenant-models");
      registerTenantModels(c);
      return c;
    });
  }

  tenantCache[tenantSlug].conn = await tenantCache[tenantSlug].promise!;
  return tenantCache[tenantSlug].conn!;
}

/**
 * Close a specific tenant's database connection. Useful for cleanup or
 * when a tenant is suspended.
 */
export async function disconnectTenantDB(tenantSlug: string): Promise<void> {
  const entry = tenantCache[tenantSlug];
  if (entry?.conn) {
    await entry.conn.close();
    delete tenantCache[tenantSlug];
  }
}

/**
 * Close ALL tenant database connections. Useful during graceful shutdown.
 */
export async function disconnectAllTenantDBs(): Promise<void> {
  const slugs = Object.keys(tenantCache);
  await Promise.all(slugs.map((slug) => disconnectTenantDB(slug)));
}
