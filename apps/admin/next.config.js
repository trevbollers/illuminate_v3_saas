// Load env vars from monorepo root .env
require("../../packages/config-env/load");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@illuminate/ui",
    "@illuminate/db",
    "@illuminate/auth",
    "@illuminate/billing",
    "@illuminate/permissions",
  ],
  experimental: {
    serverComponentsExternalPackages: ["mongodb", "mongoose", "bcryptjs"],
  },
};

module.exports = nextConfig;
