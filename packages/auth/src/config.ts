import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import type { NextAuthConfig } from "next-auth";
import type { TenantMembership, PlatformRole, TenantType } from "./types";
import { verifyCode, MAX_ATTEMPTS } from "./magic-code";

// Re-import types for module augmentation side effects
import "./types";

let _clientPromise: Promise<any> | null = null;

export function setMongoClient(clientPromise: Promise<any>): void {
  _clientPromise = clientPromise;
}

function getClientPromise(): Promise<any> {
  if (!_clientPromise) {
    throw new Error(
      "@goparticipate/auth: MongoDB client not configured. " +
        "Call setMongoClient(clientPromise) before using auth.",
    );
  }
  return _clientPromise;
}

async function findUserByEmail(email: string) {
  const client = await getClientPromise();
  const db = client.db();
  return db.collection("users").findOne({ email: email.toLowerCase() });
}

async function findUserByPhone(phone: string) {
  const client = await getClientPromise();
  const db = client.db();
  return db.collection("users").findOne({ phone });
}

/**
 * Validate a magic code and return the associated user.
 * Handles attempt tracking and code consumption.
 */
async function validateMagicCode(
  identifier: string,
  code: string,
): Promise<{ id: string; email: string; name: string; image: string | null; platformRole: string; scopedRole?: string; scopedPlayerId?: string; scopedTenantSlug?: string } | null> {
  const client = await getClientPromise();
  const db = client.db();

  // Check if this is a player access code (player:<playerId> prefix)
  const isPlayerCode = identifier.startsWith("player:");
  const purpose = isPlayerCode ? "player_access" : "login";

  // Find the most recent unused, non-expired code for this identifier
  const magicCode = await db.collection("magiccodes").findOne({
    identifier: identifier.toLowerCase(),
    purpose,
    usedAt: null,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: MAX_ATTEMPTS },
  }, { sort: { createdAt: -1 } });

  if (!magicCode) return null;

  // Verify the code
  const isValid = await verifyCode(code, magicCode.hashedCode);

  if (!isValid) {
    await db.collection("magiccodes").updateOne(
      { _id: magicCode._id },
      { $inc: { attempts: 1 } },
    );
    return null;
  }

  // Mark code as used
  await db.collection("magiccodes").updateOne(
    { _id: magicCode._id },
    { $set: { usedAt: new Date() } },
  );

  if (isPlayerCode) {
    // Player access code — find the generator's info to resolve tenant context
    const generatorId = magicCode.generatedBy;
    if (!generatorId) return null;

    const generator = await db.collection("users").findOne({ _id: generatorId });
    if (!generator) return null;

    // Resolve the generator's org tenant for the player session
    const activeMembership = generator.memberships?.find((m: any) => m.isActive && m.tenantType === "organization");
    let tenantSlug: string | undefined;
    if (activeMembership) {
      const tenant = await db.collection("tenants").findOne({ _id: activeMembership.tenantId });
      tenantSlug = tenant?.slug;
    }

    return {
      id: generator._id.toString(),
      email: generator.email ?? "",
      name: `Player (${magicCode.playerId?.toString().slice(-4) ?? "????"})`,
      image: null,
      platformRole: "user",
      scopedRole: magicCode.scopedRole ?? "player_view",
      scopedPlayerId: magicCode.playerId?.toString(),
      scopedTenantSlug: tenantSlug,
    };
  }

  // Standard magic code login — find the user by email or phone
  const isEmail = magicCode.identifierType === "email";
  const user = isEmail
    ? await findUserByEmail(identifier)
    : await findUserByPhone(identifier);

  if (!user) return null;

  return {
    id: user._id.toString(),
    email: user.email,
    name: user.name,
    image: user.image ?? null,
    platformRole: user.platformRole ?? "user",
  };
}

/**
 * Look up active tenant memberships for a user.
 * Joins against the tenants collection to resolve slug and tenantType.
 */
async function findMemberships(userId: string): Promise<TenantMembership[]> {
  const client = await getClientPromise();
  const db = client.db();

  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  if (!user?.memberships) return [];

  const activeMemberships = user.memberships.filter(
    (m: any) => m.isActive === true || m.status === "active",
  );

  // tenantId may be stored as string or ObjectId — normalize to ObjectId for query
  const tenantIds = activeMemberships.map((m: any) => {
    const id = m.tenantId;
    if (id instanceof ObjectId) return id;
    if (typeof id === "string" && ObjectId.isValid(id)) return new ObjectId(id);
    return id;
  });
  const tenants = await db
    .collection("tenants")
    .find({ _id: { $in: tenantIds } })
    .project({ _id: 1, slug: 1, tenantType: 1 })
    .toArray();

  const tenantMap = new Map<string, { slug: string; tenantType: TenantType }>(
    tenants.map((t: any) => [
      t._id.toString(),
      { slug: t.slug as string, tenantType: t.tenantType as TenantType },
    ]),
  );

  return activeMemberships.map((m: any) => {
    const tenant = tenantMap.get(m.tenantId.toString());
    return {
      tenantId: m.tenantId.toString(),
      // Use tenant lookup slug, fall back to membership's stored slug
      tenantSlug: tenant?.slug ?? m.tenantSlug ?? "",
      tenantType: m.tenantType ?? tenant?.tenantType ?? "organization",
      role: m.role as string,
      permissions: m.permissions ?? [],
      isActive: m.isActive,
    };
  });
}

async function updateLastLogin(userId: string): Promise<void> {
  const client = await getClientPromise();
  const db = client.db();
  await db
    .collection("users")
    .updateOne({ _id: new ObjectId(userId) }, { $set: { lastLoginAt: new Date() } });
}

/**
 * Resolve the active tenant context for a user.
 *
 * In dev, each app runs on a different port. We use NEXTAUTH_URL to infer
 * which app is asking so we pick the right membership:
 *   - Port 4002 → prefer league memberships
 *   - Port 4003 → prefer organization memberships
 *   - Otherwise → highest priority membership
 */
function resolveActiveTenant(
  memberships: TenantMembership[],
): {
  tenantId: string;
  tenantSlug: string;
  tenantType: TenantType;
  role: string;
  permissions: string[];
} | null {
  if (memberships.length === 0) return null;

  // Infer preferred tenant type from NEXTAUTH_URL port
  const url = process.env.NEXTAUTH_URL || "";
  const portMatch = url.match(/:(\d+)/);
  const port = portMatch ? parseInt(portMatch[1]) : 0;
  let preferredType: TenantType | null = null;
  if (port === 4002) preferredType = "league";
  if (port === 4003) preferredType = "organization";

  // If we have a preferred type, try to find a matching membership first
  if (preferredType) {
    const preferred = memberships.filter((m) => m.tenantType === preferredType);
    if (preferred.length > 0) {
      return pickHighestRole(preferred);
    }
  }

  // Fallback: highest priority across all memberships
  return pickHighestRole(memberships);
}

function pickHighestRole(memberships: TenantMembership[]) {
  const owned = memberships.find(
    (m) => m.role === "league_owner" || m.role === "org_owner",
  );
  if (owned) {
    return {
      tenantId: owned.tenantId,
      tenantSlug: owned.tenantSlug,
      tenantType: owned.tenantType,
      role: owned.role,
      permissions: owned.permissions,
    };
  }

  const admin = memberships.find(
    (m) => m.role === "league_admin" || m.role === "org_admin",
  );
  if (admin) {
    return {
      tenantId: admin.tenantId,
      tenantSlug: admin.tenantSlug,
      tenantType: admin.tenantType,
      role: admin.role,
      permissions: admin.permissions,
    };
  }

  const first = memberships[0]!;
  return {
    tenantId: first.tenantId,
    tenantSlug: first.tenantSlug,
    tenantType: first.tenantType,
    role: first.role,
    permissions: first.permissions,
  };
}

// In dev, each app runs on a different port but shares `localhost` domain.
// Without unique cookie names, logging into one app overwrites another's session.
const cookiePrefix = (() => {
  const url = process.env.NEXTAUTH_URL || "";
  const match = url.match(/:(\d+)/);
  return match ? `gp${match[1]}` : "gp";
})();

export const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(() => getClientPromise()),

  cookies: {
    sessionToken: {
      name: `${cookiePrefix}.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `${cookiePrefix}.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),

    ...(process.env.APPLE_ID && process.env.APPLE_SECRET
      ? [
          Apple({
            clientId: process.env.APPLE_ID,
            clientSecret: process.env.APPLE_SECRET,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),

    // Email/password login
    Credentials({
      id: "credentials",
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          platformRole: user.platformRole ?? "user",
        };
      },
    }),

    // Magic code login (SMS or email)
    Credentials({
      id: "magic-code",
      name: "magic-code",
      credentials: {
        identifier: { label: "Email or Phone", type: "text" },
        code: { label: "Code", type: "text" },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier as string | undefined;
        const code = credentials?.code as string | undefined;

        if (!identifier || !code) return null;

        return validateMagicCode(identifier.trim().toLowerCase(), code.trim());
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id!;
        token.platformRole = (user.platformRole as PlatformRole) ?? "user";
        token.scopedRole = user.scopedRole ?? null;
        token.scopedPlayerId = user.scopedPlayerId ?? null;

        // Look up familyId from user document
        const client = await getClientPromise();
        const db = client.db();
        const userDoc = await db.collection("users").findOne({ _id: new ObjectId(user.id!) });
        token.familyId = userDoc?.familyId?.toString() ?? null;

        // Player code sessions get a fixed, limited context
        if (user.scopedRole === "player_view") {
          token.role = "player_view";
          token.permissions = ["view:schedule", "view:roster", "view:stats"];
          // Resolve tenant from the code generator's context
          if (user.scopedTenantSlug) {
            const client = await getClientPromise();
            const db = client.db();
            const tenant = await db.collection("tenants").findOne({ slug: user.scopedTenantSlug });
            token.tenantId = tenant?._id?.toString() ?? null;
            token.tenantSlug = user.scopedTenantSlug;
            token.tenantType = "organization";
          } else {
            token.tenantId = null;
            token.tenantSlug = null;
            token.tenantType = null;
          }
        } else {
          const memberships = await findMemberships(user.id!);
          const activeTenant = resolveActiveTenant(memberships);

          token.tenantId = activeTenant?.tenantId ?? null;
          token.tenantSlug = activeTenant?.tenantSlug ?? null;
          token.tenantType = activeTenant?.tenantType ?? null;
          token.role = activeTenant?.role ?? null;
          token.permissions = activeTenant?.permissions ?? [];
        }
      }

      if (trigger === "update" && session?.tenantId) {
        const memberships = await findMemberships(token.userId);
        const target = memberships.find(
          (m) => m.tenantId === session.tenantId,
        );

        if (target) {
          token.tenantId = target.tenantId;
          token.tenantSlug = target.tenantSlug;
          token.tenantType = target.tenantType;
          token.role = target.role;
          token.permissions = target.permissions;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.tenantId = token.tenantId;
      session.user.tenantSlug = token.tenantSlug;
      session.user.tenantType = token.tenantType;
      session.user.role = token.role;
      session.user.platformRole = token.platformRole;
      session.user.permissions = token.permissions;
      session.user.scopedRole = token.scopedRole;
      session.user.scopedPlayerId = token.scopedPlayerId;
      session.user.familyId = token.familyId;

      return session;
    },

    // Auth redirects are handled by each app's own middleware.
    // The shared authorized callback was removed because:
    // 1. Each app has login at different paths (/login vs /auth/login)
    // 2. Each app has its own middleware with tenant-type-specific checks
    // 3. The shared callback was redirecting to /auth/login which doesn't exist on all apps
  },

  events: {
    async signIn({ user }) {
      if (user?.id) {
        try {
          await updateLastLogin(user.id);
        } catch {
          console.error(
            `[auth] Failed to update lastLoginAt for user ${user.id}`,
          );
        }
      }
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};

export const {
  handlers,
  auth,
  signIn,
  signOut,
  unstable_update: updateSession,
} = NextAuth(authConfig);
