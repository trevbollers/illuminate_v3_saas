/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@illuminate/ui",
    "@illuminate/db",
    "@illuminate/auth",
  ],
};

module.exports = nextConfig;
