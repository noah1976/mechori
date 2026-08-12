export type ProfessionalOrganizationRole = "owner" | "staff";

export function canManageProfessionalOrganization(
  role: ProfessionalOrganizationRole | undefined,
  isPlatformAdmin: boolean,
  status: "active" | "inactive" = "active",
): boolean {
  return isPlatformAdmin || (role === "owner" && status === "active");
}

export function canEditProfessionalPlatformFields(isPlatformAdmin: boolean): boolean {
  return isPlatformAdmin;
}
