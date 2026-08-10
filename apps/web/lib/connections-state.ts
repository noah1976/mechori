export type ConnectionRelationship = "mutual" | "following" | "followed_by";
export type ConnectionCollectionState = "loading" | "ready" | "empty" | "error";

export interface ConnectionFollowable {
  id: string;
  relationship: ConnectionRelationship;
  viewerFollowsTarget: boolean;
  targetFollowsViewer: boolean;
}

export function canLoadAlphaConnections(
  signedIn: boolean,
  isRemoteAlpha: boolean,
): boolean {
  return signedIn && isRemoteAlpha;
}

export function deriveConnectionRelationship(
  viewerFollowsTarget: boolean,
  targetFollowsViewer: boolean,
): ConnectionRelationship {
  if (viewerFollowsTarget && targetFollowsViewer) return "mutual";
  return viewerFollowsTarget ? "following" : "followed_by";
}

export function connectionProfileHref(profileId: string): string {
  return `/profile/${encodeURIComponent(profileId)}`;
}

export function connectionCollectionState<T>(
  loading: boolean,
  failed: boolean,
  items: readonly T[],
): ConnectionCollectionState {
  if (loading) return "loading";
  if (failed) return "error";
  return items.length === 0 ? "empty" : "ready";
}

export function applyConnectionFollowResult<T extends ConnectionFollowable>(
  people: T[],
  targetId: string,
  result: { ok: true; isFollowing: boolean } | { ok: false },
): T[] {
  if (!result.ok) return people;
  return people.map((person) => {
    if (person.id !== targetId) return person;
    const viewerFollowsTarget = result.isFollowing;
    return {
      ...person,
      viewerFollowsTarget,
      relationship: deriveConnectionRelationship(
        viewerFollowsTarget,
        person.targetFollowsViewer,
      ),
    };
  });
}

export function removeVehicleAfterUnfollow<T extends { targetId: string }>(
  vehicles: T[],
  targetId: string,
  result: { ok: true; isFollowing: boolean } | { ok: false },
): T[] {
  if (!result.ok || result.isFollowing) return vehicles;
  return vehicles.filter((vehicle) => vehicle.targetId !== targetId);
}
