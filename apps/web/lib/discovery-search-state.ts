import {
  deriveConnectionRelationship,
  type ConnectionRelationship,
} from "./connections-state.ts";

export interface DiscoveryOwnerState {
  id: string;
  viewerFollowsTarget: boolean;
  targetFollowsViewer: boolean;
  relationship?: ConnectionRelationship;
}

export interface DiscoveryVehicleState {
  targetId: string;
  viewerFollowsVehicle: boolean;
}

export interface PublicVehicleDiscoveryMatch {
  make: string;
  model: string;
  nickname?: string;
  modelYear?: number;
  ownerDisplayName: string;
  ownerPublicUsername?: string;
  isPublic: boolean;
}

export function normalizeDiscoveryQuery(value: string): string {
  return value.trim().toLocaleLowerCase().slice(0, 80);
}

export function matchesPublicVehicleDiscovery(
  vehicle: PublicVehicleDiscoveryMatch,
  query: string,
): boolean {
  const normalizedQuery = normalizeDiscoveryQuery(query);
  if (!vehicle.isPublic || !normalizedQuery) return false;
  return [
    vehicle.make,
    vehicle.model,
    vehicle.nickname,
    vehicle.modelYear?.toString(),
    vehicle.ownerDisplayName,
    vehicle.ownerPublicUsername,
  ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery));
}

export function applyDiscoveryOwnerFollowResult<T extends DiscoveryOwnerState>(
  owners: T[],
  targetId: string,
  result: { ok: true; isFollowing: boolean } | { ok: false },
): T[] {
  if (!result.ok) return owners;
  return owners.map((owner) => {
    if (owner.id !== targetId) return owner;
    return {
      ...owner,
      viewerFollowsTarget: result.isFollowing,
      relationship:
        result.isFollowing || owner.targetFollowsViewer
          ? deriveConnectionRelationship(result.isFollowing, owner.targetFollowsViewer)
          : undefined,
    };
  });
}

export function applyDiscoveryVehicleFollowResult<T extends DiscoveryVehicleState>(
  vehicles: T[],
  targetId: string,
  result: { ok: true; isFollowing: boolean } | { ok: false },
): T[] {
  if (!result.ok) return vehicles;
  return vehicles.map((vehicle) =>
    vehicle.targetId === targetId
      ? { ...vehicle, viewerFollowsVehicle: result.isFollowing }
      : vehicle,
  );
}
