/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@goparticipate/ui",
    "@goparticipate/db",
    "@goparticipate/auth",
    "@goparticipate/billing",
    "@goparticipate/permissions",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

module.exports = nextConfig;
