/**
 * Edge-safe NextAuth configuration.
 *
 * This file contains ONLY the config that can run in Edge runtime
 * (Next.js middleware). No MongoDB driver, no bcrypt, no Node.js APIs.
 *
 * The full config in ./config.ts extends this with the adapter and
 * Credentials provider for use in API routes (Node.js runtime).
 */

import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import type { PlatformRole, TenantRole } from "./types";
import "./types";

export const edgeAuthConfig: NextAuthConfig = {
  providers: [
    // Only declare providers that DON'T need Node.js APIs at the edge.
    // Google OAuth works fine — it just redirects, no server-side crypto.
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
    // NOTE: Credentials provider is added in the full config (config.ts)
    // because its authorize() function requires MongoDB + bcrypt (Node.js only).
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
      // Initial sign-in: populate the token with user data
      if (user) {
        token.userId = user.id!;
        token.platformRole = (user.platformRole as PlatformRole) ?? "user";
        // Tenant context is populated by the full config's jwt callback
        // which has access to MongoDB. At the edge we just read what's
        // already in the token.
      }

      // Allow tenant switching via session update
      if (trigger === "update" && session?.tenantId) {
        token.tenantId = session.tenantId;
        token.tenantSlug = session.tenantSlug;
        token.role = session.role;
        token.permissions = session.permissions;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId;
      session.user.tenantId = token.tenantId;
      session.user.tenantSlug = token.tenantSlug;
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
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};
