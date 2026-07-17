"use client";

import { RecordForm } from "@/components/record-form";
import { useApp } from "@/lib/app-context";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function NewRecordContent() {
  const { locale } = useApp();
  const params = useSearchParams();
  const vehicleId = params.get("vehicle") ?? undefined;
  const ja = locale === "ja";
  return (
    <div className="page-stack narrow-page">
      <header className="page-header"><div><span className="eyebrow">NEW PRIVATE RECORD</span><h1>{ja ? "整備記録を追加" : "Add maintenance record"}</h1><p>{ja ? "分からない項目は推測せず、分かる範囲だけ記録してください。" : "Record only what you know; do not guess missing details."}</p></div></header>
      <RecordForm vehicleId={vehicleId} />
    </div>
  );
}

export default function NewRecordPage() {
  return <Suspense fallback={<div className="page-stack narrow-page" />}><NewRecordContent /></Suspense>;
}
