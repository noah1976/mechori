import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { preparePrivateAlphaImage } from "@/lib/image-preparation";

export const alphaProfileImageBucket = "alpha-profile-images";
const maxProfileImageBytes = 220 * 1024;
const maxProfileImageDimension = 768;

export interface AlphaProfileIdentity {
  id: string;
  displayName: string;
  publicUsername?: string;
  bio: string;
  profileImagePath?: string;
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
  const supabase = createSupabaseBrowserClient();
  const [profileResult, imageResult] = await Promise.all([
    supabase.rpc("get_my_alpha_profile").single(),
    supabase.rpc("get_my_alpha_profile_image"),
  ]);
  const { data, error } = profileResult;
  if (error || !data) throw new Error("alpha_profile_identity_load_failed");
  return {
    ...mapIdentity(data as AlphaProfileIdentityRow),
    profileImagePath:
      !imageResult.error && typeof imageResult.data === "string"
        ? imageResult.data
        : undefined,
  };
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

export async function replaceMyAlphaProfileImage(
  file: File,
  previousPath?: string,
): Promise<string> {
  const supabase = createSupabaseBrowserClient();
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (sessionError || !userId) throw new Error("authentication_required");

  const prepared = await preparePrivateAlphaImage(file, {
    maxDimension: maxProfileImageDimension,
    maxOutputBytes: maxProfileImageBytes,
  });
  const extension = prepared.mimeType === "image/jpeg" ? "jpg" : "webp";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(alphaProfileImageBucket)
    .upload(path, prepared.blob, {
      cacheControl: "3600",
      contentType: prepared.mimeType,
      upsert: false,
    });
  if (uploadError) throw new Error("alpha_profile_image_upload_failed");

  const { data: savedPath, error: updateError } = await supabase.rpc(
    "update_my_alpha_profile_image",
    { p_profile_image_path: path },
  );
  if (updateError || savedPath !== path) {
    await removeAlphaProfileImageQuietly(path);
    throw new Error("alpha_profile_image_update_failed");
  }
  if (previousPath && previousPath !== path) {
    await removeAlphaProfileImageQuietly(previousPath);
  }
  return path;
}

export async function removeMyAlphaProfileImage(previousPath?: string): Promise<void> {
  const { error } = await createSupabaseBrowserClient().rpc(
    "update_my_alpha_profile_image",
    { p_profile_image_path: null },
  );
  if (error) throw new Error("alpha_profile_image_update_failed");
  if (previousPath) await removeAlphaProfileImageQuietly(previousPath);
}

async function removeAlphaProfileImageQuietly(path: string): Promise<void> {
  try {
    await createSupabaseBrowserClient()
      .storage
      .from(alphaProfileImageBucket)
      .remove([path]);
  } catch {
    // The profile row is the access gate. Orphan cleanup can safely retry later.
  }
}
