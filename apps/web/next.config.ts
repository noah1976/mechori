import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDirectory, "../..");
const remoteAlpha = process.env.NEXT_PUBLIC_MECHORI_RUNTIME === "alpha";

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
  transpilePackages: ["@mechori/core", "@mechori/shared", "@mechori/i18n"],
  async headers() {
    const headers = [
      {
        key: "TDM-Reservation",
        value: "1",
      },
    ];

    if (remoteAlpha) {
      headers.push({
        key: "X-Robots-Tag",
        value: "noindex, nofollow, noarchive, nosnippet, noimageindex",
      });
    }

    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
