import { NextResponse, type NextRequest } from "next/server";
import {
  getMechoriRuntime,
  getSupabasePublicConfig,
} from "@/lib/runtime-config";

export function proxy(request: NextRequest) {
  if (getMechoriRuntime() !== "alpha") return NextResponse.next({ request });

  try {
    if (!getSupabasePublicConfig()) return serviceUnavailable();
  } catch {
    return serviceUnavailable();
  }

  // This proxy runs in Netlify Edge for every matched request. Do not make an
  // upstream Supabase Auth call here: a delayed Auth response must not take the
  // entire Alpha site offline. Authorization remains at the data/API boundary.
  return NextResponse.next({ request });
}

function serviceUnavailable() {
  return new NextResponse("Alpha environment is not configured.", {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
