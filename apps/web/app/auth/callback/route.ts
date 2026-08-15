import { sanitizeLocalReturnPath } from "@mechori/core";
import { NextResponse, type NextRequest } from "next/server";
import { alphaInviteCookieName } from "@/lib/auth-flow";
import { getPublicRequestOrigin } from "@/lib/public-origin";
import { getMechoriRuntime } from "@/lib/runtime-config";
import { createSupabaseRouteClient } from "@/lib/supabase/server";

const acceptedRedemptionStatuses = new Set(["redeemed", "already_redeemed"]);

export async function GET(request: NextRequest) {
  if (getMechoriRuntime() !== "alpha") {
    return new NextResponse("Not found", { status: 404 });
  }

  const code = request.nextUrl.searchParams.get("code");
  const mode = request.nextUrl.searchParams.get("mode") === "signup" ? "signup" : "signin";
  const returnTo = sanitizeLocalReturnPath(request.nextUrl.searchParams.get("returnTo"));
  if (!code) return finish(request, authErrorPath("oauth_failed", mode, returnTo));

  const authRouteClient = createSupabaseRouteClient(request);
  const { supabase } = authRouteClient;
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return finish(request, authErrorPath("oauth_failed", mode, returnTo), authRouteClient);
  }

  const { data: authData, error: userError } = await supabase.auth.getUser();
  if (userError || !authData.user) {
    return finish(request, authErrorPath("oauth_failed", mode, returnTo), authRouteClient);
  }

  const invite = request.cookies.get(alphaInviteCookieName)?.value;
  let accessError: string | undefined;

  if (invite) {
    const { data, error } = await supabase.rpc("redeem_test_invitation", {
      p_raw_token: invite,
    });
    if (error) {
      console.error("alpha_invitation_redemption_failed", {
        code: error.code,
        message: error.message,
      });
    }
    if (error || !acceptedRedemptionStatuses.has(String(data))) {
      accessError = error ? "invalid_invitation" : String(data);
    }
  } else {
    const { data: membership, error } = await supabase
      .from("test_memberships")
      .select("status")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (error || !membership) accessError = "invitation_required";
    else if (membership.status !== "active") accessError = "membership_inactive";
  }

  if (accessError) {
    await supabase.auth.signOut();
    return finish(
      request,
      authErrorPath(normalizeAccessError(accessError), mode, returnTo),
      authRouteClient,
    );
  }

  return finish(
    request,
    withAuthResult(returnTo, invite ? "sign_up" : "login", Boolean(invite)),
    authRouteClient,
  );
}

function withAuthResult(path: string, authEvent: "sign_up" | "login", inviteCompleted: boolean): string {
  const url = new URL(path, "https://mechori.invalid");
  url.searchParams.set("authEvent", authEvent);
  if (inviteCompleted) url.searchParams.set("inviteCompleted", "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

function authErrorPath(error: string, mode: "signin" | "signup", returnTo: string): string {
  const params = new URLSearchParams({ error, mode });
  if (returnTo !== "/") params.set("returnTo", returnTo);
  return `/auth?${params.toString()}`;
}

function normalizeAccessError(value: string): string {
  return [
    "invitation_required",
    "invalid_invitation",
    "expired",
    "revoked",
    "exhausted",
    "membership_inactive",
  ].includes(value)
    ? value
    : "invalid_invitation";
}

function finish(
  request: NextRequest,
  path: string,
  authRouteClient?: ReturnType<typeof createSupabaseRouteClient>,
) {
  const response = NextResponse.redirect(new URL(path, getPublicRequestOrigin(request)));
  authRouteClient?.applyTo(response);
  response.cookies.set(alphaInviteCookieName, "", { path: "/auth", maxAge: 0 });
  return response;
}
