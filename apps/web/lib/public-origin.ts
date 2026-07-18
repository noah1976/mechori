import type { NextRequest } from "next/server";
import { resolvePublicOrigin } from "@/lib/auth-flow";

export function getPublicRequestOrigin(request: NextRequest): string {
  return resolvePublicOrigin({
    fallbackOrigin: request.nextUrl.origin,
    configuredOrigin: process.env.URL,
    forwardedHost: request.headers.get("x-forwarded-host"),
    forwardedProto: request.headers.get("x-forwarded-proto"),
    host: request.headers.get("host"),
  });
}
