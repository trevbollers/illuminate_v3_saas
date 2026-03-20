import NextAuth from "next-auth";
import { authConfig, setMongoClient } from "@illuminate/auth";
import clientPromise from "./mongodb";

// Wire up the MongoDB client for NextAuth before any auth calls
setMongoClient(clientPromise);

// Admin app uses /login, not /auth/login (which is the web app's path)
export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  pages: {
    signIn: "/login",
  },
});
