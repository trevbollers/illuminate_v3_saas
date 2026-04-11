/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Type-check and lint in CI / editor, not in the production Docker build.
  // Keeps the build fast on resource-constrained hosts and means a type error
  // never blocks a deploy. Fix types via `npm run type-check` locally.
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
