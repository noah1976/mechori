"use client";

import { DemoNotice } from "@/components/demo-notice";
import { OwnerSearch } from "@/components/owner-search";
import { RecordCard } from "@/components/record-card";
import { KnowledgeSynthesisPanel } from "@/components/knowledge-synthesis-panel";
import { useApp } from "@/lib/app-context";
import { buildKnowledgeSynthesis, demoKnowledgeCases, filterKnowledgeCasesByText, filterRecords, type HazardLevel, type ResolutionStatus } from "@mechori/core";
import { translate } from "@mechori/i18n";
import { FilePlus2, LoaderCircle, Search } from "lucide-react";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

type SearchCriteria = {
  keyword: string;
  symptom: string;
  partNumber: string;
  resolution: ResolutionStatus | "all";
  hazard: HazardLevel | "all";
  revision: number;
};

function SearchContent() {
  const params = useSearchParams();
  const { data, locale, signedIn, recordEngagement } = useApp();
  const [keyword, setKeyword] = useState(params.get("q") ?? "");
  const [symptom, setSymptom] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [resolution, setResolution] = useState<ResolutionStatus | "all">("all");
  const [hazard, setHazard] = useState<HazardLevel | "all">("all");
  const [submittedCriteria, setSubmittedCriteria] = useState<SearchCriteria>(() => ({
    keyword: params.get("q") ?? "",
    symptom: "",
    partNumber: "",
    resolution: "all",
    hazard: "all",
    revision: 0,
  }));
  const [hasSubmitted, setHasSubmitted] = useState(() => Boolean(params.get("q")?.trim()));
  const [isPending, startTransition] = useTransition();
  const ja = locale === "ja";
  const initialQueryTracked = useRef(false);
  useEffect(() => {
    if (!initialQueryTracked.current && params.get("q")?.trim()) {
      recordEngagement("knowledge_searched");
      initialQueryTracked.current = true;
    }
  }, [params, recordEngagement]);
  const { results, knowledgeMatches, searchError } = useMemo(() => {
    if (!hasSubmitted) return { results: [], knowledgeMatches: [], searchError: false };
    try {
      const knowledgeQuery = `${submittedCriteria.keyword} ${submittedCriteria.symptom}`.trim();
      return {
        results: signedIn
          ? filterRecords(data.records, {
            keyword: submittedCriteria.keyword,
            symptom: submittedCriteria.symptom,
            partNumber: submittedCriteria.partNumber,
            resolutionStatus: submittedCriteria.resolution,
            hazardLevel: submittedCriteria.hazard,
          })
          : [],
        knowledgeMatches: knowledgeQuery ? filterKnowledgeCasesByText(demoKnowledgeCases, knowledgeQuery) : [],
        searchError: false,
      };
    } catch {
      return { results: [], knowledgeMatches: [], searchError: true };
    }
  }, [data.records, hasSubmitted, signedIn, submittedCriteria]);
  const knowledgeSynthesis = useMemo(
    () => buildKnowledgeSynthesis(knowledgeMatches),
    [knowledgeMatches],
  );
  const hasResults = results.length > 0 || knowledgeMatches.length > 0;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    const nextCriteria: SearchCriteria = {
      keyword: keyword.trim(),
      symptom: symptom.trim(),
      partNumber: partNumber.trim(),
      resolution,
      hazard,
      revision: 0,
    };
    startTransition(() => {
      setSubmittedCriteria(nextCriteria);
      setHasSubmitted(true);
    });
  }

  return <div className="page-stack"><DemoNotice /><header className="page-header"><div><span className="eyebrow">KNOWLEDGE SEARCH</span><h1>{translate(locale, "search")}</h1><p>{ja ? "同型車の公開事例から、報告されている原因候補、確認箇所、対応例を出典つきで整理します。" : "MECHORI reads matching posts and records together, then organizes reported checks and responses with source links."}</p></div></header>
    <OwnerSearch />
    <form className="search-panel" onSubmit={submit} aria-busy={isPending}>
      <label className="search-main"><Search size={20} /><input type="search" aria-label={ja ? "検索キーワード" : "Search keyword"} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={ja ? "キーワード" : "Keyword"} /></label>
      <div className="filter-grid">
        <label><span>{ja ? "症状" : "Symptom"}</span><input value={symptom} onChange={(e) => setSymptom(e.target.value)} /></label>
        <label><span>{ja ? "部品番号" : "Part number"}</span><input value={partNumber} onChange={(e) => setPartNumber(e.target.value)} /></label>
        <label><span>{ja ? "結果" : "Result"}</span><select value={resolution} onChange={(e) => setResolution(e.target.value as ResolutionStatus | "all")}><option value="all">{ja ? "すべて" : "All"}</option><option value="resolved">{ja ? "解決済み" : "Resolved"}</option><option value="unresolved">{ja ? "未解決" : "Unresolved"}</option></select></label>
        <label><span>{ja ? "危険度" : "Hazard"}</span><select value={hazard} onChange={(e) => setHazard(e.target.value as HazardLevel | "all")}><option value="all">ALL</option><option value="LOW">LOW</option><option value="CAUTION">CAUTION</option><option value="CRITICAL">CRITICAL</option></select></label>
      </div>
      <p className="search-scope">{ja ? "対象車両：FIAT Barchetta 1997 / 1.8 16V（DEMO）" : "Vehicle scope: FIAT Barchetta 1997 / 1.8 16V (DEMO)"}</p>
      <button type="submit" className="primary-action search-submit" disabled={isPending}>
        {isPending ? <LoaderCircle className="loading-spinner" size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
        {isPending ? (ja ? "検索中…" : "Searching…") : (ja ? "この条件で探す" : "Search with these conditions")}
      </button>
    </form>
    {hasSubmitted && searchError ? (
      <section className="empty-state search-result-state" role="alert">
        <Search size={28} />
        <h2>{ja ? "検索結果を取得できませんでした" : "Search results could not be loaded"}</h2>
        <button type="button" className="secondary-action" onClick={() => setSubmittedCriteria((criteria) => ({ ...criteria, revision: criteria.revision + 1 }))}>{ja ? "もう一度試す" : "Try again"}</button>
      </section>
    ) : hasSubmitted ? (
      <>
        <KnowledgeSynthesisPanel synthesis={knowledgeSynthesis} locale={locale} />
        {!hasResults && <section className="empty-state search-result-state">
          <Search size={28} />
          <h2>{ja ? "条件に合う公開事例は見つかりませんでした" : "No shared examples matched these conditions"}</h2>
          <p>{ja ? "同じ経験をした人のために、あなたの記録を残すこともできます。" : "You can leave a record for someone with the same experience."}</p>
          <Link href="/journal/new" className="secondary-action"><FilePlus2 size={18} aria-hidden="true" />{ja ? "この内容を記録する" : "Record this experience"}</Link>
        </section>}
        {signedIn && results.length > 0 && <section><div className="section-heading"><div><span className="eyebrow">YOUR PRIVATE RECORDS · {results.length}</span><h2>{ja ? "自分の整備記録から一致" : "Matches in your own records"}</h2></div></div><div className="record-grid wide">{results.map((record) => <RecordCard key={record.id} record={record} locale={locale} />)}</div></section>}
      </>
    ) : null}
  </div>;
}

export default function SearchPage() {
  return <Suspense fallback={<div className="page-stack" />}> <SearchContent /> </Suspense>;
}
