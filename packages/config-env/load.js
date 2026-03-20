// Load environment variables from the monorepo root .env file.
//
// Next.js only reads .env from each app's own directory. In a Turborepo
// monorepo we keep a single .env at the root, so each app's next.config.js
// must call this before exporting its config.

const { loadEnvConfig } = require("@next/env");
const path = require("path");

// Resolve the monorepo root (two levels up from packages/config-env/)
const projectDir = path.resolve(__dirname, "../..");

// loadEnvConfig reads .env, .env.local, .env.development, etc.
// from the specified directory and writes them to process.env.
const { combinedEnv: rawEnv } = loadEnvConfig(projectDir);

// Next.js reserves certain env keys (e.g. NEXT_RUNTIME) that cannot be
// set via the `env` config key. Filter them out to avoid build errors.
const RESERVED_KEYS = ["NEXT_RUNTIME"];
const combinedEnv = Object.fromEntries(
  Object.entries(rawEnv).filter(([key]) => !RESERVED_KEYS.includes(key))
);

// Re-export the loaded env so next.config.js can spread it into
// the `env` config key, ensuring all runtimes (server, edge, client)
// receive the variables.
module.exports = { combinedEnv };
