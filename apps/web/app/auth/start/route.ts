import { sanitizeLocalReturnPath } from "@mechori/core";
import { NextResponse, type NextRequest } from "next/server";
import {
  alphaInviteCookieName,
  authCallbackUrl,
  authContinuationUrl,
} from "@/lib/auth-flow";
import { getMechoriRuntime } from "@/lib/runtime-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inviteMaxAgeSeconds = 10 * 60;

export async function POST(request: NextRequest) {
  if (getMechoriRuntime() !== "alpha") {
    return new NextResponse("Not found", { status: 404 });
  }

  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== request.nextUrl.origin) {
    return new NextResponse("Invalid origin", { status: 403 });
  }

  const formData = await request.formData();
  const provider = String(formData.get("provider") ?? "");
  const mode = String(formData.get("mode") ?? "signin");
  const invite = String(formData.get("invite") ?? "").trim();
  const returnTo = sanitizeLocalReturnPath(String(formData.get("returnTo") ?? "/"));

  if (provider !== "google") return authErrorRedirect(request, "oauth_failed", mode, returnTo);
  if (mode === "signup" && !isPlausibleInvite(invite)) {
    return authErrorRedirect(request, "invitation_required", mode, returnTo);
  }
  if (invite && !isPlausibleInvite(invite)) {
    return authErrorRedirect(request, "invalid_invitation", mode, returnTo);
  }

  const authMode = mode === "signup" ? "signup" : "signin";
  const response = NextResponse.redirect(
    authContinuationUrl(request.nextUrl.origin, authMode, returnTo),
    303,
  );
  if (invite) {
    response.cookies.set(alphaInviteCookieName, invite, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/auth",
      maxAge: inviteMaxAgeSeconds,
    });
  } else {
    response.cookies.set(alphaInviteCookieName, "", { path: "/auth", maxAge: 0 });
  }
  return response;
}

export async function GET(request: NextRequest) {
  if (getMechoriRuntime() !== "alpha") {
    return new NextResponse("Not found", { status: 404 });
  }

  const provider = request.nextUrl.searchParams.get("continue");
  const mode = request.nextUrl.searchParams.get("mode") === "signup" ? "signup" : "signin";
  const returnTo = sanitizeLocalReturnPath(request.nextUrl.searchParams.get("returnTo"));
  if (provider !== "google") return authErrorRedirect(request, "oauth_failed", mode, returnTo);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authCallbackUrl(request.nextUrl.origin, returnTo, mode),
      queryParams: { prompt: "select_account" },
    },
  });

  if (error || !data.url) return authErrorRedirect(request, "oauth_failed", mode, returnTo);
  return NextResponse.redirect(data.url, 303);
}

function isPlausibleInvite(value: string): boolean {
  return value.length >= 32 && value.length <= 512;
}

function authErrorRedirect(
  request: NextRequest,
  error: string,
  mode: string,
  returnTo: string,
) {
  const url = new URL("/auth", request.url);
  url.searchParams.set("error", error);
  url.searchParams.set("mode", mode === "signup" ? "signup" : "signin");
  if (returnTo !== "/") url.searchParams.set("returnTo", returnTo);
  return NextResponse.redirect(url, 303);
}
