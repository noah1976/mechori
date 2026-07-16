"use client";

import type { Locale, MaintenanceRecord } from "@mechori/core";
import { ArrowUpRight, Gauge } from "lucide-react";
import Link from "next/link";
import { HazardBadge, ResolutionBadge, VisibilityBadge } from "./status-badges";

export function recordTitle(record: MaintenanceRecord, locale: Locale): string {
  return record.demoTranslation?.[locale] ?? record.summary;
}

export function RecordCard({ record, locale }: { record: MaintenanceRecord; locale: Locale }) {
  return (
    <Link href={`/records/${record.id}`} className="record-card">
      <div className="record-card-topline">
        <span>{record.serviceDate}</span>
        {record.isDemo && <span className="demo-label">DEMO</span>}
      </div>
      <h3>{recordTitle(record, locale)}</h3>
      <p className="record-excerpt">{record.symptoms}</p>
      <div className="record-meta">
        <span><Gauge size={15} />{record.odometerReading.displayedValue.toLocaleString()} {record.odometerReading.unit}</span>
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
