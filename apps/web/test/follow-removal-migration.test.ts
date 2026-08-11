import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sql = readFileSync(
  new URL(
    "../../../supabase/migrations/202608110002_fix_alpha_user_follow_removal.sql",
    import.meta.url,
  ),
  "utf8",
);

test("person unfollow resolves the target into a distinct variable before deleting one relation", () => {
  assert.match(sql, /declare\s+resolved_target_user_id uuid;/);
  assert.match(sql, /into resolved_target_user_id/);
  assert.match(
    sql,
    /delete from public\.alpha_user_follows follow\s+where follow\.follower_user_id = auth\.uid\(\)\s+and follow\.target_user_id = resolved_target_user_id;/,
  );
  assert.doesNotMatch(sql, /follow\.target_user_id = target_user_id/);
});

test("the follow RPC retains authenticated-only execution without an administrator bypass", () => {
  assert.match(sql, /if auth\.uid\(\) is null then/);
  assert.match(sql, /if not public\.is_active_test_member\(auth\.uid\(\)\) then/);
  assert.match(sql, /revoke all on function public\.set_alpha_user_follow\(uuid, boolean\)/);
  assert.match(sql, /grant execute on function public\.set_alpha_user_follow\(uuid, boolean\)\s+to authenticated;/);
  assert.doesNotMatch(sql, /platform_super_admin|is_admin|alpha_notifications/);
});
