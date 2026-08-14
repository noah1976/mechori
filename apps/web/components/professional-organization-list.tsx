"use client";

import { useApp } from "@/lib/app-context";
import {
  loadMyProfessionalOrganizations,
  type ProfessionalOrganizationSummary,
} from "@/lib/professional-organizations";
import { Building2, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export function ProfessionalOrganizationList({ adminMode = false }: { adminMode?: boolean }) {
  const { locale } = useApp();
  const ja = locale === "ja";
  const [organizations, setOrganizations] = useState<ProfessionalOrganizationSummary[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => {
    setState("loading");
    try {
      setOrganizations(await loadMyProfessionalOrganizations());
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (state !== "ready") {
    return <div className="empty-state" role={state === "loading" ? "status" : "alert"}>{state === "loading" ? <LoaderCircle className="spin" size={28} /> : <ShieldCheck size={28} />}<h2>{state === "loading" ? (ja ? "事業者情報を読み込み中" : "Loading organizations") : (ja ? "事業者情報を読み込めませんでした" : "Could not load organizations")}</h2>{state === "error" && <button type="button" className="secondary-action" onClick={() => void load()}>{ja ? "再読み込み" : "Retry"}</button>}</div>;
  }

  if (!organizations.length) {
    return <div className="empty-state"><Building2 size={28} /><h2>{ja ? "所属する事業者はありません" : "No professional organizations"}</h2><p>{ja ? "事業者への参加はMECHORI運営が設定します。" : "MECHORI operations manages organization access."}</p></div>;
  }

  return <div className="professional-organization-list">{organizations.map((organization) => (
    <Link key={organization.id} href={adminMode ? `/admin/professional/${organization.id}` : `/professional/organizations/${organization.id}`}>
      <Building2 size={22} aria-hidden="true" />
      <span><strong>{organization.name}</strong><small>{organization.providerName ?? (ja ? "お店・工場未連携" : "No provider linked")}{organization.providerLocality ? ` · ${organization.providerLocality}` : ""}</small></span>
      <span className="professional-list-meta">{organization.foundingGarage && <em>Founding Garage</em>}<small>{organization.memberCount}{ja ? "名" : " members"}</small></span>
    </Link>
  ))}</div>;
}
