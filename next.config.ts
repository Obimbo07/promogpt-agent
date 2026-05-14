import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@promogpt/ai-gateway"],
  /**
   * Dev-only: Next blocks `/_next/*` when the browser Origin is not localhost.
   * Tunnel URLs (ngrok, etc.) must be listed or the client bundle never loads (403).
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
   */
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok.app"],
};

export default nextConfig;
