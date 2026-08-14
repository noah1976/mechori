"use client";

import { DemoNotice } from "@/components/demo-notice";
import {
  recordOdometerLabel,
  recordReasonLabel,
} from "@/components/record-card";
import { WorkshopIntroductionActions } from "@/components/workshop-introduction-actions";
import { useApp } from "@/lib/app-context";
import {
  displayVehicleModel,
  getPreferredVehicle,
  maintenanceRecordDateKey,
  maintenanceRecordDateLabel,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { ArrowLeft, CircleAlert, Gauge, Printer, ShieldAlert, Wrench } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ServiceBriefContent() {
  const { data, locale, isRemoteAlpha } = useApp();
  const params = useSearchParams();
  const vehicle = data.vehicles.find((item) => item.id === params.get("vehicle")) ?? getPreferredVehicle(data.vehicles);
  const ja = locale === "ja";
  if (!vehicle) return null;
  const vehicleModel = displayVehicleModel(vehicle, locale);

  const records = data.records
    .filter((record) => record.vehicleId === vehicle.id)
    .sort((left, right) =>
      maintenanceRecordDateKey(right).localeCompare(maintenanceRecordDateKey(left)));
  const unresolved = records.filter((record) => record.resolutionStatus === "unresolved");

  return (
    <div className="page-stack service-brief-page">
      <div className="print-hidden"><DemoNotice /></div>
      <div className="service-brief-toolbar print-hidden">
        <Link href={`/garage/history?vehicle=${encodeURIComponent(vehicle.id)}`} className="back-link"><ArrowLeft size={17} />{ja ? "履歴サマリーへ戻る" : "Back to history summary"}</Link>
        <button type="button" className="primary-action" onClick={() => window.print()}><Printer size={17} />{translate(locale, "printBrief")}</button>
      </div>

      <header className="service-brief-header">
        <div><span className="eyebrow">MECHORI VEHICLE HISTORY · {isRemoteAlpha ? "OWNER-RECORDED" : "DEMO"}</span><h1>{translate(locale, "serviceBrief")}</h1><p>{translate(locale, "serviceBriefIntro")}</p></div>
        <div className="service-brief-vehicle"><strong>{vehicle.make} {vehicleModel}</strong><span>{[vehicle.year, vehicle.engine, vehicle.transmission, vehicle.steering].filter(Boolean).join(" · ") || (ja ? "仕様未登録" : "Specifications not set")}</span></div>
      </header>

      <section className="service-brief-facts" aria-label={ja ? "車両情報" : "Vehicle information"}>
        <div><Gauge size={20} /><span><small>{ja ? "現在のメーター表示" : "Current odometer"}</small><strong>{vehicle.currentOdometerReading.displayedValue.toLocaleString()} {vehicle.currentOdometerReading.unit}</strong></span></div>
        <div><Wrench size={20} /><span><small>{ja ? "記録済みの整備イベント" : "Recorded maintenance visits"}</small><strong>{records.length}</strong></span></div>
        <div><CircleAlert size={20} /><span><small>{ja ? "未解決・要追記" : "Unresolved follow-ups"}</small><strong>{unresolved.length}</strong></span></div>
      </section>

      <aside className="service-brief-notice"><ShieldAlert size={22} /><p>{translate(locale, "ownerReportedNotice")}</p></aside>

      <section>
        <div className="section-heading"><div><span className="eyebrow">OPEN ITEMS</span><h2>{ja ? "未解決・確認したいこと" : "Unresolved and follow-up items"}</h2></div></div>
        {unresolved.length ? <div className="brief-open-items">{unresolved.map((record) => <article key={record.id}><span>{maintenanceRecordDateLabel(record, locale)}</span><div><h3>{record.summary}</h3><p>{recordReasonLabel(record, locale)}</p></div><span className="badge resolution-unresolved">{translate(locale, "unresolved")}</span></article>)}</div> : <p className="legal-note">{ja ? "未解決として記録された項目はありません。実車に問題がないことを保証する表示ではありません。" : "No item is recorded as unresolved. This does not guarantee that the vehicle has no issues."}</p>}
      </section>

      <section>
        <div className="section-heading"><div><span className="eyebrow">MAINTENANCE HISTORY</span><h2>{translate(locale, "records")}</h2></div></div>
        <div className="brief-history-list">
          {records.map((record) => (
            <article key={record.id}>
              <header><div><time>{maintenanceRecordDateLabel(record, locale)}</time><h3>{record.summary}</h3></div><span>{recordOdometerLabel(record, locale)}</span></header>
              <ul>{record.actions.map((action) => <li key={action.id}><strong>{action.summary}</strong><span>{action.workPerformed || (ja ? "作業内容の記録なし" : "No work details recorded")}</span><small>{action.result || (ja ? "結果の記録なし" : "No result recorded")}</small></li>)}</ul>
            </article>
          ))}
          {records.length === 0 && (
            <p className="legal-note">
              {ja
                ? "この車両には、まだ整備記録がありません。工場へ伝えたい過去の整備や症状を追加すると、ここへまとまります。"
                : "This vehicle has no maintenance records yet. Past work and symptoms you add will be collected here for a workshop."}
            </p>
          )}
        </div>
      </section>

      <section className="workshop-introduction print-hidden">
        <div>
          <span className="eyebrow">MECHORI PROFESSIONAL</span>
          <h2>{translate(locale, "workshopIntroductionTitle")}</h2>
          <p>{translate(locale, "workshopIntroductionBody")}</p>
        </div>
        <WorkshopIntroductionActions locale={locale} />
      </section>

      <p className="service-brief-footer">
        MECHORI · Fix. Share. Drive on. · {isRemoteAlpha ? (ja ? "ALPHA / オーナー記録" : "ALPHA / OWNER-RECORDED") : "DEMO / SAMPLE"}
      </p>
    </div>
  );
}

export default function ServiceBriefPage() {
  return <Suspense fallback={<div className="page-stack service-brief-page" />}><ServiceBriefContent /></Suspense>;
}
