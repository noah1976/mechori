import type { FollowRelation } from "@mechori/core";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface AlphaUserFollowRow {
  target_public_profile_id: string;
  followed_at: string;
}

export async function loadMyAlphaUserFollows(
  followerProfileId: string,
): Promise<FollowRelation[]> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "list_my_alpha_user_follows",
  );
  if (error) throw new Error("alpha_user_follows_load_failed");
  return ((data ?? []) as AlphaUserFollowRow[]).map((row) => ({
    id: `alpha-profile-follow-${row.target_public_profile_id}`,
    followerProfileId,
    targetType: "profile",
    targetId: row.target_public_profile_id,
    createdAt: row.followed_at,
  }));
}

export async function setAlphaUserFollow(
  publicProfileId: string,
  follow: boolean,
): Promise<void> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "set_alpha_user_follow",
    {
      p_target_public_profile_id: publicProfileId,
      p_follow: follow,
    },
  );
  if (error || data !== follow) throw new Error("alpha_user_follow_update_failed");
}
