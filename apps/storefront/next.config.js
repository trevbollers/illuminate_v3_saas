/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Type-check and lint in CI / editor, not in the production Docker build.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: [
    "@goparticipate/ui",
    "@goparticipate/db",
    "@goparticipate/auth",
    "@goparticipate/billing",
    "@goparticipate/email",
  ],
};

module.exports = nextConfig;
