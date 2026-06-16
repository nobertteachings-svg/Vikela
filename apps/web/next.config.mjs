/** @type {import('next').NextConfig} */
const apiBase = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/+$/, "");

const nextConfig = {
  transpilePackages: ["@vikela/shared"],
  experimental: {
    instrumentationHook: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBase}/api/v1/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/settings/repositories", destination: "/integrations", permanent: false },
      { source: "/settings/cloud-accounts", destination: "/integrations", permanent: false },
      { source: "/settings/identity", destination: "/integrations", permanent: false },
      { source: "/settings/integrations", destination: "/integrations", permanent: false },
      { source: "/onboarding/connect", destination: "/onboarding/connect-repos", permanent: false },
    ];
  },
};

export default nextConfig;
