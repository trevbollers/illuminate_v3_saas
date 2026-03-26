import NextAuth from "next-auth";
import { authConfig, setMongoClient } from "@goparticipate/auth";
import clientPromise from "./mongodb";

setMongoClient(clientPromise);

const result = NextAuth({
  ...authConfig,
  pages: {
    signIn: "/login",
  },
});

export const auth: typeof result.auth = result.auth;
export const handlers: typeof result.handlers = result.handlers;
export const signIn: typeof result.signIn = result.signIn;
export const signOut: typeof result.signOut = result.signOut;
