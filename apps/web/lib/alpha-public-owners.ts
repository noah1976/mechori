import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export interface AlphaPublicOwnerSummary {
  id: string;
  displayName: string;
  publicUsername?: string;
  profileImagePath?: string;
  vehicleCount: number;
  representativeVehicle?: {
    targetId: string;
    slug: string;
    make: string;
    model: string;
    year?: number;
  };
  viewerFollowsTarget: boolean;
  targetFollowsViewer: boolean;
  relationship?: "mutual" | "following" | "followed_by";
}

export interface AlphaPublicVehicleSearchResult {
  targetId: string;
  slug: string;
  make: string;
  model: string;
  nickname?: string;
  modelYear?: number;
  imageDataUrl?: string;
  viewerFollowsVehicle: boolean;
  owner: {
    id: string;
    displayName: string;
    publicUsername?: string;
    profileImagePath?: string;
    viewerFollowsOwner: boolean;
  };
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
  imageDataUrl?: string;
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
  representative_vehicle_target_id: string | null;
  representative_vehicle_slug: string | null;
  representative_vehicle_make: string | null;
  representative_vehicle_model: string | null;
  representative_vehicle_year: number | null;
  viewer_follows_target: boolean;
  target_follows_viewer: boolean;
}

interface AlphaPublicVehicleSearchRow {
  owner_public_profile_id: string;
  owner_display_name: string;
  owner_public_username: string | null;
  vehicle_target_id: string;
  vehicle_slug: string;
  make: string;
  model: string;
  nickname: string | null;
  model_year: number | null;
  image_data_url: string | null;
  viewer_follows_owner: boolean;
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
  image_data_url: string | null;
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
    "search_alpha_member_owners",
    { p_query: normalizedQuery },
  );
  if (error) throw new Error("alpha_public_owner_search_failed");
  const owners = mapAlphaPublicOwnerSearchRows(
    (data ?? []) as AlphaPublicOwnerSearchRow[],
  );
  const images = await loadAlphaPublicProfileImages(owners.map((owner) => owner.id));
  return owners.map((owner) => ({
    ...owner,
    profileImagePath: images.get(owner.id),
  }));
}

export async function resolveAlphaMemberProfileByUsername(
  username: string,
): Promise<string | null> {
  const normalizedUsername = username.trim().replace(/^@+/, "").slice(0, 80);
  if (!normalizedUsername) return null;
  const { data, error } = await createSupabaseBrowserClient()
    .rpc("resolve_alpha_member_profile", {
      p_public_username: normalizedUsername,
    })
    .maybeSingle();
  if (error) throw new Error("alpha_member_profile_resolution_failed");
  const row = data as { public_profile_id?: string } | null;
  return row?.public_profile_id ?? null;
}

export async function searchAlphaPublicVehicles(
  query: string,
): Promise<AlphaPublicVehicleSearchResult[]> {
  const normalizedQuery = query.trim().slice(0, 80);
  if (!normalizedQuery) return [];
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "search_alpha_member_vehicles",
    { p_query: normalizedQuery },
  );
  if (error) throw new Error("alpha_public_vehicle_search_failed");
  const rows = (data ?? []) as AlphaPublicVehicleSearchRow[];
  const images = await loadAlphaPublicProfileImages(
    rows.map((row) => row.owner_public_profile_id),
  );
  return mapAlphaPublicVehicleSearchRows(rows, images);
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
    supabase.rpc("get_alpha_member_owner", {
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
      imageDataUrl: row.image_data_url ?? undefined,
      publishedAt: row.published_at,
    });
    owners.set(row.public_profile_id, owner);
  }
  return [...owners.values()];
}

export function mapAlphaPublicOwnerSearchRows(
  rows: AlphaPublicOwnerSearchRow[],
): AlphaPublicOwnerSummary[] {
  return rows.map((row) => ({
    id: row.public_profile_id,
    displayName: row.display_name,
    publicUsername: row.public_username ?? undefined,
    vehicleCount: Number(row.vehicle_count) || 0,
    representativeVehicle:
      row.representative_vehicle_target_id &&
      row.representative_vehicle_slug &&
      row.representative_vehicle_make &&
      row.representative_vehicle_model
        ? {
            targetId: row.representative_vehicle_target_id,
            slug: row.representative_vehicle_slug,
            make: row.representative_vehicle_make,
            model: row.representative_vehicle_model,
            year: row.representative_vehicle_year ?? undefined,
          }
        : undefined,
    viewerFollowsTarget: row.viewer_follows_target,
    targetFollowsViewer: row.target_follows_viewer,
    relationship:
      row.viewer_follows_target || row.target_follows_viewer
        ? row.viewer_follows_target && row.target_follows_viewer
          ? "mutual"
          : row.viewer_follows_target
            ? "following"
            : "followed_by"
        : undefined,
  }));
}

export function mapAlphaPublicVehicleSearchRows(
  rows: AlphaPublicVehicleSearchRow[],
  images: Map<string, string> = new Map(),
): AlphaPublicVehicleSearchResult[] {
  return rows.map((row) => ({
    targetId: row.vehicle_target_id,
    slug: row.vehicle_slug,
    make: row.make,
    model: row.model,
    nickname: row.nickname ?? undefined,
    modelYear: row.model_year ?? undefined,
    imageDataUrl: row.image_data_url ?? undefined,
    viewerFollowsVehicle: false,
    owner: {
      id: row.owner_public_profile_id,
      displayName: row.owner_display_name,
      publicUsername: row.owner_public_username ?? undefined,
      profileImagePath: images.get(row.owner_public_profile_id),
      viewerFollowsOwner: row.viewer_follows_owner,
    },
  }));
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
