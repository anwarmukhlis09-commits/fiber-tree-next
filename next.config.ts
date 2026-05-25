import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.56.1', '192.168.56.1:3000', 'localhost', 'localhost:3000', '*.ngrok-free.app', '*.ngrok.app', '*.ngrok.io'],
};

export default nextConfig;
