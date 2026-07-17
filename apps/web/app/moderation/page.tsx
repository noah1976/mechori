"use client";

import { DemoNotice } from "@/components/demo-notice";
import { useApp } from "@/lib/app-context";
import type { ContentReport, ContentReportReason, ModerationAction } from "@mechori/core";
import { CheckCircle2, Clock3, EyeOff, Flag, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type QueueFilter = "open" | "all" | "closed";

export default function ModerationPage() {
  const { data, locale, moderateReport } = useApp();
  const [filter, setFilter] = useState<QueueFilter>("open");
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");
  const ja = locale === "ja";
  const reports = data.contentReports.filter((report) => filter === "all" || (filter === "closed" ? report.status === "closed_no_action" : report.status !== "closed_no_action"));

  async function run(reportId: string, action: Exclude<ModerationAction, "submitted">) {
    setWorkingId(reportId);
    setError("");
    try {
      await moderateReport(reportId, action);
    } catch {
      setError(ja ? "状態を端末へ保存できませんでした。" : "The status could not be saved on this device.");
    } finally {
      setWorkingId("");
    }
  }

  return (
    <div className="page-stack moderation-page">
      <DemoNotice />
      <header className="page-header"><div><span className="eyebrow">LOCAL OPERATIONS DEMO</span><h1>{ja ? "通報・モデレーション" : "Reports and moderation"}</h1><p>{ja ? "少人数ベータで必要な最小状態遷移を端末内だけで確認します。実際の管理者権限、通知、サーバー監査ではありません。" : "Review the minimum workflow for a small beta, stored only on this device. This is not real admin authorization, notification, or server auditing."}</p></div><ShieldCheck size={30} aria-hidden="true" /></header>

      <div className="moderation-summary">
        <div><Flag size={20} /><strong>{data.contentReports.filter((report) => report.status !== "closed_no_action").length}</strong><span>{ja ? "対応中" : "Open"}</span></div>
        <div><EyeOff size={20} /><strong>{data.contentReports.filter((report) => report.status === "temporarily_hidden").length}</strong><span>{ja ? "一時非公開" : "Hidden"}</span></div>
        <div><CheckCircle2 size={20} /><strong>{data.contentReports.filter((report) => report.status === "closed_no_action").length}</strong><span>{ja ? "終了" : "Closed"}</span></div>
      </div>

      <div className="segmented-control moderation-filter" role="group" aria-label={ja ? "通報一覧の絞り込み" : "Filter reports"}>{(["open", "all", "closed"] as QueueFilter[]).map((item) => <button key={item} type="button" className={filter === item ? "is-selected" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item === "open" ? (ja ? "対応中" : "Open") : item === "closed" ? (ja ? "終了" : "Closed") : (ja ? "すべて" : "All")}</button>)}</div>
      {error && <p className="form-error-summary" role="alert">{error}</p>}

      {reports.length ? <div className="moderation-list">{reports.map((report) => <ReportRow key={report.id} report={report} working={workingId === report.id} ja={ja} data={data} run={run} />)}</div> : <div className="empty-state"><Flag size={28} /><h2>{ja ? "該当する通報はありません" : "No matching reports"}</h2><p>{ja ? "DEMO Journalのメニューから通報すると、ここへ追加されます。" : "Report a DEMO journal from its menu to add it here."}</p><Link href="/feed" className="primary-action">{ja ? "フィードを開く" : "Open feed"}</Link></div>}
      <p className="legal-note">{ja ? "一時非公開は削除ではありません。通報内容を人気・信頼度・Professional確認へ利用せず、正式運用では権限分離とサーバー側監査が必要です。" : "Temporary hiding is not deletion. Reports never affect popularity, trust, or Professional status. Production requires separated permissions and server-side audit logs."}</p>
    </div>
  );
}

function ReportRow({ report, working, ja, data, run }: { report: ContentReport; working: boolean; ja: boolean; data: ReturnType<typeof useApp>["data"]; run(id: string, action: Exclude<ModerationAction, "submitted">): Promise<void> }) {
  const journal = data.journals.find((item) => item.id === report.targetId);
  const reporter = data.profiles.find((item) => item.id === report.reporterProfileId);
  return <article className="moderation-item">
    <header><div><span className={`status-badge status-${report.status}`}>{statusLabel(report.status, ja)}</span><h2>{journal?.title ?? (ja ? "対象投稿なし" : "Post unavailable")}</h2><p>{reasonLabel(report.reason, ja)}</p></div><Clock3 size={20} aria-hidden="true" /></header>
    {report.details && <blockquote>{report.details}</blockquote>}
    <dl><div><dt>{ja ? "通報者" : "Reporter"}</dt><dd>{reporter?.displayName ?? (ja ? "不明" : "Unknown")}</dd></div><div><dt>{ja ? "受付日時" : "Submitted"}</dt><dd>{new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}</dd></div><div><dt>{ja ? "履歴" : "Events"}</dt><dd>{report.events.length}</dd></div></dl>
    <div className="moderation-actions">{report.status === "submitted" && <><button type="button" className="primary-action" disabled={working} onClick={() => run(report.id, "start_review")}>{ja ? "確認を開始" : "Start review"}</button><button type="button" className="secondary-action" disabled={working} onClick={() => run(report.id, "close_no_action")}>{ja ? "問題なしで終了" : "Close without action"}</button></>}{report.status === "under_review" && <><button type="button" className="secondary-action" disabled={working} onClick={() => run(report.id, "request_correction")}>{ja ? "修正を依頼" : "Request correction"}</button><button type="button" className="danger-action" disabled={working} onClick={() => run(report.id, "hide_temporarily")}><EyeOff size={16} />{ja ? "一時非公開" : "Hide temporarily"}</button><button type="button" className="secondary-action" disabled={working} onClick={() => run(report.id, "close_no_action")}>{ja ? "問題なしで終了" : "Close without action"}</button></>}{report.status === "action_requested" && <button type="button" className="secondary-action" disabled={working} onClick={() => run(report.id, "start_review")}><RotateCcw size={16} />{ja ? "再確認" : "Review again"}</button>}{report.status === "temporarily_hidden" && <button type="button" className="primary-action" disabled={working} onClick={() => run(report.id, "restore_content")}><RotateCcw size={16} />{ja ? "公開状態へ戻して終了" : "Restore and close"}</button>}{journal && <Link href={`/journal/${journal.id}`} className="text-link">{ja ? "対象を確認" : "View post"}</Link>}</div>
    <details className="moderation-history"><summary>{ja ? "操作履歴を表示" : "Show action history"}</summary><ol>{report.events.map((event) => <li key={event.id}><span>{actionLabel(event.action, ja)}</span><time>{new Intl.DateTimeFormat(ja ? "ja-JP" : "en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(event.createdAt))}</time></li>)}</ol></details>
  </article>;
}

function reasonLabel(reason: ContentReportReason, ja: boolean) { const labels: Record<ContentReportReason, [string, string]> = { personal_information: ["個人情報・プライバシー", "Personal information or privacy"], dangerous_claim: ["危険な断定・誤解を招く整備情報", "Dangerous or misleading maintenance claim"], harassment: ["嫌がらせ・誹謗中傷", "Harassment or abuse"], copyright: ["無断転載・権利侵害", "Copyright or rights concern"], spam: ["スパム・宣伝", "Spam or promotion"], other: ["その他", "Other"] }; return labels[reason][ja ? 0 : 1]; }
function statusLabel(status: ContentReport["status"], ja: boolean) { const labels: Record<ContentReport["status"], [string, string]> = { submitted: ["受付", "Submitted"], under_review: ["確認中", "Under review"], action_requested: ["修正依頼中", "Correction requested"], temporarily_hidden: ["一時非公開", "Temporarily hidden"], closed_no_action: ["終了", "Closed"] }; return labels[status][ja ? 0 : 1]; }
function actionLabel(action: ModerationAction, ja: boolean) { const labels: Record<ModerationAction, [string, string]> = { submitted: ["通報受付", "Report submitted"], start_review: ["確認開始", "Review started"], request_correction: ["修正依頼", "Correction requested"], hide_temporarily: ["一時非公開", "Temporarily hidden"], close_no_action: ["問題なしで終了", "Closed without action"], restore_content: ["復元して終了", "Restored and closed"] }; return labels[action][ja ? 0 : 1]; }
