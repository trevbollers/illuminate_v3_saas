import mongoose, { Connection } from "mongoose";

// ---------------------------------------------------------------------------
// Database-per-tenant connection architecture
//
// - PLATFORM DB:  Single database for SaaS-level data (tenants, users, plans,
//                 feature flags, players, families, verifications, sports).
//                 Connected via the default mongoose instance.
//
// - LEAGUE DBs:   Each league tenant gets its own MongoDB database, resolved
//                 by slug (e.g. "league_midamerica_7v7").
//
// - ORG DBs:      Each org tenant gets its own MongoDB database, resolved
//                 by slug (e.g. "org_kc_thunder").
// ---------------------------------------------------------------------------

function getMongoURI(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env"
    );
  }
  return uri;
}

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

export async function connectPlatformDB(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(getMongoURI(), {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

/** @deprecated Use connectPlatformDB() instead. */
export const connectDB = connectPlatformDB;

// --- Tenant DB connections ---

interface TenantDBCache {
  [tenantSlug: string]: {
    conn: Connection | null;
    promise: Promise<Connection> | null;
    tenantType: "league" | "organization";
  };
}

declare global {
  var tenantDBCache: TenantDBCache | undefined;
}

const tenantCache: TenantDBCache = global.tenantDBCache ?? {};
if (!global.tenantDBCache) global.tenantDBCache = tenantCache;

/**
 * Derive the MongoDB URI for a tenant database.
 * League tenants → `league_<slug>`, Org tenants → `org_<slug>`.
 */
function buildTenantURI(tenantSlug: string, tenantType: "league" | "organization"): string {
  const prefix = tenantType === "league" ? "league" : "org";
  const dbName = `${prefix}_${tenantSlug.replace(/-/g, "_")}`;
  const url = new URL(getMongoURI());
  url.pathname = `/${dbName}`;
  return url.toString();
}

/**
 * Get (or create) a cached Mongoose Connection to a **tenant database**.
 *
 * League and org tenants each get their own database with type-appropriate
 * models registered on the connection.
 *
 * @param tenantSlug - The tenant's unique slug (e.g. "midamerica-7v7")
 * @param tenantType - "league" or "organization"
 */
export async function connectTenantDB(
  tenantSlug: string,
  tenantType: "league" | "organization",
): Promise<Connection> {
  if (!tenantSlug) {
    throw new Error("connectTenantDB requires a non-empty tenantSlug");
  }

  if (tenantCache[tenantSlug]?.conn) {
    return tenantCache[tenantSlug].conn!;
  }

  await connectPlatformDB();

  if (!tenantCache[tenantSlug]) {
    tenantCache[tenantSlug] = { conn: null, promise: null, tenantType };
  }

  if (!tenantCache[tenantSlug].promise) {
    const uri = buildTenantURI(tenantSlug, tenantType);
    const conn = mongoose.createConnection(uri, {
      bufferCommands: false,
    });

    tenantCache[tenantSlug].promise = conn.asPromise().then((c) => {
      const { registerLeagueModels, registerOrgModels } = require("./models/tenant-models");
      if (tenantType === "league") {
        registerLeagueModels(c);
      } else {
        registerOrgModels(c);
      }
      return c;
    });
  }

  tenantCache[tenantSlug].conn = await tenantCache[tenantSlug].promise!;
  return tenantCache[tenantSlug].conn!;
}

/**
 * Get (or create) a cached Mongoose Connection to a **family database**.
 *
 * Each family gets their own isolated DB: `family_<familyId>`
 * This is the identity vault — player profiles, verification records,
 * encrypted documents, and connection tracking.
 *
 * @param familyId - The family's ObjectId string
 */
export async function connectFamilyDB(familyId: string): Promise<Connection> {
  if (!familyId) {
    throw new Error("connectFamilyDB requires a non-empty familyId");
  }

  const cacheKey = `family_${familyId}`;

  if (tenantCache[cacheKey]?.conn) {
    return tenantCache[cacheKey].conn!;
  }

  await connectPlatformDB();

  if (!tenantCache[cacheKey]) {
    tenantCache[cacheKey] = { conn: null, promise: null, tenantType: "family" as any };
  }

  if (!tenantCache[cacheKey].promise) {
    const dbName = `family_${familyId}`;
    const url = new URL(getMongoURI());
    url.pathname = `/${dbName}`;
    const uri = url.toString();

    const conn = mongoose.createConnection(uri, {
      bufferCommands: false,
    });

    tenantCache[cacheKey].promise = conn.asPromise().then((c) => {
      const { registerFamilyModels } = require("./models/tenant-models");
      registerFamilyModels(c);
      return c;
    });
  }

  tenantCache[cacheKey].conn = await tenantCache[cacheKey].promise!;
  return tenantCache[cacheKey].conn!;
}

export async function disconnectTenantDB(tenantSlug: string): Promise<void> {
  const entry = tenantCache[tenantSlug];
  if (entry?.conn) {
    await entry.conn.close();
    delete tenantCache[tenantSlug];
  }
}

export async function disconnectAllTenantDBs(): Promise<void> {
  const slugs = Object.keys(tenantCache);
  await Promise.all(slugs.map((slug) => disconnectTenantDB(slug)));
}
