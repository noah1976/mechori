import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appDirectory, "../..");

const nextConfig: NextConfig = {
  turbopack: {
    root: workspaceRoot,
  },
  transpilePackages: ["@mechori/core", "@mechori/shared", "@mechori/i18n"],
};

export default nextConfig;
