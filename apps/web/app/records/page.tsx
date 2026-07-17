"use client";

import { DemoNotice } from "@/components/demo-notice";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { translate } from "@mechori/i18n";
import { CarFront, Plus } from "lucide-react";
import Link from "next/link";

export default function RecordsPage() {
  const { data, locale } = useApp();
  const ja = locale === "ja";
  const records = [...data.records].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
  const hasVehicle = data.vehicles.some((vehicle) => vehicle.ownerProfileId === data.currentProfileId);
  return (
    <div className="page-stack">
      <DemoNotice />
      <header className="page-header">
        <div><span className="eyebrow">MAINTENANCE HISTORY</span><h1>{translate(locale, "records")}</h1><p>{ja ? "1回の整備機会と、その中で行った作業を記録します。" : "Track each service event and the work performed within it."}</p></div>
        <Link href={hasVehicle ? "/records/new" : "/garage/new"} className="primary-action">
          {hasVehicle ? <Plus size={18} /> : <CarFront size={18} />}
          {hasVehicle ? translate(locale, "addRecord") : ja ? "先に愛車を登録" : "Add a vehicle first"}
        </Link>
      </header>
      {records.length ? (
        <div className="record-grid wide">{records.map((record) => <RecordCard key={record.id} record={record} locale={locale} />)}</div>
      ) : (
        <div className="empty-state">
          <CarFront size={32} aria-hidden="true" />
          <h2>{hasVehicle ? (ja ? "整備記録はまだありません" : "No maintenance records yet") : (ja ? "まず愛車を登録してください" : "Add your vehicle first")}</h2>
          <p>{hasVehicle ? (ja ? "整備日、走行距離、分かっている事実だけを残せます。" : "Record the service date, odometer, and only the facts you know.") : (ja ? "整備履歴は登録した愛車ごとに保存されます。" : "Maintenance history is stored for each registered vehicle.")}</p>
        </div>
      )}
    </div>
  );
}
