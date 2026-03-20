/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@illuminate/ui",
    "@illuminate/db",
    "@illuminate/auth",
    "@illuminate/billing",
    "@illuminate/permissions",
  ],
};

module.exports = nextConfig;
