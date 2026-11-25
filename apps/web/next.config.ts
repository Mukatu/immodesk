import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Serveur autonome pour l'image Docker (apps/web/Dockerfile) : seules les
  // dépendances réellement utilisées sont copiées. Racine de traçage = monorepo.
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  experimental: {
    typedRoutes: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
    ],
  },
};

export default nextConfig;
