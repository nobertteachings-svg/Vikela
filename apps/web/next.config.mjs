/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@vikela/shared"],
  experimental: {
    instrumentationHook: true,
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
