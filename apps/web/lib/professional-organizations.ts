import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ProfessionalOrganizationRole } from "@/lib/professional-organization-policy";

export type { ProfessionalOrganizationRole } from "@/lib/professional-organization-policy";

export type ProfessionalOrganizationStatus = "active" | "inactive";

export interface ProfessionalOrganizationSummary {
  id: string;
  name: string;
  slug: string;
  status: ProfessionalOrganizationStatus;
  foundingGarage: boolean;
  providerId?: string;
  providerName?: string;
  providerLocality?: string;
  myRole?: ProfessionalOrganizationRole;
  memberCount: number;
}

export interface ProfessionalMember {
  userId: string;
  publicProfileId: string;
  displayName: string;
  publicUsername?: string;
  profileImagePath?: string;
  role: ProfessionalOrganizationRole;
}

export type ProfessionalMemberCandidate = Omit<ProfessionalMember, "role">;

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  status: ProfessionalOrganizationStatus;
  founding_garage: boolean;
  provider_id: string | null;
  provider_name: string | null;
  provider_locality: string | null;
  my_role: ProfessionalOrganizationRole | null;
  member_count: number;
}

interface MemberRow {
  user_id: string;
  public_profile_id: string;
  display_name: string;
  public_username: string | null;
  profile_image_path: string | null;
  role_code?: ProfessionalOrganizationRole;
}

export async function loadMyProfessionalAccess(): Promise<boolean> {
  const { data, error } = await createSupabaseBrowserClient().rpc("get_my_professional_access");
  if (error) return false;
  return data === true;
}

export async function loadMyProfessionalOrganizations(): Promise<ProfessionalOrganizationSummary[]> {
  const { data, error } = await createSupabaseBrowserClient().rpc("list_my_professional_organizations");
  if (error) throw new Error("professional_organizations_load_failed");
  return ((data ?? []) as OrganizationRow[]).map(organizationFromRow);
}

export async function loadProfessionalMembers(organizationId: string): Promise<ProfessionalMember[]> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "list_professional_organization_members",
    { p_organization_id: organizationId },
  );
  if (error) throw new Error("professional_members_load_failed");
  return ((data ?? []) as MemberRow[]).map((row) => ({ ...memberFromRow(row), role: row.role_code! }));
}

export async function searchProfessionalMemberCandidates(
  organizationId: string,
  query: string,
): Promise<ProfessionalMemberCandidate[]> {
  if (!query.trim()) return [];
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "search_professional_member_candidates",
    { p_organization_id: organizationId, p_query: query.trim(), p_limit: 20 },
  );
  if (error) throw new Error("professional_member_search_failed");
  return ((data ?? []) as MemberRow[]).map(memberFromRow);
}

export async function createProfessionalOrganization(input: {
  name: string;
  slug: string;
  foundingGarage: boolean;
  providerId?: string;
  ownerUserId?: string;
}): Promise<string> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "admin_create_professional_organization",
    {
      p_name: input.name,
      p_slug: input.slug,
      p_founding_garage: input.foundingGarage,
      p_provider_id: input.providerId ?? null,
      p_owner_user_id: input.ownerUserId ?? null,
    },
  );
  if (error || typeof data !== "string") throw new Error("professional_organization_create_failed");
  return data;
}

export async function updateProfessionalOrganization(input: ProfessionalOrganizationSummary): Promise<void> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "update_professional_organization",
    {
      p_organization_id: input.id,
      p_name: input.name,
      p_slug: input.slug,
      p_status: input.status,
      p_founding_garage: input.foundingGarage,
      p_provider_id: input.providerId ?? null,
    },
  );
  if (error || data !== true) throw new Error("professional_organization_update_failed");
}

export async function addProfessionalMember(
  organizationId: string,
  userId: string,
  role: ProfessionalOrganizationRole,
): Promise<void> {
  await runMemberMutation("add_professional_organization_member", {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_role_code: role,
  });
}

export async function changeProfessionalMemberRole(
  organizationId: string,
  userId: string,
  role: ProfessionalOrganizationRole,
): Promise<void> {
  await runMemberMutation("change_professional_organization_member_role", {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_role_code: role,
  });
}

export async function removeProfessionalMember(organizationId: string, userId: string): Promise<void> {
  await runMemberMutation("remove_professional_organization_member", {
    p_organization_id: organizationId,
    p_user_id: userId,
  });
}

async function runMemberMutation(functionName: string, parameters: Record<string, string>) {
  const { data, error } = await createSupabaseBrowserClient().rpc(functionName, parameters);
  if (error || data !== true) throw new Error("professional_member_update_failed");
}

function organizationFromRow(row: OrganizationRow): ProfessionalOrganizationSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    foundingGarage: row.founding_garage,
    providerId: row.provider_id ?? undefined,
    providerName: row.provider_name ?? undefined,
    providerLocality: row.provider_locality ?? undefined,
    myRole: row.my_role ?? undefined,
    memberCount: Number(row.member_count),
  };
}

function memberFromRow(row: MemberRow): ProfessionalMemberCandidate {
  return {
    userId: row.user_id,
    publicProfileId: row.public_profile_id,
    displayName: row.display_name,
    publicUsername: row.public_username ?? undefined,
    profileImagePath: row.profile_image_path ?? undefined,
  };
}
