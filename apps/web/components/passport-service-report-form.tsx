"use client";

import {
  createEmptyPassportServiceItem,
  createEmptyPassportServiceReportDraft,
  PASSPORT_SERVICE_ITEM_LIMIT,
  PASSPORT_REPORT_TEXT_LIMIT,
  submitPassportServiceReport,
  validatePassportServiceReportDraft,
  type PassportServiceReportDraft,
} from "@/lib/passport-service-reports";
import { PassportServiceItemEditor } from "@/components/passport-service-item-editor";
import { CheckCircle2, LoaderCircle, Plus, Send, Wrench } from "lucide-react";
import { useState, type FormEvent } from "react";

export function PassportServiceReportForm({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(createEmptyPassportServiceReportDraft);
  const [submissionKey] = useState(() => crypto.randomUUID());
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string>();

  function setField<K extends keyof PassportServiceReportDraft>(
    key: K,
    value: PassportServiceReportDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending" || state === "sent") return;
    const validation = validatePassportServiceReportDraft(draft);
    if (!validation.valid) {
      setError(validation.error === "subject"
        ? `整備項目 ${(validation.itemIndex ?? 0) + 1}の「どこ・何について？」を入力してください。`
        : validation.error === "empty"
          ? `整備項目 ${(validation.itemIndex ?? 0) + 1}に、行ったことか追加情報を入力してください。`
          : "入力内容を確認してください。");
      return;
    }
    setState("sending");
    setError(undefined);
    try {
      await submitPassportServiceReport(token, submissionKey, draft);
      setState("sent");
    } catch {
      setState("error");
      setError("送信できませんでした。共有が続いているか確認して、もう一度お試しください。");
    }
  }

  if (state === "sent") {
    return (
      <section className="workshop-report-success" role="status">
        <CheckCircle2 size={26} aria-hidden="true" />
        <div>
          <h2>整備内容を送信しました</h2>
          <p>オーナーが内容を確認すると、愛車の整備履歴に追加されます。</p>
        </div>
      </section>
    );
  }

  return (
    <section className="workshop-report-section" aria-labelledby="workshop-report-heading">
      <div className="workshop-report-intro">
        <Wrench size={22} aria-hidden="true" />
        <div>
          <h2 id="workshop-report-heading">今回の整備内容を返す</h2>
          <p>今回行った整備内容を、オーナーの愛車履歴へ返せます。オーナーが確認したあと、履歴に追加されます。</p>
        </div>
      </div>
      {!open ? (
        <button className="primary-action" type="button" onClick={() => setOpen(true)}>
          <Wrench size={17} aria-hidden="true" />今回の整備内容を返す
        </button>
      ) : (
        <form className="workshop-report-form" onSubmit={submit} noValidate>
          <p>オイル交換だけなら「どこ・何について？」「何をした？」だけで送れます。車検など複数の作業がある場合は、整備項目を追加してください。</p>
          <label className="field">
            <span>工場名 <small>任意</small></span>
            <input maxLength={120} value={draft.workshopName} onChange={(event) => setField("workshopName", event.target.value)} />
          </label>
          <div className="workshop-report-date-row">
            <label className="field">
              <span>作業日 <small>任意</small></span>
              <input type="date" value={draft.serviceDate} onChange={(event) => setField("serviceDate", event.target.value)} />
            </label>
            <label className="field">
              <span>作業時の走行距離 <small>任意</small></span>
              <input type="number" min="0" max="1000000000" inputMode="numeric" value={draft.odometerValue} onChange={(event) => setField("odometerValue", event.target.value)} placeholder="例: 86420" />
            </label>
            <label className="field workshop-report-unit">
              <span>単位</span>
              <select value={draft.odometerUnit} onChange={(event) => setField("odometerUnit", event.target.value as PassportServiceReportDraft["odometerUnit"])}>
                <option value="km">km</option><option value="mi">mi</option><option value="unknown">不明</option>
              </select>
            </label>
          </div>
          <div className="service-item-list" aria-label="今回の整備項目">
            {draft.serviceItems.map((item, index) => (
              <PassportServiceItemEditor
                key={item.id}
                item={item}
                index={index}
                canRemove={draft.serviceItems.length > 1}
                onChange={(nextItem) => setField("serviceItems", draft.serviceItems.map((current) => current.id === item.id ? nextItem : current))}
                onRemove={() => setField("serviceItems", draft.serviceItems.filter((current) => current.id !== item.id))}
              />
            ))}
          </div>
          <button
            className="service-item-add secondary-action"
            type="button"
            disabled={draft.serviceItems.length >= PASSPORT_SERVICE_ITEM_LIMIT}
            onClick={() => setField("serviceItems", [...draft.serviceItems, createEmptyPassportServiceItem()])}
          >
            <Plus size={17} aria-hidden="true" />整備項目を追加
          </button>
          <ReportTextarea label="全体の補足" value={draft.visitNotes} placeholder="入庫全体について必要なことがあれば" onChange={(value) => setField("visitNotes", value)} />
          {error && <p className="form-error-summary" role="alert">{error}</p>}
          <div className="form-actions">
            <button className="secondary-action" type="button" disabled={state === "sending"} onClick={() => setOpen(false)}>閉じる</button>
            <button className="primary-action" type="submit" disabled={state === "sending"}>
              {state === "sending" ? <LoaderCircle className="spin" size={17} /> : <Send size={17} aria-hidden="true" />}
              {state === "sending" ? "送信中" : "オーナーへ送る"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function ReportTextarea({
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
      <textarea rows={3} maxLength={PASSPORT_REPORT_TEXT_LIMIT} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}
