"use client";

import {
  unknownServiceAttribution,
  type MaintenanceServiceAttributionV1,
  type SupportedUiLocale,
} from "@mechori/core";
import { Building2, LoaderCircle, Plus, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import {
  createUserServiceProvider,
  searchServiceProviders,
  serviceAttributionFromProvider,
  type ServiceProviderOption,
} from "@/lib/service-providers";

export function ServiceAttributionField({
  value,
  onChange,
  locale,
  compact = false,
  error,
}: {
  value: MaintenanceServiceAttributionV1;
  onChange(value: MaintenanceServiceAttributionV1): void;
  locale: SupportedUiLocale;
  compact?: boolean;
  error?: string;
}) {
  const ja = locale === "ja";
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ServiceProviderOption[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "error">("idle");
  const [adding, setAdding] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [providerLocality, setProviderLocality] = useState("");
  const [savingProvider, setSavingProvider] = useState(false);
  const [addError, setAddError] = useState("");

  useEffect(() => {
    if (value.performedByType !== "service_provider" || !query.trim()) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      setSearchState("loading");
      void searchServiceProviders(query)
        .then((items) => {
          if (!active) return;
          setResults(items);
          setSearchState("idle");
        })
        .catch(() => {
          if (!active) return;
          setResults([]);
          setSearchState("error");
        });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query, value.performedByType]);

  async function addProvider() {
    if (!providerName.trim() || savingProvider) return;
    setSavingProvider(true);
    setAddError("");
    try {
      const provider = await createUserServiceProvider(providerName, providerLocality);
      onChange(serviceAttributionFromProvider(provider));
      setAdding(false);
      setProviderName("");
      setProviderLocality("");
      setQuery("");
      setResults([]);
    } catch {
      setAddError(ja ? "お店・工場を追加できませんでした。もう一度お試しください。" : "Could not add this service provider. Try again.");
    } finally {
      setSavingProvider(false);
    }
  }

  return (
    <fieldset className={`service-attribution${compact ? " is-compact" : ""}`}>
      <legend>{ja ? "作業した人・場所" : "Who performed the work"}</legend>
      <div className="segmented-control service-attribution-options">
        <button type="button" className={value.performedByType === "self" ? "is-selected" : ""} aria-pressed={value.performedByType === "self"} onClick={() => onChange({ version: 1, performedByType: "self" })}><UserRound size={17} />{ja ? "自分で作業" : "DIY"}</button>
        <button type="button" className={value.performedByType === "service_provider" ? "is-selected" : ""} aria-pressed={value.performedByType === "service_provider"} onClick={() => onChange(value.performedByType === "service_provider" ? value : { version: 1, performedByType: "service_provider" })}><Building2 size={17} />{ja ? "お店・工場" : "Shop"}</button>
        <button type="button" className={value.performedByType === "unknown" ? "is-selected" : ""} aria-pressed={value.performedByType === "unknown"} onClick={() => onChange(unknownServiceAttribution())}>{ja ? "不明・記録しない" : "Unknown"}</button>
      </div>

      {value.performedByType === "service_provider" && (
        <div className="service-provider-picker">
          {value.serviceProviderId && value.providerDisplayNameSnapshot ? (
            <div className="selected-provider">
              <Building2 size={18} aria-hidden="true" />
              <span><strong>{value.providerDisplayNameSnapshot}</strong>{value.providerLocalitySnapshot && <small>{value.providerLocalitySnapshot}</small>}</span>
              <button type="button" className="text-button" onClick={() => onChange({ version: 1, performedByType: "service_provider" })}>{ja ? "変更" : "Change"}</button>
            </div>
          ) : adding ? (
            <div className="service-provider-add-form">
              <label className="field"><span>{ja ? "店名" : "Name"}</span><input value={providerName} maxLength={120} required onChange={(event) => setProviderName(event.target.value)} /></label>
              <label className="field"><span>{ja ? "市区町村（任意）" : "Locality (optional)"}</span><input value={providerLocality} maxLength={120} onChange={(event) => setProviderLocality(event.target.value)} /></label>
              {addError && <p className="form-error" role="alert">{addError}</p>}
              <div className="inline-actions">
                <button type="button" className="primary-action" disabled={!providerName.trim() || savingProvider} onClick={addProvider}>{savingProvider && <LoaderCircle className="spin" size={17} />}{ja ? "このお店・工場を追加" : "Add provider"}</button>
                <button type="button" className="text-button" onClick={() => setAdding(false)}>{ja ? "戻る" : "Back"}</button>
              </div>
              <small>{ja ? "ユーザーが記録のために追加する候補です。MECHORI確認済みを意味しません。" : "This is a user-submitted option, not a MECHORI verification."}</small>
            </div>
          ) : (
            <div className="service-provider-search">
              <label><Search size={17} aria-hidden="true" /><span className="sr-only">{ja ? "お店・工場を検索" : "Search providers"}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ja ? "店名・市区町村で検索" : "Search name or locality"} /></label>
              {searchState === "loading" && <p className="settings-help" role="status"><LoaderCircle className="spin" size={16} />{ja ? "検索中…" : "Searching…"}</p>}
              {searchState === "error" && <p className="form-error" role="alert">{ja ? "検索できませんでした。" : "Search failed."}</p>}
              {query.trim() && searchState === "idle" && (
                results.length ? <div className="service-provider-results">{results.map((provider) => (
                  <button type="button" key={provider.id} onClick={() => onChange(serviceAttributionFromProvider(provider))}>
                    <strong>{provider.displayName}</strong>
                    <small>{provider.locality ?? (ja ? "所在地未登録" : "Locality not set")}</small>
                  </button>
                ))}</div> : <p className="settings-help">{ja ? "該当するお店・工場はありません。" : "No matching providers."}</p>
              )}
              <button type="button" className="secondary-action" onClick={() => { setProviderName(query.trim()); setAdding(true); }}><Plus size={17} />{ja ? "お店・工場を追加" : "Add a provider"}</button>
            </div>
          )}
        </div>
      )}
      {error && <p className="form-error" role="alert">{error}</p>}
    </fieldset>
  );
}
