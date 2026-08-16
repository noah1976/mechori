"use client";

import { OccurrenceDateFields } from "@/components/occurrence-date-fields";
import { ServiceAttributionField } from "@/components/service-attribution-field";
import {
  journalSupportsServiceAttribution,
  journalToDraft,
  normalizeServiceAttribution,
  type GarageJournalPost,
  type JournalDraft,
  type JournalEventType,
  type MaintenanceServiceAttributionV1,
  type Locale,
} from "@mechori/core";
import { CheckCircle2, LoaderCircle, Wrench, X } from "lucide-react";
import { useState, type FormEvent } from "react";

const eventTypes: Array<{ value: JournalEventType; ja: string; en: string }> = [
  { value: "other", ja: "その他", en: "Other" },
  { value: "inspection", ja: "点検・整備", en: "Inspection" },
  { value: "repair", ja: "修理", en: "Repair" },
  { value: "part", ja: "部品交換", en: "Part" },
  { value: "drive", ja: "ドライブ", en: "Drive" },
  { value: "memory", ja: "思い出", en: "Memory" },
];

type OccurrenceDraft = Pick<
  JournalDraft,
  "occurredOn" | "occurredYear" | "occurredMonth" | "occurredPrecision" | "occurredPeriodNote"
>;

export function QuickRecordCompletionSheet({
  journal,
  locale,
  onClose,
  onSaveEnrichment,
}: {
  journal: GarageJournalPost;
  locale: Locale;
  onClose(): void;
  onSaveEnrichment(draft: JournalDraft): Promise<GarageJournalPost>;
}) {
  const ja = locale === "ja";
  const stored = journalToDraft(journal);
  const [mode, setMode] = useState<"prompt" | "form" | "saved">("prompt");
  const [eventType, setEventType] = useState<JournalEventType>(journal.eventType ?? "other");
  const [occurrence, setOccurrence] = useState<OccurrenceDraft>({
    occurredOn: stored.occurredOn,
    occurredYear: stored.occurredYear,
    occurredMonth: stored.occurredMonth,
    occurredPrecision: stored.occurredPrecision,
    occurredPeriodNote: stored.occurredPeriodNote,
  });
  const [serviceAttribution, setServiceAttribution] = useState<MaintenanceServiceAttributionV1>(
    () => normalizeServiceAttribution(journal.serviceAttribution),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveEnrichment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const draft: JournalDraft = {
      ...journalToDraft(journal),
      eventType,
      ...occurrence,
    };
    if (journalSupportsServiceAttribution(eventType)) {
      draft.serviceAttribution = serviceAttribution;
    } else {
      delete draft.serviceAttribution;
    }

    setSaving(true);
    setError("");
    try {
      await onSaveEnrichment(draft);
      setMode("saved");
    } catch {
      setError(
        ja
          ? "追加情報を保存できませんでした。元の記録は残っています。"
          : "Additional details could not be saved. Your original record is still saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="quick-record-sheet-backdrop" role="presentation">
      <section className="quick-record-sheet" role="dialog" aria-modal="true" aria-labelledby="quick-record-sheet-title">
        {mode === "prompt" && <>
          <CheckCircle2 className="quick-record-sheet-icon" size={30} aria-hidden="true" />
          <h1 id="quick-record-sheet-title">{ja ? "記録しました" : "Record saved"}</h1>
          <p>{ja ? "整備情報も追加しますか？" : "Would you like to add maintenance details?"}</p>
          <div className="quick-record-sheet-actions">
            <button type="button" className="primary-action" onClick={() => setMode("form")}>
              <Wrench size={17} aria-hidden="true" />
              {ja ? "整備情報を追加" : "Add maintenance details"}
            </button>
            <button type="button" className="secondary-action" onClick={onClose}>{ja ? "閉じる" : "Close"}</button>
          </div>
        </>}

        {mode === "form" && <>
          <div className="quick-record-sheet-heading">
            <div>
              <h1 id="quick-record-sheet-title">{ja ? "整備情報を追加" : "Add maintenance details"}</h1>
              <p>{ja ? "分かる項目だけ追加できます。" : "Add only the details you know."}</p>
            </div>
            <button type="button" className="icon-action" onClick={onClose} aria-label={ja ? "閉じる" : "Close"}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <form className="quick-record-enrichment-form" onSubmit={saveEnrichment}>
            <fieldset className="event-type-picker">
              <legend>{ja ? "記録の種類" : "Record type"}</legend>
              {eventTypes.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={eventType === item.value ? "is-selected" : ""}
                  aria-pressed={eventType === item.value}
                  onClick={() => setEventType(item.value)}
                >
                  {ja ? item.ja : item.en}
                </button>
              ))}
            </fieldset>
            <OccurrenceDateFields
              value={occurrence}
              locale={locale}
              onChange={(patch) => setOccurrence((current) => ({ ...current, ...patch }))}
            />
            {journalSupportsServiceAttribution(eventType) && (
              <ServiceAttributionField
                value={serviceAttribution}
                onChange={setServiceAttribution}
                locale={locale}
                compact
              />
            )}
            {error && <p className="form-error-summary" role="alert">{error}</p>}
            <div className="quick-record-sheet-actions">
              <button type="submit" className="primary-action" disabled={saving}>
                {saving && <LoaderCircle className="spin" size={17} aria-hidden="true" />}
                {ja ? "追加を保存" : "Save details"}
              </button>
              <button type="button" className="secondary-action" onClick={onClose}>{ja ? "閉じる" : "Close"}</button>
            </div>
          </form>
        </>}

        {mode === "saved" && <>
          <CheckCircle2 className="quick-record-sheet-icon" size={30} aria-hidden="true" />
          <h1 id="quick-record-sheet-title">{ja ? "整備情報を追加しました" : "Maintenance details added"}</h1>
          <p>{ja ? "元の記録にも反映されています。" : "The original record has been updated."}</p>
          <div className="quick-record-sheet-actions">
            <button type="button" className="primary-action" onClick={onClose}>{ja ? "投稿を見る" : "View record"}</button>
          </div>
        </>}
      </section>
    </div>
  );
}
