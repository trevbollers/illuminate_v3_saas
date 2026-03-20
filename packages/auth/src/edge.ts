/**
 * Edge-safe auth export for Next.js middleware.
 *
 * Import from "@illuminate/auth/edge" in middleware.ts files.
 * This avoids pulling in MongoDB/bcrypt which crash in Edge runtime.
 *
 * Usage:
 *   import { auth } from "@illuminate/auth/edge";
 *   const session = await auth();
 */

import NextAuth from "next-auth";
import { edgeAuthConfig } from "./auth.config";

export const { auth } = NextAuth(edgeAuthConfig);
