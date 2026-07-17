"use client";

import { useApp } from "@/lib/app-context";
import type { ContentReportReason } from "@mechori/core";
import { ArrowLeft, CheckCircle2, Flag, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

const reasons: ContentReportReason[] = [
  "personal_information",
  "dangerous_claim",
  "harassment",
  "copyright",
  "spam",
  "other",
];

export default function JournalReportPage() {
  const { id } = useParams<{ id: string }>();
  const { data, locale, submitReport } = useApp();
  const [reason, setReason] = useState<ContentReportReason>("personal_information");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const ja = locale === "ja";
  const journal = data.journals.find((item) => item.id === id);
  const existing = data.contentReports.some(
    (report) =>
      report.reporterProfileId === data.currentProfileId &&
      report.targetId === id &&
      report.status !== "closed_no_action",
  );

  if (!journal || journal.authorProfileId === data.currentProfileId) {
    return (
      <div className="empty-state">
        <ShieldAlert size={28} aria-hidden="true" />
        <h1>{ja ? "この投稿は通報できません" : "This post cannot be reported"}</h1>
        <p>{ja ? "投稿が見つからないか、自分の投稿です。" : "The post is missing or belongs to you."}</p>
        <Link href="/feed" className="secondary-action">{ja ? "フィードへ戻る" : "Back to feed"}</Link>
      </div>
    );
  }

  if (submitted || existing) {
    return (
      <div className="page-stack narrow-page">
        <Link href={`/journal/${journal.id}`} className="back-link"><ArrowLeft size={17} />{ja ? "投稿へ戻る" : "Back to post"}</Link>
        <section className="report-success" role="status">
          <CheckCircle2 size={32} aria-hidden="true" />
          <div>
            <h1>{ja ? "通報を受け付けました" : "Report received"}</h1>
            <p>{ja ? "同じ投稿への確認中の通報は重複送信しません。このDEMOでは端末内だけに保存されます。" : "An open report for this post is not submitted twice. This DEMO stores it only on this device."}</p>
          </div>
        </section>
        <Link href="/moderation" className="secondary-action self-start">{ja ? "運営フローDEMOを確認" : "Open moderation DEMO"}</Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await submitReport({ targetType: "journal", targetId: id, reason, details });
      setSubmitted(true);
    } catch {
      setError(ja ? "通報を端末へ保存できませんでした。" : "The report could not be saved on this device.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <Link href={`/journal/${journal.id}`} className="back-link"><ArrowLeft size={17} />{ja ? "投稿へ戻る" : "Back to post"}</Link>
      <header className="page-header">
        <div><span className="eyebrow">REPORT</span><h1>{ja ? "投稿を通報" : "Report post"}</h1><p>{journal.title}</p></div>
        <Flag size={26} aria-hidden="true" />
      </header>
      <form className="report-form" onSubmit={handleSubmit} aria-busy={submitting}>
        <fieldset>
          <legend>{ja ? "該当する理由" : "Reason"}</legend>
          <div className="report-reason-list">
            {reasons.map((item) => (
              <label key={item}>
                <input type="radio" name="reason" value={item} checked={reason === item} onChange={() => setReason(item)} />
                <span><strong>{reasonLabel(item, ja)}</strong><small>{reasonDescription(item, ja)}</small></span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field-label">
          <span>{ja ? "補足（任意）" : "Additional context (optional)"}</span>
          <textarea value={details} onChange={(event) => setDetails(event.target.value)} maxLength={500} rows={5} placeholder={ja ? "確認してほしい箇所を、個人情報を追加せずに記入" : "Describe what should be reviewed without adding personal data"} />
          <small>{details.length}/500</small>
        </label>
        <p className="legal-note">{ja ? "通報は人気や投稿者の信頼度へ反映しません。緊急の危険や犯罪通報を代替する機能ではありません。" : "Reports do not affect popularity or author trust. This is not an emergency or crime-reporting channel."}</p>
        {error && <p className="form-error-summary" role="alert">{error}</p>}
        <div className="form-actions"><Link href={`/journal/${journal.id}`} className="secondary-action">{ja ? "キャンセル" : "Cancel"}</Link><button type="submit" className="primary-action" disabled={submitting}><Flag size={17} />{submitting ? (ja ? "保存中" : "Saving") : (ja ? "通報を送信" : "Submit report")}</button></div>
      </form>
    </div>
  );
}

function reasonLabel(reason: ContentReportReason, ja: boolean): string {
  const labels: Record<ContentReportReason, [string, string]> = {
    personal_information: ["個人情報・プライバシー", "Personal information or privacy"],
    dangerous_claim: ["危険な断定・誤解を招く整備情報", "Dangerous or misleading maintenance claim"],
    harassment: ["嫌がらせ・誹謗中傷", "Harassment or abuse"],
    copyright: ["無断転載・権利侵害", "Copyright or rights concern"],
    spam: ["スパム・宣伝", "Spam or promotion"],
    other: ["その他", "Other"],
  };
  return labels[reason][ja ? 0 : 1];
}

function reasonDescription(reason: ContentReportReason, ja: boolean): string {
  const descriptions: Record<ContentReportReason, [string, string]> = {
    personal_information: ["顔、住所、ナンバー、書類など", "Faces, addresses, plates, or documents"],
    dangerous_claim: ["原因や修理結果を根拠なく断定しているなど", "Unsupported claims about causes or repair outcomes"],
    harassment: ["個人や集団を攻撃する内容", "Content attacking a person or group"],
    copyright: ["許諾のない文章・画像・資料", "Text, images, or material used without permission"],
    spam: ["反復投稿や無関係な宣伝", "Repeated posts or unrelated promotion"],
    other: ["上記に当てはまらない問題", "A concern not listed above"],
  };
  return descriptions[reason][ja ? 0 : 1];
}
