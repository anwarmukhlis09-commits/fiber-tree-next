import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: '/fiber-tree-next',
  assetPrefix: '/fiber-tree-next',
};

export default nextConfig;
