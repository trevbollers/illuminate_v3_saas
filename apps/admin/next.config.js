/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@goparticipate/ui",
    "@goparticipate/db",
    "@goparticipate/auth",
    "@goparticipate/billing",
    "@goparticipate/permissions",
  ],
  experimental: {
    serverComponentsExternalPackages: ["mongodb", "mongoose", "bcryptjs"],
  },
};

module.exports = nextConfig;
