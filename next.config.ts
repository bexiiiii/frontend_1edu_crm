import type { NextConfig } from "next";

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || process.env.BACKEND_URL || 'http://api-gateway:8090';
const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080/auth';

const nextConfig: NextConfig = {
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  // Proxy API & Keycloak requests to backend to avoid CORS issues
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_GATEWAY_URL}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${KEYCLOAK_INTERNAL_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
