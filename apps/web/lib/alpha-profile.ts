import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface AlphaProfileIdentity {
  id: string;
  displayName: string;
  publicUsername?: string;
}

interface AlphaProfileIdentityRow {
  public_profile_id: string;
  display_name: string;
  public_username: string | null;
}

export async function loadMyAlphaProfileIdentity(): Promise<AlphaProfileIdentity> {
  const { data, error } = await createSupabaseBrowserClient()
    .rpc("get_my_public_profile_identity")
    .single();
  if (error || !data) throw new Error("alpha_profile_identity_load_failed");
  return mapIdentity(data as AlphaProfileIdentityRow);
}

export async function updateMyAlphaProfileIdentity(
  displayName: string,
  publicUsername: string,
): Promise<AlphaProfileIdentity> {
  const { data, error } = await createSupabaseBrowserClient()
    .rpc("update_my_public_profile_identity", {
      p_display_name: displayName,
      p_public_username: publicUsername,
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
  };
}
