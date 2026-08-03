import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface AlphaPublicOwnerSummary {
  id: string;
  displayName: string;
  publicUsername?: string;
  profileImagePath?: string;
  vehicleCount: number;
}

export interface AlphaPublicVehicle {
  targetId: string;
  slug: string;
  make: string;
  model: string;
  modelYear?: number;
  ownershipStartedYear?: number;
  ownershipStartedMonth?: number;
  ownerComment?: string;
  imageDataUrl: string;
  publishedAt: string;
}

export interface AlphaPublicOwner {
  id: string;
  displayName: string;
  publicUsername?: string;
  profileImagePath?: string;
  bio: string;
  vehicles: AlphaPublicVehicle[];
}

interface AlphaPublicProfileRow {
  public_profile_id: string;
  display_name: string;
  public_username: string | null;
  bio: string;
}

interface AlphaPublicOwnerSearchRow {
  public_profile_id: string;
  display_name: string;
  public_username: string | null;
  vehicle_count: number | string;
}

export interface AlphaPublicOwnerVehicleRow {
  public_profile_id: string;
  display_name: string;
  public_username: string | null;
  vehicle_target_id: string;
  vehicle_slug: string;
  make: string;
  model: string;
  model_year: number | null;
  ownership_started_year: number | null;
  ownership_started_month: number | null;
  owner_comment: string | null;
  image_data_url: string;
  published_at: string;
}

interface AlphaPublicProfileImageRow {
  public_profile_id: string;
  profile_image_path: string;
}

export async function searchAlphaPublicOwners(
  query: string,
): Promise<AlphaPublicOwnerSummary[]> {
  const normalizedQuery = query.trim().slice(0, 80);
  if (!normalizedQuery) return [];
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "search_alpha_public_owners",
    { p_query: normalizedQuery },
  );
  if (error) throw new Error("alpha_public_owner_search_failed");
  const owners = ((data ?? []) as AlphaPublicOwnerSearchRow[]).map((row) => ({
    id: row.public_profile_id,
    displayName: row.display_name,
    publicUsername: row.public_username ?? undefined,
    vehicleCount: Number(row.vehicle_count) || 0,
  }));
  const images = await loadAlphaPublicProfileImages(owners.map((owner) => owner.id));
  return owners.map((owner) => ({
    ...owner,
    profileImagePath: images.get(owner.id),
  }));
}

export async function loadAlphaPublicOwner(
  publicProfileId: string,
): Promise<AlphaPublicOwner | null> {
  if (!isUuid(publicProfileId)) return null;
  const supabase = createSupabaseBrowserClient();
  const [profileResult, vehicleResult, images] = await Promise.all([
    supabase.rpc("get_alpha_public_profile", {
      p_public_profile_id: publicProfileId,
    }).maybeSingle(),
    supabase.rpc("get_alpha_public_owner", {
      p_public_profile_id: publicProfileId,
    }),
    loadAlphaPublicProfileImages([publicProfileId]),
  ]);
  if (profileResult.error || vehicleResult.error || !profileResult.data) {
    throw new Error("alpha_public_owner_load_failed");
  }
  const profile = profileResult.data as AlphaPublicProfileRow;
  const grouped = groupAlphaPublicOwnerRows(
    (vehicleResult.data ?? []) as AlphaPublicOwnerVehicleRow[],
  )[0];
  return {
    id: profile.public_profile_id,
    displayName: profile.display_name,
    publicUsername: profile.public_username ?? undefined,
    profileImagePath: images.get(publicProfileId),
    bio: profile.bio ?? "",
    vehicles: grouped?.vehicles ?? [],
  };
}

export async function suggestAlphaPublicOwners(
  limit = 10,
): Promise<AlphaPublicOwner[]> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "suggest_alpha_public_owners",
    { p_limit: Math.min(Math.max(Math.trunc(limit), 1), 10) },
  );
  if (error) throw new Error("alpha_public_owner_suggestions_failed");
  const owners = groupAlphaPublicOwnerRows(
    (data ?? []) as AlphaPublicOwnerVehicleRow[],
  );
  const images = await loadAlphaPublicProfileImages(owners.map((owner) => owner.id));
  return owners.map((owner) => ({
    ...owner,
    profileImagePath: images.get(owner.id),
  }));
}

export async function loadAlphaPublicProfileImages(
  publicProfileIds?: string[],
): Promise<Map<string, string>> {
  const ids = publicProfileIds
    ? [...new Set(publicProfileIds.filter(isUuid))]
    : undefined;
  if (ids && ids.length === 0) return new Map();
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "get_alpha_public_profile_images",
    { p_public_profile_ids: ids ?? null },
  );
  if (error) return new Map();
  return new Map(
    ((data ?? []) as AlphaPublicProfileImageRow[]).map((row) => [
      row.public_profile_id,
      row.profile_image_path,
    ]),
  );
}

export function groupAlphaPublicOwnerRows(
  rows: AlphaPublicOwnerVehicleRow[],
): AlphaPublicOwner[] {
  const owners = new Map<string, AlphaPublicOwner>();
  for (const row of rows) {
    const owner = owners.get(row.public_profile_id) ?? {
      id: row.public_profile_id,
      displayName: row.display_name,
      publicUsername: row.public_username ?? undefined,
      bio: "",
      vehicles: [],
    };
    owner.vehicles.push({
      targetId: row.vehicle_target_id,
      slug: row.vehicle_slug,
      make: row.make,
      model: row.model,
      modelYear: row.model_year ?? undefined,
      ownershipStartedYear: row.ownership_started_year ?? undefined,
      ownershipStartedMonth: row.ownership_started_month ?? undefined,
      ownerComment: row.owner_comment ?? undefined,
      imageDataUrl: row.image_data_url,
      publishedAt: row.published_at,
    });
    owners.set(row.public_profile_id, owner);
  }
  return [...owners.values()];
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
