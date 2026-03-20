// Load env vars from monorepo root .env
const { combinedEnv } = require("../../packages/config-env/load");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: combinedEnv,
  transpilePackages: [
    "@illuminate/ui",
    "@illuminate/db",
    "@illuminate/auth",
    "@illuminate/billing",
    "@illuminate/email",
  ],
};

module.exports = nextConfig;
