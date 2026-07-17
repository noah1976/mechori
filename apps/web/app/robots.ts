import type { MetadataRoute } from "next";

const privatePaths = [
  "/auth",
  "/feed",
  "/garage",
  "/import",
  "/journal/new",
  "/journal/*/report",
  "/moderation",
  "/privacy-review",
  "/records",
  "/settings",
];

const conventionalSearchBots = ["Googlebot", "Bingbot"];

export default function robots(): MetadataRoute.Robots {
  if (process.env.NEXT_PUBLIC_MECHORI_RUNTIME === "alpha") {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
      {
        userAgent: conventionalSearchBots,
        allow: "/",
        disallow: privatePaths,
      },
    ],
  };
}
