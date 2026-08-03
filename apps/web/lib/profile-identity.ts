export interface ProfileIdentityInput {
  displayName: string;
  publicUsername: string;
  bio?: string;
}

export type ProfileIdentityField = "displayName" | "publicUsername" | "bio";

export interface ProfileIdentityValidation {
  valid: boolean;
  normalized: {
    displayName: string;
    publicUsername: string;
    bio: string;
  };
  errors: Partial<Record<ProfileIdentityField, "required" | "invalid">>;
}

export function normalizePublicUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

export function validateProfileIdentity(
  input: ProfileIdentityInput,
): ProfileIdentityValidation {
  const normalized = {
    displayName: input.displayName.trim(),
    publicUsername: normalizePublicUsername(input.publicUsername),
    bio: input.bio?.normalize("NFKC").trim() ?? "",
  };
  const errors: ProfileIdentityValidation["errors"] = {};
  if (!normalized.displayName) errors.displayName = "required";
  else if (normalized.displayName.length > 80) errors.displayName = "invalid";
  if (!normalized.publicUsername) errors.publicUsername = "required";
  else if (!/^[a-z0-9_]{3,30}$/.test(normalized.publicUsername)) {
    errors.publicUsername = "invalid";
  }
  if (
    normalized.bio.length > 300 ||
    /<[^>]+>/.test(normalized.bio) ||
    /[\w.%+-]+@[\w.-]+\.[a-z]{2,}/i.test(normalized.bio) ||
    containsLikelyPhoneNumber(normalized.bio)
  ) {
    errors.bio = "invalid";
  }
  return { valid: Object.keys(errors).length === 0, normalized, errors };
}

function containsLikelyPhoneNumber(value: string): boolean {
  const candidate = value.match(/\+?\d[\d ()-]{7,}\d/);
  if (!candidate) return false;
  const digits = candidate[0].replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 15;
}
