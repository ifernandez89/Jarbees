import type { NextConfig } from "next";

let withBundleAnalyzer: any = (cfg: any) => cfg;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const _analyzer = require('@next/bundle-analyzer');
  withBundleAnalyzer = _analyzer({ enabled: process.env.ANALYZE === 'true' });
} catch (e) {
  // continue without analyzer
}

const isProduction = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH || '',
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'images.frandroid.com' },
      { protocol: 'https', hostname: 'servicelshop.com.mx' },
      { protocol: 'https', hostname: 'images.fravega.com' },
      { protocol: 'https', hostname: 'http2.mlstatic.com' },
      { protocol: 'https', hostname: 'www.megatone.net' },
      { protocol: 'https', hostname: 'medias.musimundo.com' },
      { protocol: 'https', hostname: 'www.komplett.no' },
      { protocol: 'https', hostname: 'naldoar.vtexassets.com' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default withBundleAnalyzer(nextConfig);