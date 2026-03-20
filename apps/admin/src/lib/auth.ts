import { setMongoClient } from "@illuminate/auth";
import clientPromise from "./mongodb";

// Wire up the MongoDB client for NextAuth before any auth calls
setMongoClient(clientPromise);

export { auth, handlers, signIn, signOut } from "@illuminate/auth";
