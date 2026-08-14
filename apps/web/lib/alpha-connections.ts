import { loadAlphaPublicProfileImages } from "@/lib/alpha-public-owners";
import {
  applyConnectionFollowResult as applyConnectionFollowState,
  connectionCollectionState,
  connectionProfileHref,
  deriveConnectionRelationship,
  removeVehicleAfterUnfollow as removeVehicleFollowState,
  type ConnectionCollectionState,
  type ConnectionRelationship,
} from "@/lib/connections-state";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type ConnectionPersonList = "following" | "followers";
export {
  connectionCollectionState,
  connectionProfileHref,
  deriveConnectionRelationship,
};
export type { ConnectionCollectionState, ConnectionRelationship };

export interface AlphaConnectionPerson {
  id: string;
  displayName: string;
  publicUsername?: string;
  profileImagePath?: string;
  representativeVehicle?: {
    targetId: string;
    slug: string;
    make: string;
    model: string;
    year?: number;
  };
  relationship: ConnectionRelationship;
  viewerFollowsTarget: boolean;
  targetFollowsViewer: boolean;
  followedAt: string;
}

export interface AlphaFollowedVehicle {
  targetId: string;
  slug: string;
  make: string;
  model: string;
  year?: number;
  imageDataUrl?: string;
  owner: {
    id: string;
    displayName: string;
    publicUsername?: string;
    profileImagePath?: string;
    viewerFollowsOwner: boolean;
  };
  followedAt: string;
}

interface AlphaConnectionPersonRow {
  public_profile_id: string;
  display_name: string;
  public_username: string | null;
  representative_vehicle_target_id: string | null;
  representative_vehicle_slug: string | null;
  representative_vehicle_make: string | null;
  representative_vehicle_model: string | null;
  representative_vehicle_year: number | null;
  viewer_follows_target: boolean;
  target_follows_viewer: boolean;
  followed_at: string;
}

interface AlphaFollowedVehicleRow {
  vehicle_target_id: string;
  vehicle_slug: string;
  make: string;
  model: string;
  model_year: number | null;
  image_data_url: string | null;
  owner_public_profile_id: string;
  owner_display_name: string;
  owner_public_username: string | null;
  viewer_follows_owner: boolean;
  followed_at: string;
}

export function applyPersonFollowResult(
  people: AlphaConnectionPerson[],
  targetId: string,
  result: { ok: true; isFollowing: boolean } | { ok: false },
): AlphaConnectionPerson[] {
  return applyConnectionFollowState(people, targetId, result);
}

export function removeVehicleAfterUnfollow(
  vehicles: AlphaFollowedVehicle[],
  targetId: string,
  result: { ok: true; isFollowing: boolean } | { ok: false },
): AlphaFollowedVehicle[] {
  return removeVehicleFollowState(vehicles, targetId, result);
}

export async function loadAlphaConnectionPeople(
  ownerPublicProfileId: string | null,
  relationship: ConnectionPersonList,
): Promise<AlphaConnectionPerson[]> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "list_alpha_connection_people",
    {
      p_owner_public_profile_id: ownerPublicProfileId,
      p_relationship: relationship,
    },
  );
  if (error) throw new Error("alpha_connections_people_load_failed");

  const rows = (data ?? []) as AlphaConnectionPersonRow[];
  const images = await loadAlphaPublicProfileImages(
    rows.map((row) => row.public_profile_id),
  );
  return rows.map((row) => ({
    id: row.public_profile_id,
    displayName: row.display_name,
    publicUsername: row.public_username ?? undefined,
    profileImagePath: images.get(row.public_profile_id),
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
    relationship: deriveConnectionRelationship(
      row.viewer_follows_target,
      row.target_follows_viewer,
    ),
    viewerFollowsTarget: row.viewer_follows_target,
    targetFollowsViewer: row.target_follows_viewer,
    followedAt: row.followed_at,
  }));
}

export async function loadMyAlphaFollowedVehicles(): Promise<AlphaFollowedVehicle[]> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "list_my_alpha_followed_vehicles",
  );
  if (error) throw new Error("alpha_connections_vehicles_load_failed");

  const rows = (data ?? []) as AlphaFollowedVehicleRow[];
  const images = await loadAlphaPublicProfileImages(
    rows.map((row) => row.owner_public_profile_id),
  );
  return rows.map((row) => ({
    targetId: row.vehicle_target_id,
    slug: row.vehicle_slug,
    make: row.make,
    model: row.model,
    year: row.model_year ?? undefined,
    imageDataUrl: row.image_data_url ?? undefined,
    owner: {
      id: row.owner_public_profile_id,
      displayName: row.owner_display_name,
      publicUsername: row.owner_public_username ?? undefined,
      profileImagePath: images.get(row.owner_public_profile_id),
      viewerFollowsOwner: row.viewer_follows_owner,
    },
    followedAt: row.followed_at,
  }));
}
