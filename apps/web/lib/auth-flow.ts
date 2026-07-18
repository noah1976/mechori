import { sanitizeLocalReturnPath } from "@mechori/core";
import { translate } from "@mechori/i18n";

export const alphaInviteCookieName = "mechori_alpha_invite";

export function alphaAuthErrorMessage(
  code: string | null,
  locale: "ja" | "en",
): string {
  switch (code) {
    case "invitation_required":
      return translate(locale, "alphaMembershipRequired");
    case "invalid_invitation":
      return translate(locale, "invitationInvalid");
    case "expired":
      return translate(locale, "invitationExpired");
    case "revoked":
      return translate(locale, "invitationRevoked");
    case "exhausted":
      return translate(locale, "invitationUsed");
    case "membership_inactive":
      return translate(locale, "membershipInactive");
    case "oauth_failed":
      return translate(locale, "oauthFailed");
    default:
      return "";
  }
}

export function authCallbackUrl(origin: string, returnTo: string): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("returnTo", sanitizeLocalReturnPath(returnTo));
  return url.toString();
}
