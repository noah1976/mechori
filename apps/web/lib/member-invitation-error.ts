type InvitationErrorDetails = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

export function memberInvitationErrorMessage(value: unknown, ja: boolean): string {
  const error = invitationErrorText(value).toLowerCase();

  if (error.includes("active_invitation_limit")) {
    return ja
      ? "未使用の招待が3件あります。送っていない招待を下の一覧から取り消すか、使用・期限切れのあとに発行してください。"
      : "You already have three unused invitations. Revoke an unsent one below, or create another after one is used or expires.";
  }
  if (error.includes("monthly_invitation_limit")) {
    return ja
      ? "今月発行できる招待数の上限に達しました。"
      : "You have reached this month's invitation limit.";
  }
  if (error.includes("active_membership_required")) {
    return ja
      ? "招待を発行できる参加状態を確認できませんでした。運営者へ確認してください。"
      : "Your invitation permission could not be confirmed. Contact the operator.";
  }
  if (
    error.includes("authentication_required") ||
    error.includes("jwt expired") ||
    error.includes("invalid jwt")
  ) {
    return ja
      ? "ログイン状態を確認できませんでした。いったんログアウトし、もう一度ログインしてください。"
      : "Your sign-in session could not be confirmed. Sign out, then sign in again.";
  }
  if (
    error.includes("pgrst202") ||
    (error.includes("create_member_invitation") &&
      (error.includes("could not find") || error.includes("schema cache")))
  ) {
    return ja
      ? "招待機能の初期設定がまだ反映されていません。運営者が設定を完了するまでお待ちください。"
      : "Invitation setup has not been applied yet. Please wait for the operator to complete it.";
  }

  return ja
    ? "招待URLを発行できませんでした。もう一度試しても解決しない場合は、運営者へお知らせください。"
    : "The invitation link could not be created. If retrying does not help, contact the operator.";
}

function invitationErrorText(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (!value || typeof value !== "object") return String(value);

  const error = value as InvitationErrorDetails;
  return [error.code, error.message, error.details, error.hint]
    .filter((part): part is string => typeof part === "string")
    .join(" ");
}
