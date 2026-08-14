"use client";

import { DemoNotice } from "@/components/demo-notice";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { maintenanceRecordDateKey } from "@mechori/core";
import { translate } from "@mechori/i18n";
import { CarFront, Plus } from "lucide-react";
import Link from "next/link";

export default function RecordsPage() {
  const { data, locale } = useApp();
  const records = [...data.records].sort((a, b) =>
    maintenanceRecordDateKey(b).localeCompare(maintenanceRecordDateKey(a)));
  const hasVehicle = data.vehicles.some((vehicle) => vehicle.ownerProfileId === data.currentProfileId);
  return (
    <div className="page-stack">
      <DemoNotice />
      <header className="page-header">
        <div><span className="eyebrow">MAINTENANCE HISTORY</span><h1>{translate(locale, "records")}</h1><p>{translate(locale, "recordsIntro")}</p></div>
        <Link href={hasVehicle ? "/records/new" : "/garage/new"} className="primary-action">
          {hasVehicle ? <Plus size={18} /> : <CarFront size={18} />}
          {translate(locale, hasVehicle ? "addRecord" : "addVehicleFirstAction")}
        </Link>
      </header>
      {records.length ? (
        <div className="record-grid wide">{records.map((record) => <RecordCard key={record.id} record={record} locale={locale} />)}</div>
      ) : (
        <div className="empty-state">
          <CarFront size={32} aria-hidden="true" />
          <h2>{translate(locale, hasVehicle ? "noMaintenanceRecords" : "addVehicleFirstHeading")}</h2>
          <p>{translate(locale, hasVehicle ? "recordKnownFacts" : "recordsStoredPerVehicle")}</p>
        </div>
      )}
    </div>
  );
}
