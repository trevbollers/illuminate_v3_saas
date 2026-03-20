// Load environment variables from the monorepo root .env file.
//
// Next.js only reads .env from each app's own directory. In a Turborepo
// monorepo we keep a single .env at the root, so each app's next.config.js
// requires this module to populate process.env before the config is evaluated.
//
// Server-side code can then access all vars via process.env directly.
// Client-side code automatically receives any NEXT_PUBLIC_* vars.

const { loadEnvConfig } = require("@next/env");
const path = require("path");

// Resolve the monorepo root (two levels up from packages/config-env/)
const projectDir = path.resolve(__dirname, "../..");

// loadEnvConfig reads .env, .env.local, .env.development, etc.
// from the specified directory and writes them into process.env.
loadEnvConfig(projectDir);
