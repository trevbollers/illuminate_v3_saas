/**
 * Edge-safe auth export for Next.js middleware.
 *
 * Import from "@goparticipate/auth/edge" in middleware.ts files.
 * This avoids pulling in MongoDB/bcrypt which crash in Edge runtime.
 *
 * Usage:
 *   import { auth } from "@goparticipate/auth/edge";
 *   const session = await auth();
 */

import NextAuth from "next-auth";
import { edgeAuthConfig } from "./auth.config";

export const { auth } = NextAuth(edgeAuthConfig);
