import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface AlphaProfileIdentity {
  id: string;
  displayName: string;
  publicUsername?: string;
  bio: string;
  contentPolicyVersion?: string;
  contentPolicyAcceptedAt?: string;
}

interface AlphaProfileIdentityRow {
  public_profile_id: string;
  display_name: string;
  public_username: string | null;
  bio: string;
  content_policy_version: string | null;
  content_policy_accepted_at: string | null;
}

export async function loadMyAlphaProfileIdentity(): Promise<AlphaProfileIdentity> {
  const { data, error } = await createSupabaseBrowserClient()
    .rpc("get_my_alpha_profile")
    .single();
  if (error || !data) throw new Error("alpha_profile_identity_load_failed");
  return mapIdentity(data as AlphaProfileIdentityRow);
}

export async function updateMyAlphaProfileIdentity(
  displayName: string,
  publicUsername: string,
  bio: string,
): Promise<AlphaProfileIdentity> {
  const { data, error } = await createSupabaseBrowserClient()
    .rpc("update_my_alpha_profile", {
      p_display_name: displayName,
      p_public_username: publicUsername,
      p_bio: bio.normalize("NFKC"),
    })
    .single();
  if (error) {
    if (error.message.includes("public_username_taken")) {
      throw new Error("public_username_taken");
    }
    if (error.message.includes("invalid_public_username")) {
      throw new Error("invalid_public_username");
    }
    if (error.message.includes("invalid_display_name")) {
      throw new Error("invalid_display_name");
    }
    if (
      error.message.includes("invalid_profile_bio") ||
      error.message.includes("profile_bio_contact_information")
    ) {
      throw new Error("invalid_profile_bio");
    }
    throw new Error("alpha_profile_identity_update_failed");
  }
  if (!data) throw new Error("alpha_profile_identity_update_failed");
  return mapIdentity(data as AlphaProfileIdentityRow);
}

function mapIdentity(row: AlphaProfileIdentityRow): AlphaProfileIdentity {
  return {
    id: row.public_profile_id,
    displayName: row.display_name,
    publicUsername: row.public_username ?? undefined,
    bio: row.bio ?? "",
    contentPolicyVersion: row.content_policy_version ?? undefined,
    contentPolicyAcceptedAt: row.content_policy_accepted_at ?? undefined,
  };
}

export async function acceptAlphaContentPolicy(version: string): Promise<string> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "accept_alpha_content_policy",
    { p_version: version },
  );
  if (error || typeof data !== "string") {
    throw new Error("alpha_content_policy_accept_failed");
  }
  return data;
}
