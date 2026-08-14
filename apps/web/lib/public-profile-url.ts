import type { SocialProfile } from "@mechori/core";

export function publicProfileHref(profile: Pick<SocialProfile, "id" | "publicUsername">): string {
  return `/profile/${encodeURIComponent(profile.publicUsername?.trim() || profile.id)}`;
}
