// Load environment variables from the monorepo root .env file.
//
// Next.js only reads .env from each app's own directory. In a Turborepo
// monorepo we keep a single .env at the root, so each app's next.config.js
// requires this module and spreads the result into the `env` config key.

const { loadEnvConfig } = require("@next/env");
const path = require("path");

// Resolve the monorepo root (two levels up from packages/config-env/)
const projectDir = path.resolve(__dirname, "../..");

// loadEnvConfig reads .env, .env.local, .env.development, etc.
// from the specified directory and writes them into process.env.
const { combinedEnv: rawEnv } = loadEnvConfig(projectDir);

// Next.js reserves certain env key prefixes/names that cannot be set
// via the `env` config key. Filter them out to avoid build errors.
const RESERVED_KEYS = new Set([
  "NEXT_RUNTIME",
  "NODE_ENV",
  "__NEXT_PROCESSED_ENV",
]);

const combinedEnv = Object.fromEntries(
  Object.entries(rawEnv).filter(
    ([key]) => !RESERVED_KEYS.has(key) && !key.startsWith("__NEXT_")
  )
);

module.exports = { combinedEnv };
