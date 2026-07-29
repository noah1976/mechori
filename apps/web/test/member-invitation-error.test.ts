import assert from "node:assert/strict";
import test from "node:test";
import { memberInvitationErrorMessage } from "../lib/member-invitation-error.ts";

test("explains when the member invitation database function is not available", () => {
  const message = memberInvitationErrorMessage(
    {
      code: "PGRST202",
      message:
        "Could not find the function public.create_member_invitation(p_expires_at, p_token_hash) in the schema cache",
    },
    true,
  );

  assert.match(message, /初期設定/);
  assert.doesNotMatch(message, /時間をおいて/);
});

test("keeps invitation limits understandable", () => {
  assert.match(
    memberInvitationErrorMessage(new Error("active_invitation_limit"), true),
    /下の一覧から取り消す/,
  );
  assert.match(
    memberInvitationErrorMessage(new Error("monthly_invitation_limit"), false),
    /month's invitation limit/,
  );
});

test("asks the user to sign in again when the session expired", () => {
  assert.match(
    memberInvitationErrorMessage({ message: "JWT expired" }, true),
    /もう一度ログイン/,
  );
});

test("does not expose an unknown backend error", () => {
  const message = memberInvitationErrorMessage(
    { code: "XX000", message: "private database failure detail" },
    true,
  );

  assert.equal(
    message,
    "招待URLを発行できませんでした。もう一度試しても解決しない場合は、運営者へお知らせください。",
  );
});
