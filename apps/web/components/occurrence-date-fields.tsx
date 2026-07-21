"use client";

import type { JournalDraft, JournalOccurrencePrecision, Locale } from "@mechori/core";
import { localDateInputValue } from "@/lib/date-input";

type OccurrenceDateValue = Pick<
  JournalDraft,
  "occurredOn" | "occurredYear" | "occurredMonth" | "occurredPrecision" | "occurredPeriodNote"
>;

const precisionOptions: Array<{
  value: JournalOccurrencePrecision;
  ja: string;
  en: string;
}> = [
  { value: "day", ja: "日付まで", en: "Exact date" },
  { value: "month", ja: "年月ごろ", en: "Around a month" },
  { value: "year", ja: "年ごろ", en: "Around a year" },
  { value: "unknown", ja: "時期不明", en: "Unknown" },
];

export function OccurrenceDateFields({
  value,
  locale,
  error,
  onChange,
}: {
  value: OccurrenceDateValue;
  locale: Locale;
  error?: string;
  onChange(patch: Partial<OccurrenceDateValue>): void;
}) {
  const ja = locale === "ja";
  const precision = value.occurredPrecision ?? (value.occurredOn ? "day" : "unknown");
  const currentYear = new Date().getFullYear();

  function selectPrecision(next: JournalOccurrencePrecision) {
    onChange({
      occurredPrecision: next,
      occurredOn: next === "day" ? value.occurredOn ?? localDateInputValue() : undefined,
      occurredYear:
        next === "month" || next === "year"
          ? value.occurredYear ?? currentYear
          : undefined,
      occurredMonth:
        next === "month"
          ? value.occurredMonth ?? new Date().getMonth() + 1
          : undefined,
    });
  }

  return (
    <fieldset className={`occurrence-date-fields${error ? " has-error" : ""}`}>
      <legend>{ja ? "出来事があった時期" : "When it happened"}</legend>
      <div className="date-precision-picker" role="group" aria-label={ja ? "時期の詳しさ" : "Date precision"}>
        {precisionOptions.map((option) => (
          <button
            type="button"
            key={option.value}
            className={precision === option.value ? "is-selected" : ""}
            aria-pressed={precision === option.value}
            onClick={() => selectPrecision(option.value)}
          >
            {ja ? option.ja : option.en}
          </button>
        ))}
      </div>
      {precision === "day" && (
        <label className="field">
          <span>{ja ? "日付" : "Date"}</span>
          <input
            type="date"
            max={localDateInputValue()}
            value={value.occurredOn ?? ""}
            onChange={(event) => onChange({ occurredOn: event.target.value })}
            aria-invalid={Boolean(error)}
          />
        </label>
      )}
      {(precision === "month" || precision === "year") && (
        <div className="occurrence-partial-date">
          <label className="field">
            <span>{ja ? "年" : "Year"}</span>
            <input
              type="number"
              inputMode="numeric"
              min="1886"
              max={currentYear}
              value={value.occurredYear ?? ""}
              onChange={(event) => onChange({
                occurredYear: event.target.value ? Number(event.target.value) : undefined,
              })}
              aria-invalid={Boolean(error)}
            />
          </label>
          {precision === "month" && (
            <label className="field">
              <span>{ja ? "月" : "Month"}</span>
              <select
                value={value.occurredMonth ?? ""}
                onChange={(event) => onChange({
                  occurredMonth: event.target.value ? Number(event.target.value) : undefined,
                })}
                aria-invalid={Boolean(error)}
              >
                <option value="">{ja ? "選択" : "Select"}</option>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <option key={month} value={month}>{ja ? `${month}月` : month}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      <label className="field occurrence-period-note">
        <span>{ja ? "時期の補足（任意）" : "Date note (optional)"}</span>
        <input
          type="text"
          maxLength={80}
          value={value.occurredPeriodNote ?? ""}
          onChange={(event) => onChange({ occurredPeriodNote: event.target.value })}
          placeholder={ja ? "例：車検の少し前、購入して半年後" : "e.g. Shortly before inspection"}
        />
      </label>
      <small className="occurrence-date-help">
        {error
          ? (ja ? "分かる範囲で時期を入力してください。" : "Enter the time period you know.")
          : (ja ? "正確な日付を推測せず、覚えている詳しさのまま保存します。" : "MECHORI keeps the precision you remember without inventing an exact date.")}
      </small>
    </fieldset>
  );
}
