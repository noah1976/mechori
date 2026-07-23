import type { AppData, SocialProfile } from "./types.ts";

export function createEmptyAppData(
  profileId: string,
  displayName = "MECHORI User",
): AppData {
  const normalizedProfileId = profileId.trim();
  if (!normalizedProfileId) throw new Error("profile_id_required");

  const profile: SocialProfile = {
    id: normalizedProfileId,
    displayName: displayName.trim() || "MECHORI User",
    role: "owner",
    bio: "",
    visibility: "private",
    displayFields: [],
    isProfessional: false,
    isDemo: false,
  };

  return {
    schemaVersion: 12,
    vehicles: [],
    records: [],
    profiles: [profile],
    currentProfileId: profile.id,
    journals: [],
    contentTranslations: [],
    follows: [],
    profileSafetyRelations: [],
    contentReports: [],
  };
}
