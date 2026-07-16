"use client";

import { DemoNotice } from "@/components/demo-notice";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { translate } from "@mechori/i18n";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function RecordsPage() {
  const { data, locale } = useApp();
  const ja = locale === "ja";
  const records = [...data.records].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
  return (
    <div className="page-stack">
      <DemoNotice />
      <header className="page-header">
        <div><span className="eyebrow">MAINTENANCE HISTORY</span><h1>{translate(locale, "records")}</h1><p>{ja ? "1回の整備機会と、その中で行った作業を記録します。" : "Track each service event and the work performed within it."}</p></div>
        <Link href="/records/new" className="primary-action"><Plus size={18} />{translate(locale, "addRecord")}</Link>
      </header>
      <div className="record-grid wide">{records.map((record) => <RecordCard key={record.id} record={record} locale={locale} />)}</div>
    </div>
  );
}
