"use client";

import { ProfileAvatar } from "@/components/profile-avatar";
import { useApp } from "@/lib/app-context";
import {
  addProfessionalMember,
  changeProfessionalMemberRole,
  loadMyProfessionalOrganizations,
  loadProfessionalMembers,
  removeProfessionalMember,
  searchProfessionalMemberCandidates,
  updateProfessionalOrganization,
  type ProfessionalMember,
  type ProfessionalMemberCandidate,
  type ProfessionalOrganizationRole,
  type ProfessionalOrganizationSummary,
} from "@/lib/professional-organizations";
import {
  canEditProfessionalPlatformFields,
  canManageProfessionalOrganization,
} from "@/lib/professional-organization-policy";
import { searchServiceProviders, type ServiceProviderOption } from "@/lib/service-providers";
import { loadAlphaAdminDashboard } from "@/lib/alpha-operations";
import { Building2, LoaderCircle, Search, ShieldCheck, Trash2, UsersRound } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function ProfessionalOrganizationDetail({ organizationId, adminMode = false }: { organizationId: string; adminMode?: boolean }) {
  const { locale } = useApp();
  const ja = locale === "ja";
  const [organization, setOrganization] = useState<ProfessionalOrganizationSummary | null>(null);
  const [members, setMembers] = useState<ProfessionalMember[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<"" | "saved" | "error">("");
  const [memberQuery, setMemberQuery] = useState("");
  const [memberCandidates, setMemberCandidates] = useState<ProfessionalMemberCandidate[]>([]);
  const [providerQuery, setProviderQuery] = useState("");
  const [providerResults, setProviderResults] = useState<ServiceProviderOption[]>([]);
  const [platformAdmin, setPlatformAdmin] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    try {
      if (adminMode) {
        const dashboard = await loadAlphaAdminDashboard();
        if (!dashboard?.isAdmin) throw new Error("admin_required");
        setPlatformAdmin(true);
      }
      const [organizations, loadedMembers] = await Promise.all([
        loadMyProfessionalOrganizations(),
        loadProfessionalMembers(organizationId),
      ]);
      const found = organizations.find((item) => item.id === organizationId);
      if (!found) throw new Error("organization_not_found");
      setOrganization(found);
      setMembers(loadedMembers);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [adminMode, organizationId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const canManageMembers = canManageProfessionalOrganization(
    organization?.myRole,
    platformAdmin,
    organization?.status ?? "inactive",
  );
  const canManagePlatformFields = canEditProfessionalPlatformFields(platformAdmin);

  async function saveOrganization() {
    if (!organization || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await updateProfessionalOrganization(organization);
      await load();
      setMessage("saved");
    } catch {
      setMessage("error");
    } finally {
      setBusy(false);
    }
  }

  async function searchMembers() {
    if (!memberQuery.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      setMemberCandidates(await searchProfessionalMemberCandidates(organizationId, memberQuery));
    } catch {
      setMessage("error");
    } finally {
      setBusy(false);
    }
  }

  async function addMember(candidate: ProfessionalMemberCandidate, role: ProfessionalOrganizationRole) {
    setBusy(true);
    setMessage("");
    try {
      await addProfessionalMember(organizationId, candidate.userId, role);
      setMemberCandidates([]);
      setMemberQuery("");
      await load();
      setMessage("saved");
    } catch {
      setMessage("error");
    } finally {
      setBusy(false);
    }
  }

  async function updateMember(userId: string, role?: ProfessionalOrganizationRole) {
    setBusy(true);
    setMessage("");
    try {
      if (role) await changeProfessionalMemberRole(organizationId, userId, role);
      else await removeProfessionalMember(organizationId, userId);
      await load();
      setMessage("saved");
    } catch {
      setMessage("error");
    } finally {
      setBusy(false);
    }
  }

  async function searchProviders() {
    if (!providerQuery.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      setProviderResults(await searchServiceProviders(providerQuery));
    } catch {
      setMessage("error");
    } finally {
      setBusy(false);
    }
  }

  if (state !== "ready" || !organization) {
    return <div className="empty-state" role={state === "loading" ? "status" : "alert"}>{state === "loading" ? <LoaderCircle className="spin" size={28} /> : <ShieldCheck size={28} />}<h1>{state === "loading" ? (ja ? "事業者情報を読み込み中" : "Loading organization") : (ja ? "この事業者を表示できません" : "This organization is unavailable")}</h1>{state === "error" && <button type="button" className="secondary-action" onClick={() => void load()}>{ja ? "再読み込み" : "Retry"}</button>}</div>;
  }

  return <div className="page-stack professional-workspace-page">
    <header className="page-header"><div><span className="eyebrow">PROFESSIONAL ORGANIZATION</span><h1>{organization.name}</h1><p>{organization.providerName ?? (ja ? "お店・工場はまだ連携されていません。" : "No provider linked yet.")}</p></div><Building2 size={30} /></header>
    {message && <p className={message === "saved" ? "form-success" : "form-error"} role={message === "saved" ? "status" : "alert"}>{message === "saved" ? (ja ? "変更を保存しました。" : "Changes saved.") : (ja ? "変更できませんでした。最後のOWNERは削除・降格できません。" : "Could not save. The last owner cannot be removed or demoted.")}</p>}

    <section className="admin-section">
      <header><div><span className="eyebrow">ORGANIZATION</span><h2>{ja ? "事業者情報" : "Organization"}</h2></div>{organization.foundingGarage && <span className="founding-garage-badge">Founding Garage</span>}</header>
      <div className="form-grid two-columns">
        <label className="field"><span>{ja ? "事業者名" : "Name"}</span><input value={organization.name} maxLength={120} disabled={!canManageMembers} onChange={(event) => setOrganization({ ...organization, name: event.target.value })} /></label>
        <label className="field"><span>Slug</span><input value={organization.slug} maxLength={64} disabled={!canManageMembers} onChange={(event) => setOrganization({ ...organization, slug: event.target.value.toLowerCase() })} /></label>
        {canManagePlatformFields && <label className="field"><span>{ja ? "状態" : "Status"}</span><select value={organization.status} onChange={(event) => setOrganization({ ...organization, status: event.target.value as ProfessionalOrganizationSummary["status"] })}><option value="active">active</option><option value="inactive">inactive</option></select></label>}
        {canManagePlatformFields && <label className="checkbox-row"><input type="checkbox" checked={organization.foundingGarage} onChange={(event) => setOrganization({ ...organization, foundingGarage: event.target.checked })} /><span>Founding Garage</span></label>}
      </div>
      {canManagePlatformFields && <div className="professional-provider-admin"><strong>{ja ? "連携するお店・工場" : "Linked provider"}</strong><p>{organization.providerName ?? (ja ? "未連携" : "Not linked")}</p>{organization.providerId && <button type="button" className="text-button" onClick={() => setOrganization({ ...organization, providerId: undefined, providerName: undefined, providerLocality: undefined })}>{ja ? "連携を解除" : "Unlink provider"}</button>}<div className="inline-search"><input value={providerQuery} placeholder={ja ? "店名・市区町村" : "Name or locality"} onChange={(event) => setProviderQuery(event.target.value)} /><button type="button" className="secondary-action" disabled={busy || !providerQuery.trim()} onClick={() => void searchProviders()}><Search size={17} />{ja ? "検索" : "Search"}</button></div>{providerResults.length > 0 && <div className="service-provider-results">{providerResults.map((provider) => <button type="button" key={provider.id} onClick={() => { setOrganization({ ...organization, providerId: provider.id, providerName: provider.displayName, providerLocality: provider.locality }); setProviderResults([]); }}><strong>{provider.displayName}</strong><small>{provider.locality}</small></button>)}</div>}</div>}
      {canManageMembers && <button type="button" className="primary-action" disabled={busy || !organization.name.trim()} onClick={() => void saveOrganization()}>{busy && <LoaderCircle className="spin" size={17} />}{ja ? "事業者情報を保存" : "Save organization"}</button>}
    </section>

    <section className="admin-section">
      <header><div><span className="eyebrow">MEMBERS</span><h2>{ja ? "メンバー" : "Members"}</h2></div><UsersRound size={24} /></header>
      <div className="professional-member-list">{members.map((member) => <article key={member.userId}><ProfileAvatar displayName={member.displayName} imagePath={member.profileImagePath} /><span><strong>{member.displayName}</strong><small>{member.publicUsername ? `@${member.publicUsername}` : ""}</small></span>{canManageMembers ? <select aria-label={`${member.displayName} role`} value={member.role} disabled={busy} onChange={(event) => void updateMember(member.userId, event.target.value as ProfessionalOrganizationRole)}><option value="owner">OWNER</option><option value="staff">STAFF</option></select> : <span className="role-label">{member.role.toUpperCase()}</span>}{canManageMembers && <button type="button" className="icon-action danger-icon" aria-label={ja ? `${member.displayName}を削除` : `Remove ${member.displayName}`} disabled={busy} onClick={() => void updateMember(member.userId)}><Trash2 size={17} /></button>}</article>)}</div>
      {canManageMembers && <div className="professional-member-search"><div className="inline-search"><input value={memberQuery} placeholder={ja ? "表示名・@usernameで検索" : "Search name or @username"} onChange={(event) => setMemberQuery(event.target.value)} /><button type="button" className="secondary-action" disabled={busy || !memberQuery.trim()} onClick={() => void searchMembers()}><Search size={17} />{ja ? "メンバーを探す" : "Find member"}</button></div>{memberCandidates.length > 0 && <div className="professional-candidate-list">{memberCandidates.map((candidate) => <div key={candidate.userId}><span><strong>{candidate.displayName}</strong><small>{candidate.publicUsername ? `@${candidate.publicUsername}` : ""}</small></span><button type="button" className="secondary-action" disabled={busy} onClick={() => void addMember(candidate, "staff")}>{ja ? "STAFFで追加" : "Add staff"}</button><button type="button" className="secondary-action" disabled={busy} onClick={() => void addMember(candidate, "owner")}>{ja ? "OWNERで追加" : "Add owner"}</button></div>)}</div>}</div>}
    </section>
  </div>;
}
