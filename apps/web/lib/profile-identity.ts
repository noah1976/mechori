export interface ProfileIdentityInput {
  displayName: string;
  publicUsername: string;
}

export type ProfileIdentityField = "displayName" | "publicUsername";

export interface ProfileIdentityValidation {
  valid: boolean;
  normalized: ProfileIdentityInput;
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
  };
  const errors: ProfileIdentityValidation["errors"] = {};
  if (!normalized.displayName) errors.displayName = "required";
  else if (normalized.displayName.length > 80) errors.displayName = "invalid";
  if (!normalized.publicUsername) errors.publicUsername = "required";
  else if (!/^[a-z0-9_]{3,30}$/.test(normalized.publicUsername)) {
    errors.publicUsername = "invalid";
  }
  return { valid: Object.keys(errors).length === 0, normalized, errors };
}
