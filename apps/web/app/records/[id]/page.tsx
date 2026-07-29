"use client";

import {
  recordOdometerLabel,
  recordReasonLabel,
  recordTitle,
} from "@/components/record-card";
import { HazardBadge, ResolutionBadge, VerificationBadge, VisibilityBadge } from "@/components/status-badges";
import { useApp } from "@/lib/app-context";
import { maintenanceRecordDateKey, maintenanceRecordDateLabel } from "@mechori/core";
import { AlertTriangle, ArrowLeft, FilePenLine, Gauge, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, locale } = useApp();
  const record = data.records.find((item) => item.id === id);
  const vehicle = data.vehicles.find((item) => item.id === record?.vehicleId);
  const ja = locale === "ja";
  if (!record) return <div className="empty-state"><h1>{ja ? "記録が見つかりません" : "Record not found"}</h1><Link href="/records" className="secondary-action">{ja ? "履歴へ戻る" : "Back to history"}</Link></div>;
  const odometerReading = record.odometerReading;
  const odometerEpisode = odometerReading ? vehicle?.odometerEpisodes.find(
    (episode) => episode.id === odometerReading.episodeId,
  ) : undefined;
  const meterChangeLabel =
    odometerEpisode &&
    odometerEpisode.reason !== "initial" &&
    odometerEpisode.startedAt === maintenanceRecordDateKey(record)
      ? episodeReasonLabel(odometerEpisode.reason, ja)
      : undefined;

  return (
    <div className="page-stack narrow-page">
      <Link href="/records" className="back-link"><ArrowLeft size={17} />{ja ? "整備履歴" : "Maintenance history"}</Link>
      <header className="detail-header">
        <div className="record-card-topline"><span>{maintenanceRecordDateLabel(record, locale)}</span>{record.isDemo && <span className="demo-label">DEMO</span>}</div>
        <h1>{recordTitle(record, locale)}</h1>
        <div className="detail-summary"><span><Gauge size={16} />{recordOdometerLabel(record, locale)}</span><span>{record.matchScope}</span>{meterChangeLabel && <span>{meterChangeLabel}</span>}</div>
        <div className="badge-row"><ResolutionBadge value={record.resolutionStatus} locale={locale} /><VisibilityBadge value={record.visibility} locale={locale} /><HazardBadge level={record.hazardLevel} /><VerificationBadge value={record.verificationStatus} locale={locale} /></div>
        <Link href={`/records/${record.id}/edit`} className="secondary-action"><FilePenLine size={17} />{ja ? "編集" : "Edit"}</Link>
      </header>

      {record.hazardLevel === "CRITICAL" && <div className="critical-warning" role="alert"><AlertTriangle size={22} /><div><strong>{ja ? "安全に関わる可能性がある参考情報です" : "This reference may involve safety-critical systems"}</strong><p>{ja ? "実車の診断結果ではありません。作業を進めず、メーカー資料と専門整備工場へ確認してください。" : "This is not a diagnosis. Do not proceed based on this record alone; consult manufacturer material and a qualified workshop."}</p></div></div>}

      {odometerReading?.sequenceAssessment === "needs_context" && <div className="context-notice"><Gauge size={20} /><div><strong>{ja ? "表示値が前回より小さい記録です" : "This reading is lower than the previous one"}</strong><p>{ja ? "メーター交換・修理・入力時期などの背景確認が必要な状態です。虚偽や誤りとは判定していません。" : "Meter replacement, repair, or record timing may explain it. This is not classified as false or incorrect."}</p></div></div>}

      <section className="knowledge-flow">
        <DetailBlock number="01" title={ja ? "入庫のきっかけ・症状" : "Reason for visit and symptoms"} value={recordReasonLabel(record, locale)} />
      </section>

      <section className="action-list" aria-labelledby="actions-heading">
        <div className="section-heading"><div><span className="eyebrow">ACTIONS</span><h2 id="actions-heading">{ja ? `実施作業 ${record.actions.length}件` : `${record.actions.length} recorded actions`}</h2></div></div>
        {record.actions.map((action, index) => <article className="action-detail" key={action.id}>
          <header><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{action.summary}</h3><div className="badge-row"><ResolutionBadge value={action.resolutionStatus} locale={locale} /><HazardBadge level={action.hazardLevel} /></div></div></header>
          <dl>
            <div><dt>{ja ? "原因候補" : "Possible causes"}</dt><dd>{action.causeCandidates}</dd></div>
            <div><dt>{ja ? "確認した箇所" : "Checks performed"}</dt><dd>{action.checksPerformed}</dd></div>
            <div><dt>{ja ? "実施した作業" : "Work performed"}</dt><dd>{action.workPerformed}</dd></div>
            <div><dt>{ja ? "結果" : "Result"}</dt><dd>{action.result}</dd></div>
            {action.parts.length > 0 && <div><dt>{ja ? "部品" : "Parts"}</dt><dd>{action.parts.map((part) => [part.name, part.manufacturer, part.partNumber].filter(Boolean).join(" / ")).join(", ")}</dd></div>}
          </dl>
        </article>)}
      </section>

      <section className="detail-band">
        <div><span className="eyebrow">SOURCE</span><h2>{ja ? "出典と確認状態" : "Source and verification"}</h2><p>{record.sourceType === "demo" ? (ja ? "操作確認用に作成されたDEMOデータ" : "DEMO data created for interaction testing") : `${ja ? "オーナー自身の記録" : "Owner-provided record"} · ${evidenceBasisLabel(record.evidenceBasis, ja)}`}</p></div>
        <ShieldCheck size={30} />
      </section>

      <p className="legal-note">{ja ? "MECHORIは整備書、診断機器、専門家の代替ではなく、情報の正確性・適合性・作業結果を保証しません。" : "MECHORI does not replace service manuals, diagnostic equipment, or qualified professionals, and does not guarantee accuracy, fitment, or repair outcomes."}</p>
    </div>
  );
}

function DetailBlock({ number, title, value }: { number: string; title: string; value: string }) {
  return <article><span>{number}</span><div><h2>{title}</h2><p>{value}</p></div></article>;
}

function episodeReasonLabel(reason: string, ja: boolean) {
  const labels: Record<string, [string, string]> = {
    replacement: ["メーター交換", "Odometer replaced"],
    repair: ["メーター修理", "Odometer repaired"],
    reset: ["メーターリセット", "Odometer reset"],
    rollover: ["メーター桁あふれ", "Odometer rollover"],
    unit_change: ["表示単位変更", "Odometer unit changed"],
    unknown: ["メーター変更", "Odometer changed"],
  };
  return (labels[reason] ?? ["メーター変更", "Odometer changed"])[ja ? 0 : 1];
}

function evidenceBasisLabel(value: string, ja: boolean): string {
  const labels: Record<string, [string, string]> = {
    contemporaneous: ["作業当時に記録", "recorded at the time"],
    invoice_or_receipt: ["明細・領収書に基づく", "based on an invoice or receipt"],
    photo_or_service_book: ["写真・整備記録簿に基づく", "based on photos or a service book"],
    recalled_later: ["記憶をもとに後から登録", "recalled and added later"],
    unknown: ["情報源不明", "source unknown"],
  };
  const label = labels[value] ?? labels.unknown!;
  return ja ? label[0] : label[1];
}
