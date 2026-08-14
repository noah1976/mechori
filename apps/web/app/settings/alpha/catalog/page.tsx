"use client";

import { useApp } from "@/lib/app-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  listVehicleCatalogReviewQueue,
  loadPublishedVehicleCatalog,
  publishVehicleCatalogEntity,
  publishVehicleCatalogModel,
  publishVehicleCatalogName,
  reviewVehicleCatalogSuggestion,
  type VehicleCatalogSuggestionRecord,
} from "@/lib/vehicle-catalog";
import type {
  CollaborativeCatalogSnapshot,
  VehicleCatalogEntityType,
  VehicleCatalogMatchingMode,
  VehicleCatalogNameKind,
} from "@mechori/core";
import {
  BookOpenCheck,
  Check,
  LoaderCircle,
  ShieldCheck,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

type AccessState = "loading" | "operator" | "denied" | "error";

const ENTITY_TYPES: VehicleCatalogEntityType[] = [
  "marque",
  "manufacturer",
  "sales_channel",
  "model_family",
  "market_name",
  "generation",
  "variant",
  "configuration",
  "corporate_group",
];

const NAME_KINDS: VehicleCatalogNameKind[] = [
  "localized_name",
  "common_name",
  "historical_corporate_name",
  "former_brand_name",
  "abbreviation",
  "known_typo",
  "market_name",
  "generation_name",
  "grade_name",
  "model_code",
  "canonical",
];

export default function AlphaCatalogReviewPage() {
  const { locale, isRemoteAlpha } = useApp();
  const ja = locale === "ja";
  const [access, setAccess] = useState<AccessState>("loading");
  const [queue, setQueue] = useState<VehicleCatalogSuggestionRecord[]>([]);
  const [catalog, setCatalog] = useState<CollaborativeCatalogSnapshot>({
    entities: [],
    names: [],
  });
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");

  const [targetEntityId, setTargetEntityId] = useState("");
  const [aliasText, setAliasText] = useState("");
  const [nameKind, setNameKind] = useState<VehicleCatalogNameKind>("localized_name");
  const [matchingMode, setMatchingMode] = useState<VehicleCatalogMatchingMode>("exact");
  const [aliasLocale, setAliasLocale] = useState("");
  const [aliasRegion, setAliasRegion] = useState("");

  const [newEntityId, setNewEntityId] = useState("");
  const [newEntityType, setNewEntityType] = useState<VehicleCatalogEntityType>("marque");
  const [canonicalName, setCanonicalName] = useState("");
  const [parentEntityId, setParentEntityId] = useState("");
  const [marqueEntityId, setMarqueEntityId] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [modelFamilyId, setModelFamilyId] = useState("");
  const [modelMarketNameId, setModelMarketNameId] = useState("");
  const [modelMarqueId, setModelMarqueId] = useState("");
  const [modelCanonicalName, setModelCanonicalName] = useState("");
  const [modelRegion, setModelRegion] = useState("");

  const selected = useMemo(
    () => queue.find((item) => item.id === selectedId) ?? queue[0],
    [queue, selectedId],
  );

  const selectSuggestion = useCallback((suggestion: VehicleCatalogSuggestionRecord) => {
    setSelectedId(suggestion.id);
    setAliasText(
      suggestion.proposedMakeName
      ?? suggestion.proposedModelName
      ?? suggestion.proposedName
      ?? suggestion.makeInput,
    );
    setCanonicalName(
      suggestion.proposedMakeName
      ?? suggestion.proposedModelName
      ?? suggestion.proposedName
      ?? "",
    );
    setNewEntityType(suggestion.proposedMakeName ? "marque" : "market_name");
    setModelCanonicalName(suggestion.proposedModelName ?? suggestion.modelInput);
    setReviewerNote("");
  }, []);

  useEffect(() => {
    let active = true;
    async function loadAccess() {
      if (!isRemoteAlpha) {
        if (active) setAccess("denied");
        return;
      }
      const { data, error } = await createSupabaseBrowserClient()
        .from("app_user_roles")
        .select("role_code")
        .in("role_code", ["owner", "alpha_admin"]);
      if (!active) return;
      setAccess(error ? "error" : data.length > 0 ? "operator" : "denied");
    }
    void loadAccess();
    return () => {
      active = false;
    };
  }, [isRemoteAlpha]);

  useEffect(() => {
    if (access !== "operator") return;
    let active = true;
    async function load() {
      try {
        const [nextQueue, nextCatalog] = await Promise.all([
          listVehicleCatalogReviewQueue(),
          loadPublishedVehicleCatalog(),
        ]);
        if (!active) return;
        setQueue(nextQueue);
        setCatalog(nextCatalog);
        if (nextQueue[0]) selectSuggestion(nextQueue[0]);
      } catch {
        if (active) setMessage(ja
          ? "カタログを読み込めませんでした。DB更新が未適用の可能性があります。"
          : "The catalog could not be loaded. Its database migration may not be active.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [access, ja, selectSuggestion]);

  function removeFromQueue(id: string) {
    const nextQueue = queue.filter((item) => item.id !== id);
    setQueue(nextQueue);
    if (nextQueue[0]) selectSuggestion(nextQueue[0]);
    else setSelectedId("");
  }

  async function runAction(action: () => Promise<void>, successMessage: string) {
    if (!selected || working) return;
    setWorking(true);
    setMessage("");
    try {
      await action();
      removeFromQueue(selected.id);
      setMessage(successMessage);
    } catch {
      setMessage(ja
        ? "処理できませんでした。入力内容と権限を確認してください。"
        : "The action failed. Check the values and permissions.");
    } finally {
      setWorking(false);
    }
  }

  async function simpleReview(decision: "needs_information" | "rejected") {
    if (!selected) return;
    await runAction(
      () => reviewVehicleCatalogSuggestion(selected.id, decision, reviewerNote),
      decision === "rejected"
        ? (ja ? "提案を見送りました。" : "Suggestion rejected.")
        : (ja ? "追加情報待ちにしました。" : "Marked as needing information."),
    );
  }

  async function publishAlias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    await runAction(
      () => publishVehicleCatalogName({
        suggestionId: selected.id,
        targetEntityId,
        nameText: aliasText,
        nameKind,
        matchingMode,
        locale: aliasLocale,
        regionCode: aliasRegion,
        sourceNote: reviewerNote,
      }),
      ja ? "既存項目の別名として反映しました。" : "Published as a name for an existing entry.",
    );
  }

  async function publishEntity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    await runAction(
      () => publishVehicleCatalogEntity({
        suggestionId: selected.id,
        entityId: newEntityId,
        entityType: newEntityType,
        canonicalName,
        parentEntityId,
        marqueEntityId,
        vehicleCategory: selected.vehicleCategory,
        regionCode,
        nameKind: newEntityType === "market_name"
          ? "market_name"
          : newEntityType === "variant" || newEntityType === "configuration"
            ? "grade_name"
            : "canonical",
        matchingMode,
        reviewerNote,
      }),
      ja ? "新しいカタログ項目を公開しました。" : "Published a new catalog entry.",
    );
  }

  async function publishModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    await runAction(
      () => publishVehicleCatalogModel({
        suggestionId: selected.id,
        familyEntityId: modelFamilyId,
        marketNameEntityId: modelMarketNameId,
        marqueEntityId: modelMarqueId,
        canonicalModelName: modelCanonicalName,
        regionCode: modelRegion,
        matchingMode,
        reviewerNote,
      }),
      ja
        ? "モデル系統と販売名を公開しました。"
        : "Published the model family and market name.",
    );
  }

  if (access === "loading" || (access === "operator" && loading)) {
    return (
      <div className="app-loading">
        <LoaderCircle className="spin" size={24} />
        <span>{ja ? "カタログ確認画面を準備中" : "Preparing catalog review"}</span>
      </div>
    );
  }

  if (access !== "operator") {
    return (
      <div className="page-stack narrow-page">
        <section className="empty-state">
          <ShieldCheck size={32} aria-hidden="true" />
          <h1>{ja ? "運営専用の画面です" : "Operator access only"}</h1>
          <p>{access === "error"
            ? (ja ? "権限を確認できませんでした。" : "Access could not be checked.")
            : (ja ? "このアカウントでは確認できません。" : "This account cannot review the catalog.")}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-stack catalog-review-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CATALOG REVIEW</span>
          <h1>{ja ? "車両カタログの提案確認" : "Review vehicle catalog suggestions"}</h1>
          <p>
            {ja
              ? "提案は自動反映されません。実車・資料・関係性を確認してから公開します。"
              : "Suggestions are never published automatically. Check evidence and relationships first."}
          </p>
        </div>
        <Link href="/settings/alpha" className="secondary-action">
          {ja ? "α設定へ戻る" : "Back to alpha settings"}
        </Link>
      </header>

      {message && <p className="form-status-message" role="status">{message}</p>}
      {queue.length === 0 ? (
        <section className="empty-state">
          <BookOpenCheck size={32} aria-hidden="true" />
          <h2>{ja ? "確認待ちの提案はありません" : "No suggestions are waiting"}</h2>
        </section>
      ) : (
        <div className="catalog-review-layout">
          <aside className="catalog-review-queue">
            {queue.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className={selected?.id === suggestion.id ? "is-selected" : ""}
                onClick={() => selectSuggestion(suggestion)}
              >
                <strong>{suggestion.makeInput} {suggestion.modelInput}</strong>
                <span>{suggestion.gradeInput || suggestion.modelCodeInput || (ja ? "仕様未入力" : "No specification")}</span>
              </button>
            ))}
          </aside>

          {selected && (
            <main className="catalog-review-detail">
              <section className="settings-section">
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">ORIGINAL INPUT</span>
                    <h2>{selected.makeInput} {selected.modelInput}</h2>
                  </div>
                </div>
                <dl className="catalog-review-facts">
                  <div><dt>{ja ? "車両種別" : "Type"}</dt><dd>{selected.vehicleCategory}</dd></div>
                  <div><dt>{ja ? "年式" : "Year"}</dt><dd>{selected.modelYear ?? "-"}</dd></div>
                  <div><dt>{ja ? "グレード" : "Grade"}</dt><dd>{selected.gradeInput ?? "-"}</dd></div>
                  <div><dt>{ja ? "型式" : "Model code"}</dt><dd>{selected.modelCodeInput ?? "-"}</dd></div>
                  <div><dt>{ja ? "提案メーカー" : "Proposed make"}</dt><dd>{selected.proposedMakeName ?? "-"}</dd></div>
                  <div><dt>{ja ? "提案車名" : "Proposed model"}</dt><dd>{selected.proposedModelName ?? "-"}</dd></div>
                  <div><dt>{ja ? "根拠" : "Evidence"}</dt><dd>{selected.evidenceBasis}</dd></div>
                </dl>
                {selected.evidenceNote && <p>{selected.evidenceNote}</p>}
                {selected.notes && <blockquote>{selected.notes}</blockquote>}
                <label className="field">
                  <span>{ja ? "運営メモ・利用者への返答" : "Reviewer note"}</span>
                  <textarea
                    value={reviewerNote}
                    onChange={(event) => setReviewerNote(event.target.value)}
                    maxLength={1000}
                    rows={4}
                  />
                </label>
                <div className="form-actions">
                  <button
                    type="button"
                    className="secondary-action"
                    disabled={working}
                    onClick={() => void simpleReview("needs_information")}
                  >
                    {ja ? "追加情報を依頼" : "Request details"}
                  </button>
                  <button
                    type="button"
                    className="danger-action"
                    disabled={working}
                    onClick={() => void simpleReview("rejected")}
                  >
                    <X size={17} />{ja ? "見送る" : "Reject"}
                  </button>
                </div>
              </section>

              <form className="settings-section" onSubmit={publishAlias}>
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">EXISTING ENTRY</span>
                    <h2>{ja ? "既存項目の別名として反映" : "Publish as an existing entry name"}</h2>
                  </div>
                </div>
                <label className="field">
                  <span>{ja ? "反映先" : "Target entry"}</span>
                  <select
                    required
                    value={targetEntityId}
                    onChange={(event) => setTargetEntityId(event.target.value)}
                  >
                    <option value="">{ja ? "選択してください" : "Select an entry"}</option>
                    {catalog.entities
                      .slice()
                      .sort((left, right) => left.id.localeCompare(right.id))
                      .map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.id} · {entity.canonicalName} ({entity.entityType})
                        </option>
                      ))}
                  </select>
                </label>
                <div className="form-grid two-columns">
                  <label className="field"><span>{ja ? "登録する表記" : "Name"}</span><input required value={aliasText} onChange={(event) => setAliasText(event.target.value)} maxLength={160} /></label>
                  <label className="field"><span>{ja ? "表記の種類" : "Name kind"}</span><select value={nameKind} onChange={(event) => setNameKind(event.target.value as VehicleCatalogNameKind)}>{NAME_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label>
                </div>
                <div className="form-grid three-columns">
                  <label className="field"><span>{ja ? "照合方法" : "Matching"}</span><select value={matchingMode} onChange={(event) => setMatchingMode(event.target.value as VehicleCatalogMatchingMode)}><option value="exact">exact</option><option value="candidate_only">candidate_only</option></select></label>
                  <label className="field"><span>{ja ? "言語（任意）" : "Locale"}</span><input value={aliasLocale} onChange={(event) => setAliasLocale(event.target.value)} placeholder="ja / en" /></label>
                  <label className="field"><span>{ja ? "市場（任意）" : "Region"}</span><input value={aliasRegion} onChange={(event) => setAliasRegion(event.target.value)} placeholder="JP / EU / global" /></label>
                </div>
                <button type="submit" className="primary-action" disabled={working || !targetEntityId || !aliasText.trim()}><Check size={17} />{ja ? "確認して反映" : "Review and publish"}</button>
              </form>

              <form className="settings-section" onSubmit={publishModel}>
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">NEW MODEL</span>
                    <h2>{ja ? "新しい車名を登録" : "Publish a new model name"}</h2>
                  </div>
                </div>
                <p>
                  {ja
                    ? "モデル系統と、そのブランドで販売された車名を分けて登録します。既存のモデル系統IDを指定すれば、別ブランド・別市場名も同じ系統へ接続できます。"
                    : "Creates a model family and a market name separately. Reuse an existing family ID to connect another marque or market name."}
                </p>
                <div className="form-grid two-columns">
                  <label className="field">
                    <span>{ja ? "モデル系統ID" : "Model family ID"}</span>
                    <input
                      required
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      value={modelFamilyId}
                      onChange={(event) => setModelFamilyId(event.target.value)}
                      placeholder="peugeot-205"
                    />
                  </label>
                  <label className="field">
                    <span>{ja ? "販売名ID" : "Market name ID"}</span>
                    <input
                      required
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      value={modelMarketNameId}
                      onChange={(event) => setModelMarketNameId(event.target.value)}
                      placeholder="peugeot-205-jp"
                    />
                  </label>
                </div>
                <label className="field">
                  <span>{ja ? "販売ブランド" : "Marque"}</span>
                  <select
                    required
                    value={modelMarqueId}
                    onChange={(event) => setModelMarqueId(event.target.value)}
                  >
                    <option value="">{ja ? "選択してください" : "Select a marque"}</option>
                    {catalog.entities
                      .filter((entity) => entity.entityType === "marque")
                      .slice()
                      .sort((left, right) => left.canonicalName.localeCompare(right.canonicalName))
                      .map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.canonicalName} · {entity.id}
                        </option>
                      ))}
                  </select>
                </label>
                <div className="form-grid two-columns">
                  <label className="field">
                    <span>{ja ? "正規車名" : "Canonical model name"}</span>
                    <input
                      required
                      value={modelCanonicalName}
                      onChange={(event) => setModelCanonicalName(event.target.value)}
                      maxLength={120}
                    />
                  </label>
                  <label className="field">
                    <span>{ja ? "市場（任意）" : "Region"}</span>
                    <input
                      value={modelRegion}
                      onChange={(event) => setModelRegion(event.target.value)}
                      placeholder="JP / EU / global"
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="primary-action"
                  disabled={
                    working
                    || !modelFamilyId.trim()
                    || !modelMarketNameId.trim()
                    || !modelMarqueId
                    || !modelCanonicalName.trim()
                  }
                >
                  {working
                    ? <LoaderCircle className="spin" size={17} />
                    : <Check size={17} />}
                  {ja ? "確認して車名を公開" : "Review and publish model"}
                </button>
              </form>

              <form className="settings-section" onSubmit={publishEntity}>
                <div className="section-heading compact">
                  <div>
                    <span className="eyebrow">NEW ENTRY</span>
                    <h2>{ja ? "新しいカタログ項目を作る" : "Create a new catalog entry"}</h2>
                  </div>
                </div>
                <div className="form-grid two-columns">
                  <label className="field"><span>ID</span><input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={newEntityId} onChange={(event) => setNewEntityId(event.target.value)} placeholder="peugeot-205-roland-garros" /></label>
                  <label className="field"><span>{ja ? "項目種別" : "Entity type"}</span><select value={newEntityType} onChange={(event) => setNewEntityType(event.target.value as VehicleCatalogEntityType)}>{ENTITY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                </div>
                <label className="field"><span>{ja ? "正規表記" : "Canonical name"}</span><input required value={canonicalName} onChange={(event) => setCanonicalName(event.target.value)} maxLength={120} /></label>
                <div className="form-grid three-columns">
                  <label className="field"><span>{ja ? "親項目ID（任意）" : "Parent entry ID"}</span><input value={parentEntityId} onChange={(event) => setParentEntityId(event.target.value)} /></label>
                  <label className="field"><span>{ja ? "ブランドID（任意）" : "Marque ID"}</span><input value={marqueEntityId} onChange={(event) => setMarqueEntityId(event.target.value)} /></label>
                  <label className="field"><span>{ja ? "市場（任意）" : "Region"}</span><input value={regionCode} onChange={(event) => setRegionCode(event.target.value)} placeholder="JP / EU / global" /></label>
                </div>
                <button type="submit" className="primary-action" disabled={working || !newEntityId.trim() || !canonicalName.trim()}>{working ? <LoaderCircle className="spin" size={17} /> : <Check size={17} />}{ja ? "確認して新規公開" : "Review and publish new entry"}</button>
              </form>
            </main>
          )}
        </div>
      )}
    </div>
  );
}
