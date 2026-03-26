import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import type { PlatformRole } from "./types";
import "./types";

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
    signIn: "/auth/login",
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

  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};
