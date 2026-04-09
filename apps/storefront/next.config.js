/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@goparticipate/ui",
    "@goparticipate/db",
    "@goparticipate/auth",
  ],
};

module.exports = nextConfig;
