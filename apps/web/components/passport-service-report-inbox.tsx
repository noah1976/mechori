"use client";

import { useApp } from "@/lib/app-context";
import {
  createEmptyPassportServiceItem,
  defaultPassportServiceReportSummary,
  dismissPassportServiceReport,
  loadMyPassportServiceReports,
  markPassportServiceReportAccepted,
  PASSPORT_REPORT_TEXT_LIMIT,
  PASSPORT_SERVICE_ITEM_LIMIT,
  toPassportServiceReportConfirmation,
  validatePassportServiceReportDraft,
  type PassportServiceReport,
  type PassportServiceItemDraft,
} from "@/lib/passport-service-reports";
import { PassportServiceItemEditor } from "@/components/passport-service-item-editor";
import type { PrototypeOdometerUnit, ResolutionStatus } from "@mechori/core";
import { CheckCircle2, Inbox, LoaderCircle, Plus, RefreshCw, Save, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

export function PassportServiceReportInbox({ vehicleId }: { vehicleId: string }) {
  const [reports, setReports] = useState<PassportServiceReport[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [addedRecordId, setAddedRecordId] = useState<string>();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    void loadMyPassportServiceReports().then(
      (nextReports) => {
        if (!active) return;
        setReports(nextReports);
        setState("ready");
      },
      () => { if (active) setState("error"); },
    );
    return () => { active = false; };
  }, []);

  async function retry() {
    setState("loading");
    try {
      setReports(await loadMyPassportServiceReports());
      setState("ready");
    } catch {
      setState("error");
    }
  }

  const pending = reports.filter((report) => report.vehicleId === vehicleId && report.status === "pending");
  if (state === "loading" && pending.length === 0) return null;
  if (state === "error") {
    return (
      <section className="passport-report-inbox is-error">
        <p>届いた整備記録を確認できませんでした。</p>
        <button className="secondary-action" type="button" onClick={() => void retry()}><RefreshCw size={16} />もう一度試す</button>
      </section>
    );
  }
  if (pending.length === 0 && !addedRecordId && !dismissed) return null;

  return (
    <section className="passport-report-inbox" aria-labelledby="passport-report-inbox-heading">
      {addedRecordId && (
        <div className="passport-history-added" role="status">
          <CheckCircle2 size={23} aria-hidden="true" />
          <div><strong>整備記録を履歴に追加しました</strong><p>愛車の整備履歴に保存されています。</p></div>
          <Link className="primary-action" href={`/garage?vehicle=${encodeURIComponent(vehicleId)}&record=${encodeURIComponent(addedRecordId)}`}>ガレージで見る</Link>
        </div>
      )}
      {dismissed && !addedRecordId && <p className="passport-report-dismissed" role="status">今回は履歴に追加しませんでした。</p>}
      {pending.length > 0 && (
        <>
          <div className="passport-report-inbox-heading">
            <Inbox size={22} aria-hidden="true" />
            <div><h2 id="passport-report-inbox-heading">整備記録が{pending.length}件届いています</h2><p>共有リンクから届いた内容です。確認してから履歴へ追加できます。</p></div>
          </div>
          <div className="passport-report-list">
            {pending.map((report) => (
              <PassportServiceReportReview
                key={report.id}
                report={report}
                vehicleId={vehicleId}
                onAccepted={(recordId) => {
                  setReports((current) => current.map((item) => item.id === report.id ? { ...item, status: "accepted", acceptedRecordId: recordId } : item));
                  setAddedRecordId(recordId);
                  setDismissed(false);
                }}
                onDismissed={() => {
                  setReports((current) => current.map((item) => item.id === report.id ? { ...item, status: "dismissed" } : item));
                  setDismissed(true);
                  setAddedRecordId(undefined);
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function PassportServiceReportReview({
  report,
  vehicleId,
  onAccepted,
  onDismissed,
}: {
  report: PassportServiceReport;
  vehicleId: string;
  onAccepted(recordId: string): void;
  onDismissed(): void;
}) {
  const { savePassportServiceReportToHistory } = useApp();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [summary, setSummary] = useState(() => defaultPassportServiceReportSummary(report));
  const [serviceDate, setServiceDate] = useState(report.serviceDate);
  const [odometerValue, setOdometerValue] = useState(report.odometerValue);
  const [odometerUnit, setOdometerUnit] = useState<PrototypeOdometerUnit>(report.odometerUnit);
  const [serviceItems, setServiceItems] = useState<PassportServiceItemDraft[]>(
    () => report.serviceItems.map((item) => ({ ...item })),
  );
  const [visitNotes, setVisitNotes] = useState(report.visitNotes);
  const [resolutionStatus, setResolutionStatus] = useState<ResolutionStatus>("unresolved");

  async function accept(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const validation = validatePassportServiceReportDraft({
      serviceDate,
      odometerValue,
      odometerUnit,
      workshopName: report.workshopName,
      visitNotes,
      serviceItems,
    });
    if (!summary.trim() || summary.trim().length > 120 || !validation.valid) {
      setError("入力内容を確認してください。記録の見出しは必須です。");
      return;
    }
    setSaving(true);
    setError(undefined);
    try {
      const record = await savePassportServiceReportToHistory(
        vehicleId,
        toPassportServiceReportConfirmation(report, {
          summary: summary.trim(),
          serviceDate,
          odometerValue,
          odometerUnit,
          visitNotes,
          items: serviceItems,
          resolutionStatus,
        }),
      );
      await markPassportServiceReportAccepted(report.id, record.id);
      onAccepted(record.id);
    } catch {
      setError("履歴へ追加できませんでした。通信を確認して、もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  async function dismiss() {
    if (saving) return;
    setSaving(true);
    setError(undefined);
    try {
      await dismissPassportServiceReport(report.id);
      onDismissed();
    } catch {
      setError("変更できませんでした。もう一度お試しください。");
      setConfirmDismiss(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="passport-report-item">
      <div className="passport-report-summary">
        <div><span>{formatReceivedAt(report.submittedAt)}</span><h3>{defaultPassportServiceReportSummary(report)}</h3>{report.workshopName && <p>入力された工場名: {report.workshopName}</p>}</div>
        <button className="secondary-action" type="button" onClick={() => setOpen((value) => !value)}>{open ? "閉じる" : "内容を確認する"}</button>
      </div>
      {open && (
        <form className="passport-report-review" onSubmit={accept} noValidate>
          <p className="passport-report-review-note">届いた内容を確認し、必要なら直してから履歴へ追加します。</p>
          <label className="field"><span>記録の見出し</span><input required maxLength={120} value={summary} onChange={(event) => setSummary(event.target.value)} /></label>
          <div className="workshop-report-date-row">
            <label className="field"><span>作業日 <small>未入力でも保存できます</small></span><input type="date" value={serviceDate} onChange={(event) => setServiceDate(event.target.value)} /></label>
            <label className="field"><span>作業時の走行距離</span><input type="number" min="0" max="1000000000" inputMode="numeric" value={odometerValue} onChange={(event) => setOdometerValue(event.target.value)} /></label>
            <label className="field workshop-report-unit"><span>単位</span><select value={odometerUnit} onChange={(event) => setOdometerUnit(event.target.value as PrototypeOdometerUnit)}><option value="km">km</option><option value="mi">mi</option><option value="unknown">不明</option></select></label>
          </div>
          <div className="service-item-list" aria-label="届いた整備項目">
            {serviceItems.map((item, index) => (
              <PassportServiceItemEditor
                key={item.id}
                item={item}
                index={index}
                canRemove={serviceItems.length > 1}
                onChange={(nextItem) => setServiceItems((current) => current.map((value) => value.id === item.id ? nextItem : value))}
                onRemove={() => setServiceItems((current) => current.filter((value) => value.id !== item.id))}
              />
            ))}
          </div>
          <button className="service-item-add secondary-action" type="button" disabled={serviceItems.length >= PASSPORT_SERVICE_ITEM_LIMIT} onClick={() => setServiceItems((current) => [...current, createEmptyPassportServiceItem()])}>
            <Plus size={17} aria-hidden="true" />整備項目を追加
          </button>
          <ReviewTextarea label="全体の補足" value={visitNotes} onChange={setVisitNotes} />
          <label className="field"><span>作業後の状態</span><select value={resolutionStatus} onChange={(event) => setResolutionStatus(event.target.value as ResolutionStatus)}><option value="unresolved">未確認・経過確認中</option><option value="resolved">完了</option></select></label>
          <details className="passport-report-original">
            <summary>届いた内容（原文）</summary>
            <OriginalReport report={report} />
          </details>
          {error && <p className="form-error-summary" role="alert">{error}</p>}
          {confirmDismiss ? (
            <div className="passport-report-dismiss-confirm" role="alert">
              <p>この記録を履歴へ追加せず閉じますか？</p>
              <div><button className="secondary-action" type="button" disabled={saving} onClick={() => setConfirmDismiss(false)}>戻る</button><button className="text-danger-action" type="button" disabled={saving} onClick={() => void dismiss()}><X size={16} />追加しない</button></div>
            </div>
          ) : (
            <div className="form-actions">
              <button className="text-danger-action" type="button" disabled={saving} onClick={() => setConfirmDismiss(true)}>今回は追加しない</button>
              <button className="primary-action" type="submit" disabled={saving}>{saving ? <LoaderCircle className="spin" size={17} /> : <Save size={17} />}{saving ? "保存中" : "履歴に追加"}</button>
            </div>
          )}
        </form>
      )}
    </article>
  );
}

function ReviewTextarea({ label, value, onChange }: { label: string; value: string; onChange(value: string): void }) {
  return <label className="field"><span>{label}</span><textarea rows={3} maxLength={PASSPORT_REPORT_TEXT_LIMIT} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function OriginalReport({ report }: { report: PassportServiceReport }) {
  const visitMetadataRows = [
    ["工場名（入力値）", report.workshopName],
    ["作業日", report.serviceDate],
    ["走行距離", report.odometerValue ? `${report.odometerValue} ${report.odometerUnit === "unknown" ? "" : report.odometerUnit}`.trim() : ""],
  ].filter(([, value]) => value);
  if (report.legacySubmission) {
    const legacyRows = [
      ["確認したこと", report.legacySubmission.inspectionNotes],
      ["実施した作業", report.legacySubmission.workPerformed],
      ["使用した部品", report.legacySubmission.partsUsed],
      ["結果", report.legacySubmission.resultNotes],
      ["補足", report.legacySubmission.otherNotes],
    ].filter(([, value]) => value);
    return <dl>{[...visitMetadataRows, ...legacyRows].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
  }
  const visitRows = report.visitNotes
    ? [...visitMetadataRows, ["全体の補足", report.visitNotes]]
    : visitMetadataRows;
  return (
    <div className="passport-report-original-content">
      {visitRows.length > 0 && <dl>{visitRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
      <div className="passport-report-original-items">
        {report.serviceItems.map((item, index) => (
          <section key={item.id}>
            <strong>整備項目 {index + 1}: {item.subject}</strong>
            <dl>
              {[
                ["どうなっていた？", item.observedCondition],
                ["何をした？", item.workPerformed],
                ["交換・使用した部品", item.partsUsed],
                ["作業後どうなった？", item.result],
                ["次に気をつけること", item.followUpNote],
              ].filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

function formatReceivedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "受信日時不明";
  return `${new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(date)} 受信`;
}
