"use client";

import { DemoNotice } from "@/components/demo-notice";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { filterRecords, type HazardLevel, type ResolutionStatus } from "@mechory/core";
import { translate } from "@mechory/i18n";
import { Search } from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

function SearchContent() {
  const params = useSearchParams();
  const { data, locale } = useApp();
  const [keyword, setKeyword] = useState(params.get("q") ?? "");
  const [symptom, setSymptom] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [resolution, setResolution] = useState<ResolutionStatus | "all">("all");
  const [hazard, setHazard] = useState<HazardLevel | "all">("all");
  const ja = locale === "ja";
  const results = useMemo(() => filterRecords(data.records, { keyword, symptom, partNumber, resolutionStatus: resolution, hazardLevel: hazard }), [data.records, keyword, symptom, partNumber, resolution, hazard]);

  return <div className="page-stack"><DemoNotice /><header className="page-header"><div><span className="eyebrow">KNOWLEDGE SEARCH</span><h1>{translate(locale, "search")}</h1><p>{ja ? "検索範囲と確認状態を見ながら、参考事例を探します。" : "Find reference cases while keeping match scope and verification visible."}</p></div></header>
    <section className="search-panel">
      <label className="search-main"><Search size={20} /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={ja ? "キーワード" : "Keyword"} /></label>
      <div className="filter-grid">
        <label><span>{ja ? "症状" : "Symptom"}</span><input value={symptom} onChange={(e) => setSymptom(e.target.value)} /></label>
        <label><span>{ja ? "部品番号" : "Part number"}</span><input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} /></label>
        <label><span>{ja ? "結果" : "Result"}</span><select value={resolution} onChange={(e) => setResolution(e.target.value as ResolutionStatus | "all")}><option value="all">{ja ? "すべて" : "All"}</option><option value="resolved">{ja ? "解決済み" : "Resolved"}</option><option value="unresolved">{ja ? "未解決" : "Unresolved"}</option></select></label>
        <label><span>{ja ? "危険度" : "Hazard"}</span><select value={hazard} onChange={(e) => setHazard(e.target.value as HazardLevel | "all")}><option value="all">ALL</option><option value="LOW">LOW</option><option value="CAUTION">CAUTION</option><option value="CRITICAL">CRITICAL</option></select></label>
      </div>
      <p className="search-scope">{ja ? "対象車両：FIAT Barchetta 1997 / 1.8 16V（DEMO）" : "Vehicle scope: FIAT Barchetta 1997 / 1.8 16V (DEMO)"}</p>
    </section>
    <section><div className="section-heading"><div><span className="eyebrow">{results.length} RESULTS</span><h2>{ja ? "一致した記録" : "Matching records"}</h2></div></div>{results.length ? <div className="record-grid wide">{results.map((record) => <RecordCard key={record.id} record={record} locale={locale} />)}</div> : <div className="empty-state"><Search size={28} /><h3>{ja ? "一致する記録がありません" : "No matching records"}</h3><p>{translate(locale, "noResults")}</p></div>}</section>
  </div>;
}

export default function SearchPage() {
  return <Suspense fallback={<div className="page-stack" />}> <SearchContent /> </Suspense>;
}
