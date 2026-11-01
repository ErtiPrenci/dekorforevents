import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "pg", "web-push"],
  experimental: {
    serverActions: {
      // Customers upload inspiration photos and owners upload product photos.
      bodySizeLimit: "25mb",
      // Temporary demo links (Cloudflare quick tunnel) forward from another host.
      allowedOrigins: ["*.trycloudflare.com"],
    },
  },
};

export default nextConfig;
