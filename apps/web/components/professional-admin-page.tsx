"use client";

import { ProfessionalOrganizationList } from "@/components/professional-organization-list";
import { useApp } from "@/lib/app-context";
import { createProfessionalOrganization } from "@/lib/professional-organizations";
import { searchServiceProviders, type ServiceProviderOption } from "@/lib/service-providers";
import { loadAlphaAdminDashboard } from "@/lib/alpha-operations";
import { Building2, LoaderCircle, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function ProfessionalAdminPage() {
  const { locale } = useApp();
  const ja = locale === "ja";
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [founding, setFounding] = useState(false);
  const [providerQuery, setProviderQuery] = useState("");
  const [providers, setProviders] = useState<ServiceProviderOption[]>([]);
  const [provider, setProvider] = useState<ServiceProviderOption | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [access, setAccess] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    let active = true;
    void loadAlphaAdminDashboard()
      .then((dashboard) => {
        if (active) setAccess(dashboard?.isAdmin ? "allowed" : "denied");
      })
      .catch(() => {
        if (active) setAccess("denied");
      });
    return () => { active = false; };
  }, []);

  async function createOrganization() {
    if (!name.trim() || !slug.trim() || busy) return;
    setBusy(true);
    setError(false);
    try {
      const id = await createProfessionalOrganization({ name: name.trim(), slug: slug.trim(), foundingGarage: founding, providerId: provider?.id });
      router.push(`/admin/professional/${id}`);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  async function searchProvidersForOrganization() {
    if (!providerQuery.trim()) return;
    setBusy(true);
    setError(false);
    try { setProviders(await searchServiceProviders(providerQuery)); }
    catch { setError(true); }
    finally { setBusy(false); }
  }

  if (access !== "allowed") {
    return <div className="empty-state" role={access === "loading" ? "status" : "alert"}><Building2 size={28} /><h1>{access === "loading" ? (ja ? "権限を確認中" : "Checking access") : (ja ? "この画面を表示できません" : "This page is unavailable")}</h1></div>;
  }

  return <div className="page-stack admin-page">
    <header className="page-header"><div><span className="eyebrow">PROFESSIONAL OPERATIONS</span><h1>{ja ? "事業者管理" : "Professional organizations"}</h1><p>{ja ? "Founding Garage、お店・工場、所属メンバーを管理します。" : "Manage Founding Garages, providers, and memberships."}</p></div><Building2 size={30} /></header>
    {error && <p className="form-error" role="alert">{ja ? "操作を完了できませんでした。入力と権限を確認してください。" : "The action could not be completed."}</p>}
    <section className="admin-section professional-create-section"><header><div><span className="eyebrow">CREATE</span><h2>{ja ? "事業者を作成" : "Create organization"}</h2></div><Plus size={22} /></header><div className="form-grid two-columns"><label className="field"><span>{ja ? "事業者名" : "Name"}</span><input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} /></label><label className="field"><span>Slug</span><input value={slug} maxLength={64} pattern="[a-z0-9-]+" onChange={(event) => setSlug(event.target.value.toLowerCase())} /></label></div><label className="checkbox-row"><input type="checkbox" checked={founding} onChange={(event) => setFounding(event.target.checked)} /><span>Founding Garage</span></label><div className="professional-provider-admin"><strong>{ja ? "お店・工場を連携（任意）" : "Link provider (optional)"}</strong>{provider && <p>{provider.displayName}{provider.locality ? ` · ${provider.locality}` : ""}</p>}<div className="inline-search"><input value={providerQuery} placeholder={ja ? "店名・市区町村" : "Name or locality"} onChange={(event) => setProviderQuery(event.target.value)} /><button type="button" className="secondary-action" disabled={busy || !providerQuery.trim()} onClick={() => void searchProvidersForOrganization()}><Search size={17} />{ja ? "検索" : "Search"}</button></div>{providers.length > 0 && <div className="service-provider-results">{providers.map((item) => <button type="button" key={item.id} onClick={() => { setProvider(item); setProviders([]); }}><strong>{item.displayName}</strong><small>{item.locality}</small></button>)}</div>}</div><button type="button" className="primary-action" disabled={busy || !name.trim() || !slug.trim()} onClick={() => void createOrganization()}>{busy && <LoaderCircle className="spin" size={17} />}{ja ? "事業者を作成" : "Create organization"}</button></section>
    <section className="admin-section"><header><div><span className="eyebrow">ORGANIZATIONS</span><h2>{ja ? "事業者一覧" : "Organizations"}</h2></div></header><ProfessionalOrganizationList adminMode /></section>
  </div>;
}
