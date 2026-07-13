"use client";

import { recordTitle } from "@/components/record-card";
import { HazardBadge, ResolutionBadge, VerificationBadge, VisibilityBadge } from "@/components/status-badges";
import { useApp } from "@/lib/app-context";
import { AlertTriangle, ArrowLeft, FilePenLine, Gauge, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function RecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, locale } = useApp();
  const record = data.records.find((item) => item.id === id);
  const ja = locale === "ja";
  if (!record) return <div className="empty-state"><h1>{ja ? "記録が見つかりません" : "Record not found"}</h1><Link href="/records" className="secondary-action">{ja ? "履歴へ戻る" : "Back to history"}</Link></div>;

  return (
    <div className="page-stack narrow-page">
      <Link href="/records" className="back-link"><ArrowLeft size={17} />{ja ? "整備履歴" : "Maintenance history"}</Link>
      <header className="detail-header">
        <div className="record-card-topline"><span>{record.serviceDate}</span>{record.isDemo && <span className="demo-label">DEMO</span>}</div>
        <h1>{recordTitle(record, locale)}</h1>
        <div className="detail-summary"><span><Gauge size={16} />{record.odometerKm.toLocaleString()} km</span><span>{record.matchScope}</span></div>
        <div className="badge-row"><ResolutionBadge value={record.resolutionStatus} locale={locale} /><VisibilityBadge value={record.visibility} locale={locale} /><HazardBadge level={record.hazardLevel} /><VerificationBadge value={record.verificationStatus} locale={locale} /></div>
        <Link href={`/records/${record.id}/edit`} className="secondary-action"><FilePenLine size={17} />{ja ? "編集" : "Edit"}</Link>
      </header>

      {record.hazardLevel === "CRITICAL" && <div className="critical-warning" role="alert"><AlertTriangle size={22} /><div><strong>{ja ? "安全に関わる可能性がある参考情報です" : "This reference may involve safety-critical systems"}</strong><p>{ja ? "実車の診断結果ではありません。作業を進めず、メーカー資料と専門整備工場へ確認してください。" : "This is not a diagnosis. Do not proceed based on this record alone; consult manufacturer material and a qualified workshop."}</p></div></div>}

      <section className="knowledge-flow">
        <DetailBlock number="01" title={ja ? "確認した症状" : "Observed symptoms"} value={record.symptoms} />
        <DetailBlock number="02" title={ja ? "原因候補" : "Possible causes"} value={record.causeCandidates} />
        <DetailBlock number="03" title={ja ? "確認した箇所" : "Checks performed"} value={record.checksPerformed} />
        <DetailBlock number="04" title={ja ? "実施した作業" : "Work performed"} value={record.workPerformed} />
        <DetailBlock number="05" title={ja ? "結果" : "Result"} value={record.result} />
      </section>

      <section className="detail-band">
        <div><span className="eyebrow">SOURCE</span><h2>{ja ? "出典と確認状態" : "Source and verification"}</h2><p>{record.sourceType === "demo" ? (ja ? "操作確認用に作成されたDEMOデータ" : "DEMO data created for interaction testing") : (ja ? "オーナー自身の記録" : "Owner-provided record")}</p></div>
        <ShieldCheck size={30} />
      </section>

      <p className="legal-note">{ja ? "MECHORYは整備書、診断機器、専門家の代替ではなく、情報の正確性・適合性・作業結果を保証しません。" : "MECHORY does not replace service manuals, diagnostic equipment, or qualified professionals, and does not guarantee accuracy, fitment, or repair outcomes."}</p>
    </div>
  );
}

function DetailBlock({ number, title, value }: { number: string; title: string; value: string }) {
  return <article><span>{number}</span><div><h2>{title}</h2><p>{value}</p></div></article>;
}
