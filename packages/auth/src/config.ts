import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import type { NextAuthConfig } from "next-auth";
import type { TenantMembership, PlatformRole, TenantType } from "./types";

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

/**
 * Look up active tenant memberships for a user.
 * Joins against the tenants collection to resolve slug and tenantType.
 */
async function findMemberships(userId: string): Promise<TenantMembership[]> {
  const client = await getClientPromise();
  const db = client.db();

  const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });
  if (!user?.memberships) return [];

  const activeMemberships = user.memberships.filter((m: any) => m.isActive);

  const tenantIds = activeMemberships.map((m: any) => m.tenantId);
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
      tenantSlug: tenant?.slug ?? "",
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
 * Priority: owner role > admin role > first membership.
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

export const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(() => getClientPromise()),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),

    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        const user = await findUserByEmail(email);
        if (!user) {
          return null;
        }

        if (!user.passwordHash) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          platformRole: user.platformRole ?? "user",
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/auth/login",
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id!;
        token.platformRole = (user.platformRole as PlatformRole) ?? "user";

        const memberships = await findMemberships(user.id!);
        const activeTenant = resolveActiveTenant(memberships);

        token.tenantId = activeTenant?.tenantId ?? null;
        token.tenantSlug = activeTenant?.tenantSlug ?? null;
        token.tenantType = activeTenant?.tenantType ?? null;
        token.role = activeTenant?.role ?? null;
        token.permissions = activeTenant?.permissions ?? [];
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

      return session;
    },

    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = request.nextUrl.pathname.startsWith("/auth");

      if (isAuthPage) {
        if (isLoggedIn) {
          const dashboardUrl =
            process.env.NEXT_PUBLIC_DASHBOARD_URL ??
            new URL("/dashboard", request.nextUrl).toString();
          return Response.redirect(new URL(dashboardUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
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
