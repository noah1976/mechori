"use client";

import {
  maintenanceRecordDateLabel,
  type Locale,
  type MaintenanceRecord,
} from "@mechori/core";
import { ArrowUpRight, Gauge } from "lucide-react";
import Link from "next/link";
import { HazardBadge, ResolutionBadge, VisibilityBadge } from "./status-badges";

export function recordTitle(record: MaintenanceRecord, locale: Locale): string {
  return record.demoTranslation?.[locale] ?? record.summary;
}

export function recordOdometerLabel(record: MaintenanceRecord, locale: Locale): string {
  return record.odometerReading
    ? `${record.odometerReading.displayedValue.toLocaleString()} ${record.odometerReading.unit}`
    : locale === "ja"
      ? "走行距離未記録"
      : "Odometer not recorded";
}

export function recordReasonLabel(record: MaintenanceRecord, locale: Locale): string {
  const reason = record.symptoms.trim();

  if (reason) return reason;

  return locale === "ja"
    ? "症状・依頼内容の記録なし"
    : "No symptoms or request recorded";
}

export function RecordCard({ record, locale }: { record: MaintenanceRecord; locale: Locale }) {
  return (
    <Link href={`/records/${record.id}`} className="record-card">
      <div className="record-card-topline">
        <span>{maintenanceRecordDateLabel(record, locale)}</span>
        {record.isDemo && <span className="demo-label">DEMO</span>}
      </div>
      <h3>{recordTitle(record, locale)}</h3>
      <p className="record-excerpt">{recordReasonLabel(record, locale)}</p>
      <div className="record-meta">
        <span><Gauge size={15} />{recordOdometerLabel(record, locale)}</span>
        {record.actions.length > 1 && <span>{locale === "ja" ? `${record.actions.length}作業` : `${record.actions.length} actions`}</span>}
      </div>
      <div className="badge-row">
        <ResolutionBadge value={record.resolutionStatus} locale={locale} />
        <VisibilityBadge value={record.visibility} locale={locale} />
        <HazardBadge level={record.hazardLevel} />
      </div>
      <ArrowUpRight className="card-arrow" size={18} aria-hidden="true" />
    </Link>
  );
}
