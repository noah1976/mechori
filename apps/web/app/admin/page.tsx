"use client";

import {
  grantAlphaOwnerPlus,
  loadAlphaAdminAuditLogs,
  loadAlphaAdminDashboard,
  loadAlphaAdminFeedback,
  loadAlphaAdminUsers,
  revokeAlphaEntitlement,
  setAlphaStaffRole,
  updateAlphaAdminFeedback,
  type AlphaAdminDashboard,
  type AlphaAdminAuditLog,
  type AlphaAdminFeedback,
  type AlphaAdminUser,
  type AlphaFeedbackStatus,
} from "@/lib/alpha-operations";
import {
  buildFeedbackReviewMarkdown,
  createFeedbackExportFilename,
  filterAdminFeedback,
  type FeedbackExportFilter,
  type FeedbackExportKind,
} from "@/lib/feedback-export";
import { useApp } from "@/lib/app-context";
import { BookOpenText, Building2, CarFront, CheckCircle2, Copy, Download, Gauge, History, LoaderCircle, MessageSquareText, Search, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const feedbackStatuses: AlphaFeedbackStatus[] = ["new", "reviewing", "planned", "resolved", "closed"];
const feedbackKinds: FeedbackExportKind[] = ["liked", "confusing", "broken", "missing", "other"];
const staffRoles = ["admin", "moderator", "support"] as const;
const initialFeedbackFilter: FeedbackExportFilter = { query: "", kind: "all", status: "all", from: "", to: "" };

function feedbackKindLabel(kind: FeedbackExportKind, ja: boolean) {
  const labels: Record<FeedbackExportKind, [string, string]> = {
    liked: ["良かった", "Liked"],
    confusing: ["迷った", "Confusing"],
    broken: ["動かなかった", "Broken"],
    missing: ["欲しい", "Missing"],
    other: ["その他", "Other"],
  };
  return labels[kind][ja ? 0 : 1];
}

function feedbackStatusLabel(status: AlphaFeedbackStatus, ja: boolean) {
  const labels: Record<AlphaFeedbackStatus, [string, string]> = {
    new: ["未確認", "Unreviewed"],
    reviewing: ["確認済み", "Reviewed"],
    planned: ["対応中", "In progress"],
    resolved: ["完了", "Completed"],
    closed: ["保留", "On hold"],
  };
  return labels[status][ja ? 0 : 1];
}

function auditActionLabel(action: string, ja: boolean) {
  const labels: Record<string, [string, string]> = {
    feedback_updated: ["フィードバック対応を更新", "Updated feedback response"],
    entitlement_granted: ["Owner Plus利用権を付与", "Granted Owner Plus access"],
    entitlement_revoked: ["無償利用権を停止", "Revoked complimentary access"],
    staff_role_changed: ["運営ロールを変更", "Changed staff role"],
  };
  return labels[action]?.[ja ? 0 : 1] ?? action;
}

function auditDetailLabel(detail: Record<string, unknown>, ja: boolean) {
  const reason = typeof detail.reason === "string" ? detail.reason.trim() : "";
  if (reason) return `${ja ? "理由" : "Reason"}: ${reason}`;
  const adminNote = typeof detail.adminNote === "string" ? detail.adminNote.trim() : "";
  if (adminNote) return `${ja ? "運営メモ" : "Admin note"}: ${adminNote}`;
  if (typeof detail.roleCode === "string") {
    return `${detail.roleCode}: ${detail.enabled === true ? (ja ? "付与" : "granted") : (ja ? "解除" : "removed")}`;
  }
  if (typeof detail.status === "string") return `${ja ? "状態" : "Status"}: ${detail.status}`;
  if (typeof detail.planCode === "string") return `${ja ? "プラン" : "Plan"}: ${detail.planCode}`;
  return "";
}

export default function AdminPage() {
  const { locale } = useApp();
  const [dashboard, setDashboard] = useState<AlphaAdminDashboard | null>(null);
  const [feedback, setFeedback] = useState<AlphaAdminFeedback[]>([]);
  const [users, setUsers] = useState<AlphaAdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AlphaAdminAuditLog[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable" | "error">("loading");
  const [busyKey, setBusyKey] = useState("");
  const [actionMessage, setActionMessage] = useState<"" | "saved" | "failed">("");
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackExportFilter>(initialFeedbackFilter);
  const [exportMessage, setExportMessage] = useState<"" | "copied" | "copy-failed" | "downloaded">("");
  const [userQuery, setUserQuery] = useState("");
  const [grantReasons, setGrantReasons] = useState<Record<string, string>>({});
  const [grantEnds, setGrantEnds] = useState<Record<string, string>>({});
  const ja = locale === "ja";
  const visibleFeedback = useMemo(() => filterAdminFeedback(feedback, feedbackFilter), [feedback, feedbackFilter]);
  const normalizedUserQuery = userQuery.trim().toLocaleLowerCase();
  const visibleUsers = normalizedUserQuery
    ? users.filter((user) => `${user.displayName} ${user.publicUsername ?? ""}`.toLocaleLowerCase().includes(normalizedUserQuery))
    : users;

  function updateFeedbackFilter(patch: Partial<FeedbackExportFilter>) {
    setFeedbackFilter((current) => ({ ...current, ...patch }));
    setExportMessage("");
  }

  function getFeedbackMarkdown() {
    return buildFeedbackReviewMarkdown(visibleFeedback, feedbackFilter);
  }

  async function copyFeedbackMarkdown() {
    if (!visibleFeedback.length) return;
    try {
      if (!navigator.clipboard) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(getFeedbackMarkdown());
      setExportMessage("copied");
    } catch {
      setExportMessage("copy-failed");
    }
  }

  function downloadFeedbackMarkdown() {
    if (!visibleFeedback.length) return;
    const blob = new Blob([getFeedbackMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = createFeedbackExportFilename();
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setExportMessage("downloaded");
  }

  async function refresh() {
    setState("loading");
    try {
      const [nextDashboard, nextFeedback, nextUsers, nextAuditLogs] = await Promise.all([
        loadAlphaAdminDashboard(),
        loadAlphaAdminFeedback(),
        loadAlphaAdminUsers(),
        loadAlphaAdminAuditLogs(),
      ]);
      if (!nextDashboard) {
        setState("unavailable");
        return;
      }
      setDashboard(nextDashboard);
      setFeedback(nextFeedback);
      setUsers(nextUsers);
      setAuditLogs(nextAuditLogs);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    let active = true;
    Promise.all([
      loadAlphaAdminDashboard(),
      loadAlphaAdminFeedback(),
      loadAlphaAdminUsers(),
      loadAlphaAdminAuditLogs(),
    ]).then(([nextDashboard, nextFeedback, nextUsers, nextAuditLogs]) => {
      if (!active) return;
      if (!nextDashboard) {
        setState("unavailable");
        return;
      }
      setDashboard(nextDashboard);
      setFeedback(nextFeedback);
      setUsers(nextUsers);
      setAuditLogs(nextAuditLogs);
      setState("ready");
    }).catch(() => {
      if (active) setState("error");
    });
    return () => { active = false; };
  }, []);

  if (state !== "ready" || !dashboard) {
    return (
      <div className="empty-state" role={state === "loading" ? "status" : undefined}>
        {state === "loading" ? <LoaderCircle className="spin" size={30} aria-hidden="true" /> : <ShieldCheck size={30} aria-hidden="true" />}
        <h1>{state === "loading" ? (ja ? "運営画面を確認中" : "Loading operations") : state === "unavailable" ? (ja ? "この画面を利用する権限がありません" : "You do not have access to this page") : (ja ? "運営情報を読み込めませんでした" : "Operations data could not be loaded")}</h1>
        {state === "error" && <button type="button" className="secondary-action" onClick={() => void refresh()}>{ja ? "再読み込み" : "Reload"}</button>}
      </div>
    );
  }

  return (
    <div className="page-stack admin-page">
      <header className="page-header">
        <div><span className="eyebrow">ALPHA OPERATIONS</span><h1>{ja ? "MECHORI運営" : "MECHORI operations"}</h1><p>{ja ? "α版の反応、参加者、無償権限をここで確認します。" : "Review alpha feedback, participants, and complimentary access."}</p></div>
        <div className="page-header-actions"><Link href="/admin/professional" className="secondary-action"><Building2 size={18} />{ja ? "事業者管理" : "Professional organizations"}</Link><Gauge size={30} aria-hidden="true" /></div>
      </header>

      {actionMessage && (
        <p className={actionMessage === "saved" ? "form-success" : "form-error"} role={actionMessage === "saved" ? "status" : "alert"}>
          {actionMessage === "saved"
            ? (ja ? "変更を保存しました。" : "Changes saved.")
            : (ja ? "変更を保存できませんでした。内容を保ったまま、もう一度お試しください。" : "Changes could not be saved. Your input is still here; please try again.")}
        </p>
      )}

      <section className="admin-summary" aria-label={ja ? "運営サマリー" : "Operations summary"}>
        <div><UsersRound size={20} /><span>{ja ? "参加者" : "Members"}</span><strong>{dashboard.activeUsers}</strong></div>
        <div><CarFront size={20} /><span>{ja ? "登録車両" : "Vehicles"}</span><strong>{dashboard.registeredVehicles}</strong></div>
        <div><BookOpenText size={20} /><span>{ja ? "愛車の記録" : "Journal posts"}</span><strong>{dashboard.journalPosts}</strong></div>
        <div><MessageSquareText size={20} /><span>{ja ? "新着フィードバック" : "New feedback"}</span><strong>{dashboard.newFeedback}</strong></div>
        <div><CheckCircle2 size={20} /><span>Owner Plus</span><strong>{dashboard.activeOwnerPlus}</strong></div>
        <div><Gauge size={20} /><span>{ja ? "公開記録" : "Shared records"}</span><strong>{dashboard.sharedJournals}</strong></div>
      </section>

      <section className="admin-section">
        <header><div><span className="eyebrow">FEEDBACK</span><h2>{ja ? "フィードバック" : "Feedback"}</h2></div></header>
        <div className="admin-feedback-filters">
          <label className="admin-filter"><Search size={17} aria-hidden="true" /><span className="sr-only">{ja ? "フィードバックを検索" : "Search feedback"}</span><input value={feedbackFilter.query} onChange={(event) => updateFeedbackFilter({ query: event.target.value })} placeholder={ja ? "内容・送信者・ページを検索" : "Search feedback"} /></label>
          <label className="field"><span>{ja ? "種別" : "Type"}</span><select value={feedbackFilter.kind} onChange={(event) => updateFeedbackFilter({ kind: event.target.value as FeedbackExportFilter["kind"] })}><option value="all">{ja ? "すべて" : "All"}</option>{feedbackKinds.map((kind) => <option key={kind} value={kind}>{feedbackKindLabel(kind, ja)}</option>)}</select></label>
          <label className="field"><span>{ja ? "対応状態" : "Status"}</span><select value={feedbackFilter.status} onChange={(event) => updateFeedbackFilter({ status: event.target.value as FeedbackExportFilter["status"] })}><option value="all">{ja ? "すべて" : "All"}</option>{feedbackStatuses.map((status) => <option key={status} value={status}>{feedbackStatusLabel(status, ja)}</option>)}</select></label>
          <label className="field"><span>{ja ? "開始日" : "From"}</span><input type="date" value={feedbackFilter.from} onChange={(event) => updateFeedbackFilter({ from: event.target.value })} /></label>
          <label className="field"><span>{ja ? "終了日" : "To"}</span><input type="date" value={feedbackFilter.to} onChange={(event) => updateFeedbackFilter({ to: event.target.value })} /></label>
        </div>
        <div className="admin-feedback-export">
          <span aria-live="polite">{ja ? `対象 ${visibleFeedback.length}件` : `${visibleFeedback.length} matching feedback`}</span>
          <div className="admin-feedback-export-actions">
            <button type="button" className="secondary-action" disabled={!visibleFeedback.length} onClick={() => void copyFeedbackMarkdown()}><Copy size={16} aria-hidden="true" />{ja ? "GPT用に一括コピー" : "Copy for GPT"}</button>
            <button type="button" className="secondary-action" disabled={!visibleFeedback.length} onClick={downloadFeedbackMarkdown}><Download size={16} aria-hidden="true" />{ja ? "Markdownをダウンロード" : "Download Markdown"}</button>
          </div>
        </div>
        {exportMessage && <p className={exportMessage === "copy-failed" ? "form-error" : "form-success"} role={exportMessage === "copy-failed" ? "alert" : "status"}>{exportMessage === "copied" ? (ja ? `${visibleFeedback.length}件のフィードバックをGPT用Markdownとしてコピーしました。` : `Copied ${visibleFeedback.length} feedback items as Markdown for GPT.`) : exportMessage === "copy-failed" ? (ja ? "コピーできませんでした。Markdownをダウンロードしてください。" : "Copy failed. Please download the Markdown instead.") : (ja ? "Markdownをダウンロードしました。" : "Markdown downloaded.")}</p>}
        {visibleFeedback.length ? <div className="admin-feedback-list">{visibleFeedback.map((item) => (
          <article key={item.id}>
            <div><strong>{item.displayName}</strong><small>{item.kind} · {new Date(item.createdAt).toLocaleString(locale)}</small></div>
            <p>{item.content}</p>
            {item.pagePath && <small>{item.pagePath} {item.appBuild && `· ${item.appBuild}`}</small>}
            <label className="field"><span>{ja ? "対応状態" : "Status"}</span><select value={item.status} onChange={(event) => setFeedback((current) => current.map((row) => row.id === item.id ? { ...row, status: event.target.value as AlphaFeedbackStatus } : row))}>{feedbackStatuses.map((status) => <option key={status} value={status}>{feedbackStatusLabel(status, ja)}</option>)}</select></label>
            <label className="field"><span>{ja ? "運営メモ" : "Admin note"}</span><textarea value={item.adminNote} maxLength={4000} onChange={(event) => setFeedback((current) => current.map((row) => row.id === item.id ? { ...row, adminNote: event.target.value } : row))} /></label>
            <button type="button" className="secondary-action" disabled={busyKey === item.id} onClick={async () => { setBusyKey(item.id); setActionMessage(""); try { await updateAlphaAdminFeedback(item.id, item.status, item.adminNote); setActionMessage("saved"); } catch { setActionMessage("failed"); } finally { setBusyKey(""); } }}>{busyKey === item.id && <LoaderCircle className="spin" size={16} />}{ja ? "対応内容を保存" : "Save response"}</button>
          </article>
        ))}</div> : <p className="settings-help">{ja ? "フィードバックはまだありません。" : "No feedback yet."}</p>}
      </section>

      <section className="admin-section">
        <header><div><span className="eyebrow">PARTICIPANTS</span><h2>{ja ? "参加者と権限" : "Participants and access"}</h2></div></header>
        <label className="admin-filter"><Search size={17} aria-hidden="true" /><input value={userQuery} onChange={(event) => setUserQuery(event.target.value)} placeholder={ja ? "表示名・@usernameを検索" : "Search name or @username"} /></label>
        <div className="admin-user-list">{visibleUsers.map((user) => (
          <article key={user.userId}>
            <div><strong>{user.displayName}</strong><small>{user.publicUsername ? `@${user.publicUsername} · ` : ""}{user.phase} · {user.membershipStatus} · {ja ? `車両${user.registeredVehicles}台／記録${user.journalPosts}件` : `${user.registeredVehicles} vehicles / ${user.journalPosts} posts`}</small></div>
            <strong className="admin-plan-label">{user.planCode}{user.entitlementSource ? ` · ${user.entitlementSource}` : ""}{user.entitlementEndsAt ? ` · ${new Date(user.entitlementEndsAt).toLocaleDateString(locale)}` : ""}</strong>
            {dashboard.isAdmin && <div className="admin-user-actions">
              <label className="field"><span>{ja ? "付与・変更理由" : "Reason for access or role change"}</span><input value={grantReasons[user.userId] ?? ""} maxLength={1000} onChange={(event) => setGrantReasons((current) => ({ ...current, [user.userId]: event.target.value }))} placeholder={ja ? "例：Founding Tester協力" : "e.g. Founding Tester contribution"} /></label>
              {user.planCode !== "owner_plus" && <label className="field"><span>{ja ? "終了日（空欄は無期限）" : "End date (blank means indefinite)"}</span><input type="date" value={grantEnds[user.userId] ?? ""} onChange={(event) => setGrantEnds((current) => ({ ...current, [user.userId]: event.target.value }))} /></label>}
              {user.planCode !== "owner_plus" && <button type="button" className="secondary-action" disabled={Boolean(busyKey) || !(grantReasons[user.userId]?.trim())} onClick={async () => { setBusyKey(`plan-${user.userId}`); setActionMessage(""); try { await grantAlphaOwnerPlus(user.userId, grantReasons[user.userId]!, "founding_tester", grantEnds[user.userId] ? new Date(`${grantEnds[user.userId]}T23:59:59+09:00`).toISOString() : undefined); await refresh(); setActionMessage("saved"); } catch { setActionMessage("failed"); } finally { setBusyKey(""); } }}>{ja ? "Founding TesterとしてOwner Plusを付与" : "Grant Owner Plus as Founding Tester"}</button>}
              {user.activeEntitlementId && <button type="button" className="danger-button" disabled={Boolean(busyKey) || !(grantReasons[user.userId]?.trim())} onClick={async () => { setBusyKey(`revoke-${user.userId}`); setActionMessage(""); try { await revokeAlphaEntitlement(user.activeEntitlementId!, grantReasons[user.userId]!); await refresh(); setActionMessage("saved"); } catch { setActionMessage("failed"); } finally { setBusyKey(""); } }}>{ja ? "無償利用権を停止" : "Revoke access grant"}</button>}
              {staffRoles.map((role) => {
                const enabled = user.staffRoles.includes(role);
                return <button key={role} type="button" className={enabled ? "follow-button is-following" : "follow-button"} aria-pressed={enabled} disabled={Boolean(busyKey) || !(grantReasons[user.userId]?.trim())} onClick={async () => { setBusyKey(`${role}-${user.userId}`); setActionMessage(""); try { await setAlphaStaffRole(user.userId, role, !enabled, grantReasons[user.userId]!); await refresh(); setActionMessage("saved"); } catch { setActionMessage("failed"); } finally { setBusyKey(""); } }}>{role}</button>;
              })}
            </div>}
          </article>
        ))}</div>
      </section>

      {dashboard.isAdmin && <section className="admin-section">
        <header><div><span className="eyebrow">AUDIT HISTORY</span><h2>{ja ? "運営操作の変更履歴" : "Operations audit history"}</h2></div><History size={24} aria-hidden="true" /></header>
        {auditLogs === null ? (
          <p className="settings-help">{ja ? "変更履歴の表示準備中です。既存の運営機能は引き続き利用できます。" : "Audit-history display is being prepared. Existing operations remain available."}</p>
        ) : auditLogs.length ? (
          <div className="admin-audit-list">{auditLogs.map((item) => {
            const detail = auditDetailLabel(item.detail, ja);
            return <article key={item.id}>
              <History size={17} aria-hidden="true" />
              <div>
                <strong>{auditActionLabel(item.action, ja)}</strong>
                <p>{item.actorDisplayName} → {item.targetDisplayName}</p>
                {detail && <small>{detail}</small>}
              </div>
              <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString(locale)}</time>
            </article>;
          })}</div>
        ) : <p className="settings-help">{ja ? "記録された運営操作はまだありません。" : "No privileged operations have been recorded yet."}</p>}
      </section>}
    </div>
  );
}
