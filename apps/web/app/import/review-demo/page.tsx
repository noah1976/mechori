"use client";

import { DemoNotice } from "@/components/demo-notice";
import { useApp } from "@/lib/app-context";
import {
  canConfirmCandidate,
  getImportReviewProgress,
  reviewFieldAssertion,
  type FieldAssertion,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { ArrowLeft, Check, CircleAlert, RotateCcw, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const initialAssertions: FieldAssertion[] = [
  {
    id: "demo-field-date",
    extractedCandidateId: "demo-candidate-event",
    fieldCode: "service_date",
    suggestedValue: "2024-04-18",
    sourcePage: 1,
    confidenceBand: "high",
    inferenceState: "read",
    verificationState: "unreviewed",
  },
  {
    id: "demo-field-odometer",
    extractedCandidateId: "demo-candidate-event",
    fieldCode: "odometer",
    rawExtractedText: "B6?20 km",
    suggestedValue: "86420",
    sourcePage: 1,
    confidenceBand: "low",
    inferenceState: "inferred",
    verificationState: "needs_review",
  },
  {
    id: "demo-field-work",
    extractedCandidateId: "demo-candidate-event",
    fieldCode: "work_performed",
    suggestedValue: "DEMO: 定期整備（具体的な作業内容は未入力）",
    sourcePage: 1,
    confidenceBand: "medium",
    inferenceState: "read",
    verificationState: "unreviewed",
  },
  {
    id: "demo-field-part-number",
    extractedCandidateId: "demo-candidate-event",
    fieldCode: "part_number",
    rawExtractedText: "判読不能",
    suggestedValue: "",
    sourcePage: 1,
    confidenceBand: "unknown",
    inferenceState: "unreadable",
    verificationState: "needs_review",
  },
];

const fieldLabels: Record<string, { ja: string; en: string }> = {
  service_date: { ja: "整備日", en: "Service date" },
  odometer: { ja: "走行距離", en: "Odometer" },
  work_performed: { ja: "作業内容", en: "Work performed" },
  part_number: { ja: "部品番号", en: "Part number" },
};

export default function ImportReviewDemoPage() {
  const { locale } = useApp();
  const ja = locale === "ja";
  const [assertions, setAssertions] = useState(() => structuredClone(initialAssertions));
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialAssertions.map((assertion) => [assertion.id, assertion.suggestedValue ?? ""])),
  );
  const [draftCreated, setDraftCreated] = useState(false);
  const progress = useMemo(() => getImportReviewProgress(assertions), [assertions]);
  const ready = canConfirmCandidate("in_review", assertions);

  function review(assertionId: string, state: "user_confirmed" | "rejected") {
    setAssertions((current) => reviewFieldAssertion(current, assertionId, state, values[assertionId]));
    setDraftCreated(false);
  }

  function reset() {
    setAssertions(structuredClone(initialAssertions));
    setValues(Object.fromEntries(initialAssertions.map((assertion) => [assertion.id, assertion.suggestedValue ?? ""])));
    setDraftCreated(false);
  }

  return (
    <div className="page-stack narrow-page">
      <DemoNotice />
      <Link href="/import" className="back-link"><ArrowLeft size={17} />{ja ? "取り込みへ戻る" : "Back to import"}</Link>
      <header className="page-header"><div><span className="eyebrow">HUMAN REVIEW</span><h1>{translate(locale, "importReviewDemo")}</h1><p>{translate(locale, "importReviewIntro")}</p></div></header>

      <section className="review-progress" aria-label={ja ? "確認進捗" : "Review progress"}>
        <div><strong>{progress.remaining}</strong><span>{translate(locale, "reviewRemaining")}</span></div>
        <div><strong>{progress.confirmed}</strong><span>{translate(locale, "reviewConfirmed")}</span></div>
        <div><strong>{progress.rejected}</strong><span>{translate(locale, "reviewExcluded")}</span></div>
      </section>

      <div className="import-review-list">
        {assertions.map((assertion, index) => {
          const label = fieldLabels[assertion.fieldCode] ?? { ja: assertion.fieldCode, en: assertion.fieldCode };
          const reviewed = assertion.verificationState === "user_confirmed" || assertion.verificationState === "rejected";
          const uncertain = assertion.confidenceBand === "low" || assertion.confidenceBand === "unknown" || assertion.inferenceState !== "read";
          return (
            <article key={assertion.id} className={`import-review-field${uncertain ? " needs-attention" : ""}${reviewed ? " is-reviewed" : ""}`}>
              <header>
                <span className="review-field-number">{String(index + 1).padStart(2, "0")}</span>
                <div><h2>{ja ? label.ja : label.en}</h2><p>{ja ? `DEMO資料 1ページ目 · 認識確度 ${assertion.confidenceBand ?? "unknown"}` : `DEMO source page 1 · Confidence ${assertion.confidenceBand ?? "unknown"}`}</p></div>
                {uncertain && !reviewed ? <span className="badge hazard-caution"><CircleAlert size={13} />{ja ? "要確認" : "CHECK"}</span> : null}
                {assertion.verificationState === "user_confirmed" ? <span className="badge hazard-low"><Check size={13} />{translate(locale, "reviewConfirmed")}</span> : null}
                {assertion.verificationState === "rejected" ? <span className="badge badge-neutral"><X size={13} />{translate(locale, "reviewExcluded")}</span> : null}
              </header>
              {assertion.rawExtractedText ? <p className="raw-reading">{ja ? "読み取った文字" : "Raw reading"}: <code>{assertion.rawExtractedText}</code></p> : null}
              <label className="field">
                {ja ? "登録候補" : "Suggested value"}
                <input value={values[assertion.id] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [assertion.id]: event.target.value }))} disabled={reviewed} placeholder={ja ? "読めない場合は空欄のまま除外" : "Leave blank and exclude if unreadable"} />
              </label>
              {!reviewed ? <div className="review-field-actions"><button type="button" className="primary-action" onClick={() => review(assertion.id, "user_confirmed")}><Check size={16} />{translate(locale, "useSuggestedValue")}</button><button type="button" className="secondary-action" onClick={() => review(assertion.id, "rejected")}><X size={16} />{translate(locale, "excludeField")}</button></div> : null}
            </article>
          );
        })}
      </div>

      <section className={`draft-gate ${ready ? "is-ready" : "is-blocked"}`}>
        {ready ? <ShieldCheck size={25} /> : <CircleAlert size={25} />}
        <div><strong>{draftCreated ? translate(locale, "draftReady") : ready ? (ja ? "全項目の確認が完了しました" : "All fields reviewed") : translate(locale, "draftNotReady")}</strong><p>{ja ? "このDEMOは実データを保存しません。本番では確認済み項目だけを非公開下書きへ変換します。" : "This demo saves no real data. Production will convert only reviewed fields into a private draft."}</p></div>
        {ready && !draftCreated ? <button type="button" className="primary-action" onClick={() => setDraftCreated(true)}>{ja ? "非公開下書きを作る" : "Create private draft"}</button> : <button type="button" className="secondary-action" onClick={reset}><RotateCcw size={16} />{translate(locale, "resetReview")}</button>}
      </section>
    </div>
  );
}
