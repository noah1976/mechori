import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type AlphaFeedbackKind = "liked" | "confusing" | "broken" | "missing" | "other";
export type AlphaFeedbackStatus = "new" | "reviewing" | "planned" | "resolved" | "closed";

export interface AlphaAdminDashboard {
  activeUsers: number;
  registeredVehicles: number;
  journalPosts: number;
  newFeedback: number;
  activeOwnerPlus: number;
  sharedJournals: number;
  isAdmin: boolean;
}

export interface AlphaAdminFeedback {
  id: string;
  publicProfileId: string;
  displayName: string;
  kind: AlphaFeedbackKind;
  content: string;
  pagePath: string;
  appBuild: string;
  status: AlphaFeedbackStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlphaAdminUser {
  userId: string;
  publicProfileId: string;
  displayName: string;
  publicUsername?: string;
  membershipStatus: string;
  phase: string;
  planCode: "free" | "owner_plus";
  activeEntitlementId?: string;
  entitlementSource?: string;
  entitlementStartsAt?: string;
  entitlementEndsAt?: string;
  staffRoles: Array<"admin" | "moderator" | "support">;
  registeredVehicles: number;
  journalPosts: number;
  joinedAt: string;
}

export interface AlphaAdminAuditLog {
  id: string;
  actorDisplayName: string;
  action: "feedback_updated" | "entitlement_granted" | "entitlement_revoked" | "staff_role_changed" | string;
  targetType: string;
  targetDisplayName: string;
  detail: Record<string, unknown>;
  createdAt: string;
}

export async function submitAlphaFeedback(input: {
  kind: AlphaFeedbackKind;
  content: string;
  pagePath: string;
  appBuild: string;
  userAgent: string;
}): Promise<string> {
  const { data, error } = await createSupabaseBrowserClient().rpc("submit_alpha_feedback", {
    p_kind: input.kind,
    p_content: input.content.normalize("NFKC").trim(),
    p_page_path: input.pagePath,
    p_app_build: input.appBuild,
    p_user_agent: input.userAgent,
  });
  if (error || typeof data !== "string") {
    if (error?.message.includes("feedback_rate_limited")) throw new Error("feedback_rate_limited");
    throw new Error("feedback_submit_failed");
  }
  return data;
}

export async function loadAlphaAdminDashboard(): Promise<AlphaAdminDashboard | null> {
  const { data, error } = await createSupabaseBrowserClient().rpc("admin_alpha_dashboard").maybeSingle();
  if (error) throw new Error("admin_dashboard_load_failed");
  if (!data) return null;
  const row = data as Record<string, unknown>;
  return {
    activeUsers: Number(row.active_users ?? 0),
    registeredVehicles: Number(row.registered_vehicles ?? 0),
    journalPosts: Number(row.journal_posts ?? 0),
    newFeedback: Number(row.new_feedback ?? 0),
    activeOwnerPlus: Number(row.active_owner_plus ?? 0),
    sharedJournals: Number(row.shared_journals ?? 0),
    isAdmin: row.is_admin === true,
  };
}

export async function loadAlphaAdminFeedback(): Promise<AlphaAdminFeedback[]> {
  const { data, error } = await createSupabaseBrowserClient().rpc("admin_list_alpha_feedback");
  if (error) throw new Error("admin_feedback_load_failed");
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    publicProfileId: String(row.public_profile_id),
    displayName: String(row.display_name),
    kind: row.kind as AlphaFeedbackKind,
    content: String(row.content),
    pagePath: String(row.page_path ?? ""),
    appBuild: String(row.app_build ?? ""),
    status: row.status as AlphaFeedbackStatus,
    adminNote: String(row.admin_note ?? ""),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }));
}

export async function updateAlphaAdminFeedback(
  feedbackId: string,
  status: AlphaFeedbackStatus,
  adminNote: string,
): Promise<void> {
  const { data, error } = await createSupabaseBrowserClient().rpc("admin_update_alpha_feedback", {
    p_feedback_id: feedbackId,
    p_status: status,
    p_admin_note: adminNote,
  });
  if (error || data !== true) throw new Error("admin_feedback_update_failed");
}

export async function loadAlphaAdminUsers(): Promise<AlphaAdminUser[]> {
  const { data, error } = await createSupabaseBrowserClient().rpc("admin_list_alpha_users");
  if (error) throw new Error("admin_users_load_failed");
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    userId: String(row.user_id),
    publicProfileId: String(row.public_profile_id),
    displayName: String(row.display_name),
    publicUsername: typeof row.public_username === "string" ? row.public_username : undefined,
    membershipStatus: String(row.membership_status),
    phase: String(row.phase),
    planCode: row.plan_code === "owner_plus" ? "owner_plus" : "free",
    activeEntitlementId: typeof row.active_entitlement_id === "string" ? row.active_entitlement_id : undefined,
    entitlementSource: typeof row.entitlement_source === "string" ? row.entitlement_source : undefined,
    entitlementStartsAt: typeof row.entitlement_starts_at === "string" ? row.entitlement_starts_at : undefined,
    entitlementEndsAt: typeof row.entitlement_ends_at === "string" ? row.entitlement_ends_at : undefined,
    staffRoles: Array.isArray(row.staff_roles)
      ? row.staff_roles.filter((role): role is "admin" | "moderator" | "support" =>
          role === "admin" || role === "moderator" || role === "support")
      : [],
    registeredVehicles: Number(row.registered_vehicles ?? 0),
    journalPosts: Number(row.journal_posts ?? 0),
    joinedAt: String(row.joined_at),
  }));
}

export async function loadAlphaAdminAuditLogs(): Promise<AlphaAdminAuditLog[] | null> {
  const { data, error } = await createSupabaseBrowserClient().rpc("admin_list_alpha_audit_logs");
  if (error) {
    if (error.code === "PGRST202" || error.message.includes("admin_list_alpha_audit_logs")) {
      return null;
    }
    throw new Error("admin_audit_logs_load_failed");
  }
  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    actorDisplayName: String(row.actor_display_name ?? "MECHORI"),
    action: String(row.action ?? ""),
    targetType: String(row.target_type ?? ""),
    targetDisplayName: String(row.target_display_name ?? row.target_type ?? ""),
    detail: row.detail && typeof row.detail === "object" && !Array.isArray(row.detail)
      ? row.detail as Record<string, unknown>
      : {},
    createdAt: String(row.created_at),
  }));
}

export async function grantAlphaOwnerPlus(
  userId: string,
  reason: string,
  source: "admin_grant" | "founding_tester" = "admin_grant",
  endsAt?: string,
): Promise<void> {
  const { error } = await createSupabaseBrowserClient().rpc("admin_grant_alpha_entitlement", {
    p_user_id: userId,
    p_plan_code: "owner_plus",
    p_source: source,
    p_ends_at: endsAt ?? null,
    p_reason: reason,
  });
  if (error) throw new Error("admin_entitlement_grant_failed");
}

export async function revokeAlphaEntitlement(
  entitlementId: string,
  reason: string,
): Promise<void> {
  const { data, error } = await createSupabaseBrowserClient().rpc(
    "admin_revoke_alpha_entitlement",
    { p_entitlement_id: entitlementId, p_reason: reason },
  );
  if (error || data !== true) throw new Error("admin_entitlement_revoke_failed");
}

export async function setAlphaStaffRole(
  userId: string,
  roleCode: "admin" | "moderator" | "support",
  enabled: boolean,
  reason: string,
): Promise<void> {
  const { data, error } = await createSupabaseBrowserClient().rpc("admin_set_alpha_staff_role", {
    p_user_id: userId,
    p_role_code: roleCode,
    p_enabled: enabled,
    p_reason: reason,
  });
  if (error || data !== true) throw new Error("admin_role_update_failed");
}
