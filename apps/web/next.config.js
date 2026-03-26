/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@goparticipate/ui",
    "@goparticipate/db",
    "@goparticipate/auth",
    "@goparticipate/billing",
    "@goparticipate/email",
  ],
};

module.exports = nextConfig;
