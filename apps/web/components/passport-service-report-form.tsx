"use client";

import {
  createEmptyPassportServiceReportDraft,
  PASSPORT_REPORT_TEXT_LIMIT,
  submitPassportServiceReport,
  validatePassportServiceReportDraft,
  type PassportServiceReportDraft,
} from "@/lib/passport-service-reports";
import { CheckCircle2, LoaderCircle, Send, Wrench } from "lucide-react";
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
      setError(validation.error === "empty"
        ? "確認したこと、作業、部品、結果、補足のいずれかを入力してください。"
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
          <p>分かる範囲だけで入力できます。空欄はそのままで大丈夫です。</p>
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
          <ReportTextarea label="今回確認したこと" value={draft.inspectionNotes} placeholder="例: 左リアブレーキ周辺を確認" onChange={(value) => setField("inspectionNotes", value)} />
          <ReportTextarea label="実施した作業" value={draft.workPerformed} placeholder="例: 左リアキャリパー交換、エア抜き" onChange={(value) => setField("workPerformed", value)} />
          <ReportTextarea label="使用した部品" value={draft.partsUsed} placeholder="例: TRW リアキャリパー" onChange={(value) => setField("partsUsed", value)} />
          <ReportTextarea label="結果" value={draft.resultNotes} placeholder="例: 漏れがないことを確認" onChange={(value) => setField("resultNotes", value)} />
          <ReportTextarea label="補足" value={draft.otherNotes} placeholder="必要なことがあれば" onChange={(value) => setField("otherNotes", value)} />
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
