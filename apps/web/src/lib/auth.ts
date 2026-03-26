import { setMongoClient } from "@goparticipate/auth";
import clientPromise from "./mongodb";

// Wire up the MongoDB client for NextAuth before any auth calls
setMongoClient(clientPromise);

export { auth, handlers, signIn, signOut } from "@goparticipate/auth";
