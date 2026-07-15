"use client";

import {
  validateJournalDraft,
  type JournalDisplayField,
  type JournalDraft,
  type JournalVisibility,
} from "@mechory/core";
import { BookOpenText, Link2, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useApp } from "@/lib/app-context";

const displayFieldOptions: Array<{
  value: JournalDisplayField;
  ja: string;
  en: string;
}> = [
  { value: "service_date", ja: "整備日", en: "Service date" },
  { value: "odometer", ja: "その時点の走行距離", en: "Odometer at service" },
  { value: "actions", ja: "整備箇所・作業", en: "Maintenance actions" },
];

export function JournalForm() {
  const { data, locale, addJournal } = useApp();
  const router = useRouter();
  const ja = locale === "ja";
  const vehicle = data.vehicles[0];
  const [draft, setDraft] = useState<JournalDraft>({
    title: "",
    bodyOriginal: "",
    vehicleId: vehicle?.id ?? "",
    linkedRecordId: "",
    displayFields: ["service_date", "odometer", "actions"],
    visibility: "private",
    knowledgeExtractionConsent: false,
  });
  const [submitted, setSubmitted] = useState(false);
  const validation = validateJournalDraft(draft);

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!validation.valid) return;
    const journal = addJournal(draft);
    router.push(`/journal/${journal.id}`);
  }

  function setVisibility(visibility: JournalVisibility) {
    setDraft((current) => ({ ...current, visibility }));
  }

  function toggleDisplayField(field: JournalDisplayField) {
    setDraft((current) => ({
      ...current,
      displayFields: current.displayFields.includes(field)
        ? current.displayFields.filter((item) => item !== field)
        : [...current.displayFields, field],
    }));
  }

  return (
    <form className="journal-form" onSubmit={submit} noValidate>
      <section className="journal-writing-surface">
        <div className="journal-writing-heading">
          <BookOpenText size={22} aria-hidden="true" />
          <div>
            <strong>{ja ? "あなたの言葉で書く" : "Write in your own words"}</strong>
            <small>
              {ja
                ? "AIによる本文生成や書き換えは行いません。"
                : "AI will not generate or rewrite your journal."}
            </small>
          </div>
        </div>
        <label className={submitted && validation.errors.title ? "field has-error" : "field"}>
          {ja ? "タイトル" : "Title"}
          <input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
            placeholder={ja ? "今日、愛車とあったこと" : "What happened with your car today"}
          />
          {submitted && validation.errors.title && (
            <small>{ja ? "タイトルを入力してください" : "Enter a title"}</small>
          )}
        </label>
        <label className={submitted && validation.errors.bodyOriginal ? "field has-error" : "field"}>
          {ja ? "本文" : "Journal"}
          <textarea
            className="journal-body-input"
            value={draft.bodyOriginal}
            onChange={(event) =>
              setDraft((current) => ({ ...current, bodyOriginal: event.target.value }))
            }
            placeholder={
              ja
                ? "工場へ持ち込んだ経緯、直ってうれしかったこと、まだ気になることなど、自由に書いてください。"
                : "Write freely about the visit, what felt good afterward, or what still concerns you."
            }
          />
          {submitted && validation.errors.bodyOriginal && (
            <small>{ja ? "本文を入力してください" : "Write your journal"}</small>
          )}
        </label>
      </section>

      <section className="journal-settings">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">OPTIONAL CONTEXT</span>
            <h2>{ja ? "整備記録を添える" : "Attach maintenance context"}</h2>
          </div>
          <Link2 size={21} aria-hidden="true" />
        </div>
        <label className="field">
          {ja ? "関連する整備記録" : "Related maintenance record"}
          <select
            value={draft.linkedRecordId}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                linkedRecordId: event.target.value,
              }))
            }
          >
            <option value="">{ja ? "関連付けない" : "No linked record"}</option>
            {data.records.map((record) => (
              <option key={record.id} value={record.id}>
                {record.serviceDate} · {record.summary}
              </option>
            ))}
          </select>
        </label>
        {draft.linkedRecordId && (
          <fieldset className="journal-field-options">
            <legend>{ja ? "Journalに表示する定型情報" : "Structured details to show"}</legend>
            {displayFieldOptions.map((option) => (
              <label className="checkbox-row" key={option.value}>
                <input
                  type="checkbox"
                  checked={draft.displayFields.includes(option.value)}
                  onChange={() => toggleDisplayField(option.value)}
                />
                <span>{ja ? option.ja : option.en}</span>
              </label>
            ))}
          </fieldset>
        )}
      </section>

      <section className="journal-settings">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">PRIVACY</span>
            <h2>{ja ? "公開範囲" : "Audience"}</h2>
          </div>
          <ShieldCheck size={21} aria-hidden="true" />
        </div>
        <div className="segmented-control" role="group" aria-label={ja ? "公開範囲" : "Audience"}>
          {([
            ["private", ja ? "非公開" : "Private"],
            ["followers", ja ? "フォロワー" : "Followers"],
            ["public", ja ? "公開" : "Public"],
          ] as Array<[JournalVisibility, string]>).map(([value, label]) => (
            <button
              type="button"
              className={draft.visibility === value ? "is-selected" : ""}
              aria-pressed={draft.visibility === value}
              onClick={() => setVisibility(value)}
              key={value}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="consent-option">
          <input
            type="checkbox"
            checked={draft.knowledgeExtractionConsent}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                knowledgeExtractionConsent: event.target.checked,
              }))
            }
          />
          <span>
            <strong>
              {ja
                ? "本文からナレッジ候補を探すことを許可する"
                : "Allow knowledge candidates to be found in this journal"}
            </strong>
            <small>
              {ja
                ? "候補は自動確定されません。実AIはこのDEMOに接続されていません。"
                : "Candidates are never auto-confirmed. No real AI is connected in this demo."}
            </small>
          </span>
        </label>
      </section>

      <div className="form-actions">
        <button type="submit" className="primary-action">
          <Save size={17} aria-hidden="true" />
          {draft.visibility === "private"
            ? ja
              ? "非公開で保存"
              : "Save privately"
            : ja
              ? "公開範囲を確認して保存"
              : "Review audience and save"}
        </button>
      </div>
    </form>
  );
}
