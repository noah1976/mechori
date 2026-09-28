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
      // Preserve referring origins without exposing any path, query or fragment,
      // even for unexpected secret query parameters on an ordinary route.
      { key: "Referrer-Policy", value: "strict-origin" },
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
      ...["/p/:path*", "/v/:path*", "/join/:path*", "/invite/:path*", "/auth/:path*"].map((source) => ({
        source, headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
      // Keep native auth form POST's Origin for the existing CSRF guard. Only
      // the origin is sent, including when auth has a capability continuation.
      { source: "/auth", headers: [{ key: "Referrer-Policy", value: "strict-origin" }] },
    ];
  },
};

export default nextConfig;
