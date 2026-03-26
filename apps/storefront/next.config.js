/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@goparticipate/ui",
    "@goparticipate/db",
    "@goparticipate/auth",
  ],
};

module.exports = nextConfig;
