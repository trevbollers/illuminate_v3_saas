import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import type { PlatformRole } from "./types";
import "./types";

// Per-port cookie names so each app gets its own session in dev
const cookiePrefix = (() => {
  const url = process.env.NEXTAUTH_URL || "";
  const match = url.match(/:(\d+)/);
  return match ? `gp${match[1]}` : "gp";
})();

export const edgeAuthConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },

  pages: {
    signIn: "/login",
  },

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

  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id!;
        token.platformRole = (user.platformRole as PlatformRole) ?? "user";
      }

      if (trigger === "update" && session?.tenantId) {
        token.tenantId = session.tenantId;
        token.tenantSlug = session.tenantSlug;
        token.tenantType = session.tenantType;
        token.role = session.role;
        token.permissions = session.permissions;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.tenantId = token.tenantId as string | null;
      session.user.tenantSlug = token.tenantSlug as string | null;
      session.user.tenantType = token.tenantType as "league" | "organization" | null;
      session.user.role = token.role as string | null;
      session.user.platformRole = token.platformRole as PlatformRole;
      session.user.permissions = (token.permissions as string[] | undefined) ?? [];
      return session;
    },

    // No authorized callback — each app's middleware handles its own auth checks.
  },

  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};
