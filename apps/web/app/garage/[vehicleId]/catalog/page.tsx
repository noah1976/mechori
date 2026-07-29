"use client";

import { useApp } from "@/lib/app-context";
import {
  listMyVehicleCatalogSuggestions,
  submitVehicleCatalogSuggestion,
  type VehicleCatalogSuggestionRecord,
} from "@/lib/vehicle-catalog";
import {
  suggestionDraftFromVehicle,
  validateVehicleCatalogSuggestion,
  type VehicleCatalogEvidenceBasis,
  type VehicleCatalogSuggestionDraft,
} from "@mechori/core";
import {
  BookOpenCheck,
  CarFront,
  LoaderCircle,
  Send,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

export default function VehicleCatalogContributionPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data, locale, isRemoteAlpha } = useApp();
  const ja = locale === "ja";
  const vehicle = data.vehicles.find(
    (item) =>
      item.id === decodeURIComponent(vehicleId)
      && item.ownerProfileId === data.currentProfileId,
  );
  const initialDraft = useMemo(
    () => vehicle ? suggestionDraftFromVehicle(vehicle) : undefined,
    [vehicle],
  );
  const [editedDraft, setEditedDraft] = useState<VehicleCatalogSuggestionDraft>();
  const draft = editedDraft ?? initialDraft;
  const [suggestions, setSuggestions] = useState<VehicleCatalogSuggestionRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(isRemoteAlpha);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const validation = draft
    ? validateVehicleCatalogSuggestion(draft)
    : { valid: false, errors: {} };
  const tooLongMessage = ja
    ? "入力できる文字数を超えています。"
    : "This field is longer than the allowed limit.";

  useEffect(() => {
    if (!isRemoteAlpha) return;
    let active = true;
    async function loadHistory() {
      try {
        const loaded = await listMyVehicleCatalogSuggestions();
        if (active) setSuggestions(loaded);
      } catch {
        // The catalog migration may not be active yet.
      } finally {
        if (active) setLoadingHistory(false);
      }
    }
    void loadHistory();
    return () => {
      active = false;
    };
  }, [isRemoteAlpha]);

  if (!vehicle || !draft) {
    return (
      <div className="page-stack narrow-page">
        <section className="empty-state">
          <CarFront size={34} aria-hidden="true" />
          <h1>{ja ? "車両が見つかりません" : "Vehicle not found"}</h1>
          <Link href="/garage" className="primary-action">
            {ja ? "My Garageへ" : "Open My Garage"}
          </Link>
        </section>
      </div>
    );
  }

  function setField<K extends keyof VehicleCatalogSuggestionDraft>(
    key: K,
    value: VehicleCatalogSuggestionDraft[K],
  ) {
    setEditedDraft((current) => {
      const base = current ?? initialDraft;
      return base ? { ...base, [key]: value } : current;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const suggestionDraft = draft;
    setSubmitted(true);
    setSaved(false);
    setMessage("");
    if (!suggestionDraft || !validation.valid || saving) return;
    if (!isRemoteAlpha) {
      setMessage(ja
        ? "カタログ提案はα環境で利用できます。"
        : "Catalog suggestions are available in the alpha environment.");
      return;
    }
    setSaving(true);
    try {
      const created = await submitVehicleCatalogSuggestion(suggestionDraft);
      setSuggestions((current) => [created, ...current]);
      setMessage(ja
        ? "この一台の情報がMECHORIに届きました。ありがとうございます。運営が確認し、反映できた内容は、次に同じクルマを登録する人の候補になります。"
        : "This vehicle's information has reached MECHORI. Thank you. After review, accepted details can help the next person registering the same vehicle.");
      setSaved(true);
      setSubmitted(false);
    } catch {
      setMessage(ja
        ? "提案を保存できませんでした。時間をおいてもう一度お試しください。"
        : "The suggestion could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const statusLabel: Record<VehicleCatalogSuggestionRecord["status"], string> = {
    pending: ja ? "確認中" : "In review",
    needs_information: ja ? "もう少し教えてください" : "More information needed",
    accepted: ja ? "カタログに反映" : "Added to catalog",
    rejected: ja ? "今回は見送り" : "Not added this time",
    withdrawn: ja ? "取り下げ" : "Withdrawn",
  };
  const acceptedSuggestionCount = suggestions.filter(
    (suggestion) => suggestion.status === "accepted",
  ).length;

  return (
    <div className="page-stack narrow-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CATALOG CONTRIBUTION</span>
          <h1>{ja ? "この一台のことを、MECHORIに教える" : "Teach MECHORI about this vehicle"}</h1>
          <p>
            {ja
              ? "あなたが知っている表記や仕様が、次に同じクルマを登録する人の助けになります。全部埋めなくて大丈夫。ひとつ分かるだけでも、カタログが少し育ちます。"
              : "A name or specification you know may help the next person registering the same vehicle. You do not need to complete every field; one useful detail can grow the catalog."}
          </p>
        </div>
      </header>

      <section className="catalog-contribution-path" aria-label={ja ? "カタログへ反映されるまで" : "How contributions reach the catalog"}>
        <div>
          <span>01</span>
          <strong>{ja ? "実車や資料から分かること" : "What you know from the vehicle or documents"}</strong>
          <p>{ja ? "一項目だけでも送れます" : "Even one detail is welcome"}</p>
        </div>
        <div>
          <span>02</span>
          <strong>{ja ? "MECHORIが内容を確認" : "MECHORI reviews the details"}</strong>
          <p>{ja ? "提案のまま自動公開しません" : "Suggestions are never auto-published"}</p>
        </div>
        <div>
          <span>03</span>
          <strong>{ja ? "次の愛車登録を助ける" : "Help the next vehicle registration"}</strong>
          <p>{ja ? "確認できた候補をカタログへ" : "Reviewed entries can join the catalog"}</p>
        </div>
      </section>

      <form className="vehicle-form" onSubmit={submit} noValidate aria-busy={saving}>
        <section className="form-section">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">OWNER INPUT</span>
              <h2>{vehicle.makeInput ?? vehicle.make} {vehicle.modelInput ?? vehicle.model}</h2>
            </div>
            <BookOpenCheck size={22} aria-hidden="true" />
          </div>
          <p className="settings-help">
            {ja
              ? "愛車登録時の入力はそのまま残ります。ここでは、みんなで育てる車両カタログへ情報を届けます。"
              : "Your original garage text stays as entered. This form sends details to the vehicle catalog we are building together."}
          </p>
          <div className="form-grid two-columns">
            <Field
              label={ja ? "メーカー・ブランドの英字表記（任意）" : "Official make or marque name (optional)"}
              error={submitted && validation.errors.proposedMakeName ? tooLongMessage : false}
            >
              <input
                value={draft.proposedMakeName ?? ""}
                onChange={(event) => setField("proposedMakeName", event.target.value)}
                placeholder="CITROËN / SUBARU / EUNOS"
                maxLength={120}
              />
            </Field>
            <Field
              label={ja ? "車名の正式表記（任意）" : "Official model name (optional)"}
              error={submitted && validation.errors.proposedModelName ? tooLongMessage : false}
            >
              <input
                value={draft.proposedModelName ?? ""}
                onChange={(event) => setField("proposedModelName", event.target.value)}
                placeholder="205 / Barchetta"
                maxLength={160}
              />
            </Field>
          </div>
          <div className="form-grid two-columns">
            <Field label={ja ? "グレード・仕様（任意）" : "Grade or trim (optional)"}>
              <input
                value={draft.gradeInput ?? ""}
                onChange={(event) => setField("gradeInput", event.target.value)}
                placeholder="GTI 1.9 / Turbo 16"
                maxLength={160}
              />
            </Field>
            <Field label={ja ? "型式・モデルコード（任意）" : "Model code (optional)"}>
              <input
                value={draft.modelCodeInput ?? ""}
                onChange={(event) => setField("modelCodeInput", event.target.value)}
                maxLength={120}
              />
            </Field>
          </div>
        </section>

        <section className="form-section">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">SOURCE</span>
              <h2>{ja ? "何を見て確認しましたか" : "What did you check?"}</h2>
            </div>
          </div>
          <Field label={ja ? "情報のもと" : "Evidence basis"}>
            <select
              value={draft.evidenceBasis}
              onChange={(event) =>
                setField("evidenceBasis", event.target.value as VehicleCatalogEvidenceBasis)}
            >
              <option value="vehicle_itself">{ja ? "実車の表示・プレート" : "The vehicle itself"}</option>
              <option value="service_document">{ja ? "整備明細・記録簿" : "Service document"}</option>
              <option value="owners_manual">{ja ? "取扱説明書" : "Owner's manual"}</option>
              <option value="official_brochure">{ja ? "当時の公式カタログ" : "Official brochure"}</option>
              <option value="official_website">{ja ? "メーカー等の公式Webサイト" : "Official website"}</option>
              <option value="recalled_later">{ja ? "記憶をもとに入力" : "Recalled later"}</option>
              <option value="other">{ja ? "その他" : "Other"}</option>
              <option value="unknown">{ja ? "不明" : "Unknown"}</option>
            </select>
          </Field>
          <Field
            label={ja ? "確認した資料名・補足（任意）" : "Source title or note (optional)"}
            error={submitted && validation.errors.evidenceNote ? tooLongMessage : false}
          >
            <input
              value={draft.evidenceNote ?? ""}
              onChange={(event) => setField("evidenceNote", event.target.value)}
              maxLength={500}
              placeholder={ja ? "例：1991年版の国内カタログ" : "Example: 1991 domestic brochure"}
            />
          </Field>
          <Field
            label={ja ? "ほかに伝えたいこと（任意）" : "Additional note (optional)"}
            error={submitted && validation.errors.notes ? tooLongMessage : false}
          >
            <textarea
              value={draft.notes ?? ""}
              onChange={(event) => setField("notes", event.target.value)}
              maxLength={1000}
              rows={5}
              placeholder={ja
                ? "販売国による別名、同じ車名でも異なる仕様など"
                : "Market-specific names, materially different variants, or other context"}
            />
          </Field>
          <div className="catalog-privacy-note">
            <ShieldAlert size={19} aria-hidden="true" />
            <p>
              {ja
                ? "車台番号、登録番号、氏名、住所、電話番号は入力しないでください。資料画像の送信はP0では行いません。"
                : "Do not enter VINs, registration numbers, names, addresses, or phone numbers. P0 does not accept document images."}
            </p>
          </div>
        </section>

        {message && (
          <div className={`form-status-message${saved ? " is-success" : ""}`} role="status">
            {saved && <BookOpenCheck size={20} aria-hidden="true" />}
            <p>{message}</p>
          </div>
        )}
        <div className="form-actions">
          <Link href={`/garage?vehicle=${encodeURIComponent(vehicle.id)}`} className="secondary-action">
            {ja ? "愛車へ戻る" : "Back to vehicle"}
          </Link>
          <button type="submit" className="primary-action" disabled={saving}>
            {saving
              ? <LoaderCircle className="spin" size={18} />
              : <Send size={18} />}
            {saving
              ? (ja ? "保存中" : "Saving")
              : (ja ? "この一台の情報を届ける" : "Share this vehicle detail")}
          </button>
        </div>
      </form>

      <section className="settings-section">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">YOUR CONTRIBUTION</span>
            <h2>{ja ? "あなたが育てたカタログ" : "The catalog you helped grow"}</h2>
          </div>
        </div>
        <div className="catalog-contribution-impact" aria-label={ja ? "カタログへの協力状況" : "Your catalog contribution"}>
          <div>
            <strong>{suggestions.length}</strong>
            <span>{ja ? "届けた提案" : "Suggestions shared"}</span>
          </div>
          <div>
            <strong>{acceptedSuggestionCount}</strong>
            <span>{ja ? "カタログに反映" : "Added to catalog"}</span>
          </div>
        </div>
        {loadingHistory ? (
          <p className="settings-help"><LoaderCircle className="spin" size={16} /> {ja ? "読込中" : "Loading"}</p>
        ) : suggestions.length === 0 ? (
          <p className="settings-help">
            {ja
              ? "この一台で分かることをひとつ送ると、ここに残ります。"
              : "Share one thing you know about this vehicle and it will appear here."}
          </p>
        ) : (
          <div className="catalog-suggestion-list">
            {suggestions.map((suggestion) => (
              <article key={suggestion.id} className="catalog-suggestion-row">
                <div>
                  <strong>{suggestion.makeInput} {suggestion.modelInput}</strong>
                  <span>{new Date(suggestion.createdAt).toLocaleDateString(locale)}</span>
                </div>
                <span className={`catalog-status is-${suggestion.status}`}>
                  {statusLabel[suggestion.status]}
                </span>
                {suggestion.reviewerNote && <p>{suggestion.reviewerNote}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | false;
  children: ReactNode;
}) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
