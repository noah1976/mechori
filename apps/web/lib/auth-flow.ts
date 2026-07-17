import { sanitizeLocalReturnPath } from "@mechori/core";

export const alphaInviteCookieName = "mechori_alpha_invite";

export function alphaAuthErrorMessage(
  code: string | null,
  locale: "ja" | "en",
): string {
  const ja = locale === "ja";
  switch (code) {
    case "invitation_required":
      return ja ? "このα版への参加には、有効な招待URLが必要です。" : "A valid invitation link is required for this alpha.";
    case "invalid_invitation":
      return ja ? "招待URLを確認できませんでした。新しい招待URLを受け取ってください。" : "This invitation could not be verified. Ask for a new invitation link.";
    case "expired":
      return ja ? "招待URLの有効期限が切れています。" : "This invitation has expired.";
    case "revoked":
      return ja ? "この招待URLは無効になっています。" : "This invitation has been revoked.";
    case "exhausted":
      return ja ? "この招待URLはすでに使用されています。" : "This invitation has already been used.";
    case "membership_inactive":
      return ja ? "このαアカウントは現在利用できません。" : "This alpha account is not currently active.";
    case "oauth_failed":
      return ja ? "Googleログインを完了できませんでした。もう一度お試しください。" : "Google sign-in could not be completed. Please try again.";
    default:
      return "";
  }
}

export function authCallbackUrl(origin: string, returnTo: string): string {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("returnTo", sanitizeLocalReturnPath(returnTo));
  return url.toString();
}
