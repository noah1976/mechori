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
      { key: "Referrer-Policy", value: "no-referrer" },
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
      // HTML form POST under no-referrer sends Origin: null, which the existing
      // OAuth start CSRF guard correctly rejects. Send only the origin from the
      // auth page, never its capability-bearing path/query or fragment.
      { source: "/auth", headers: [{ key: "Referrer-Policy", value: "strict-origin" }] },
    ];
  },
};

export default nextConfig;
