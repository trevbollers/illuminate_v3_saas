import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import type { TenantMembership, PlatformRole, TenantRole } from "./types";

// Re-import types for module augmentation side effects
import "./types";

/**
 * MongoDB client must be provided by the consuming application.
 * Set this before initializing auth routes.
 *
 * Example:
 *   import { setMongoClient } from "@illuminate/auth";
 *   import clientPromise from "@/lib/mongodb";
 *   setMongoClient(clientPromise);
 */
let _clientPromise: Promise<any> | null = null;

export function setMongoClient(clientPromise: Promise<any>): void {
  _clientPromise = clientPromise;
}

function getClientPromise(): Promise<any> {
  if (!_clientPromise) {
    throw new Error(
      "@illuminate/auth: MongoDB client not configured. " +
        "Call setMongoClient(clientPromise) before using auth.",
    );
  }
  return _clientPromise;
}

/**
 * Look up a user by email from the users collection.
 */
async function findUserByEmail(email: string) {
  const client = await getClientPromise();
  const db = client.db();
  return db.collection("users").findOne({ email: email.toLowerCase() });
}

/**
 * Look up active tenant memberships for a user.
 */
async function findMemberships(userId: string): Promise<TenantMembership[]> {
  const client = await getClientPromise();
  const db = client.db();

  const memberships = await db
    .collection("tenant_memberships")
    .find({ userId, isActive: true })
    .toArray();

  return memberships.map((m: any) => ({
    tenantId: m.tenantId.toString(),
    role: m.role as TenantRole,
    permissions: m.permissions ?? [],
    isActive: m.isActive,
  }));
}

/**
 * Update the lastLoginAt timestamp for a user.
 */
async function updateLastLogin(userId: string): Promise<void> {
  const client = await getClientPromise();
  const db = client.db();
  await db
    .collection("users")
    .updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } });
}

/**
 * Resolve the active tenant context for a user.
 * Priority: most recently used tenant > first owned tenant > first membership.
 */
function resolveActiveTenant(
  memberships: TenantMembership[],
): { tenantId: string; role: TenantRole; permissions: string[] } | null {
  if (memberships.length === 0) return null;

  // Prefer owner role, then admin, then first available
  const owned = memberships.find((m) => m.role === "owner");
  if (owned) {
    return {
      tenantId: owned.tenantId,
      role: owned.role,
      permissions: owned.permissions,
    };
  }

  const admin = memberships.find((m) => m.role === "admin");
  if (admin) {
    return {
      tenantId: admin.tenantId,
      role: admin.role,
      permissions: admin.permissions,
    };
  }

  const first = memberships[0]!;
  return {
    tenantId: first.tenantId,
    role: first.role,
    permissions: first.permissions,
  };
}

export const authConfig: NextAuthConfig = {
  adapter: MongoDBAdapter(getClientPromise),

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

        if (!user.hashedPassword) {
          // User signed up via OAuth and has no password set
          return null;
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword);
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  pages: {
    signIn: "/auth/login",
  },

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: populate the token
      if (user) {
        token.userId = user.id!;
        token.platformRole = (user.platformRole as PlatformRole) ?? "user";

        const memberships = await findMemberships(user.id!);
        const activeTenant = resolveActiveTenant(memberships);

        token.tenantId = activeTenant?.tenantId ?? null;
        token.role = activeTenant?.role ?? null;
        token.permissions = activeTenant?.permissions ?? [];
      }

      // Allow tenant switching via session update
      if (trigger === "update" && session?.tenantId) {
        const memberships = await findMemberships(token.userId);
        const target = memberships.find(
          (m) => m.tenantId === session.tenantId,
        );

        if (target) {
          token.tenantId = target.tenantId;
          token.role = target.role;
          token.permissions = target.permissions;
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.tenantId = token.tenantId;
      session.user.role = token.role;
      session.user.platformRole = token.platformRole;
      session.user.permissions = token.permissions;

      return session;
    },

    async authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isAuthPage = request.nextUrl.pathname.startsWith("/auth");

      if (isAuthPage) {
        // Redirect logged-in users away from auth pages
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
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
          // Non-critical: log but don't block sign-in
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
