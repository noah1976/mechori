"use client";

import {
  PASSPORT_SERVICE_ITEM_SUBJECT_LIMIT,
  PASSPORT_SERVICE_ITEM_TEXT_LIMIT,
  type PassportServiceItemDraft,
} from "@/lib/passport-service-reports";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useState } from "react";

export function PassportServiceItemEditor({
  item,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  item: PassportServiceItemDraft;
  index: number;
  canRemove: boolean;
  onChange(item: PassportServiceItemDraft): void;
  onRemove(): void;
}) {
  const hasOptionalDetails = Boolean(
    item.observedCondition || item.partsUsed || item.result || item.followUpNote,
  );
  const [detailsOpen, setDetailsOpen] = useState(hasOptionalDetails);
  const title = item.subject.trim() || `整備項目 ${index + 1}`;

  function setField<K extends keyof PassportServiceItemDraft>(
    key: K,
    value: PassportServiceItemDraft[K],
  ) {
    onChange({ ...item, [key]: value });
  }

  return (
    <section className="service-item-editor" aria-labelledby={`service-item-${item.id}`}>
      <header className="service-item-header">
        <div>
          <span>整備項目 {index + 1}</span>
          <h3 id={`service-item-${item.id}`}>{title}</h3>
        </div>
        {canRemove && (
          <button className="service-item-remove" type="button" onClick={onRemove}>
            <Trash2 size={16} aria-hidden="true" />削除
          </button>
        )}
      </header>

      <div className="service-item-core">
        <label className="field">
          <span>どこ・何について？</span>
          <input
            required
            maxLength={PASSPORT_SERVICE_ITEM_SUBJECT_LIMIT}
            value={item.subject}
            onChange={(event) => setField("subject", event.target.value)}
            placeholder="例: 左リアブレーキ"
          />
        </label>
        <label className="field">
          <span>何をした？ <small>点検のみでもOK</small></span>
          <textarea
            rows={2}
            maxLength={PASSPORT_SERVICE_ITEM_TEXT_LIMIT}
            value={item.workPerformed}
            onChange={(event) => setField("workPerformed", event.target.value)}
            placeholder="例: キャリパー交換・エア抜き"
          />
        </label>
      </div>

      <button
        className="service-item-detail-toggle"
        type="button"
        aria-expanded={detailsOpen}
        onClick={() => setDetailsOpen((value) => !value)}
      >
        {detailsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        {detailsOpen ? "追加情報を閉じる" : "状態・部品・結果も追加"}
      </button>

      {detailsOpen && (
        <div className="service-item-detail-grid">
          <OptionalField
            label="どうなっていた？"
            value={item.observedCondition}
            placeholder="例: キャリパーからフルード漏れ"
            onChange={(value) => setField("observedCondition", value)}
          />
          <OptionalField
            label="交換・使用した部品"
            value={item.partsUsed}
            placeholder="例: TRW リアキャリパー"
            onChange={(value) => setField("partsUsed", value)}
          />
          <OptionalField
            label="作業後どうなった？"
            value={item.result}
            placeholder="例: 漏れなしを確認"
            onChange={(value) => setField("result", value)}
          />
          <OptionalField
            label="次に気をつけること"
            value={item.followUpNote}
            placeholder="例: 次回車検時に再確認"
            onChange={(value) => setField("followUpNote", value)}
          />
        </div>
      )}
    </section>
  );
}

function OptionalField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange(value: string): void;
}) {
  return (
    <label className="field">
      <span>{label} <small>任意</small></span>
      <textarea
        rows={2}
        maxLength={PASSPORT_SERVICE_ITEM_TEXT_LIMIT}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
