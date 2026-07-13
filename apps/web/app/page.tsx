"use client";

import { DemoNotice } from "@/components/demo-notice";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { translate } from "@mechory/i18n";
import { ArrowRight, BookOpenText, CarFront, Plus, Search, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function HomePage() {
  const { data, locale } = useApp();
  const vehicle = data.vehicles[0];
  const recent = [...data.records].sort((a, b) => b.serviceDate.localeCompare(a.serviceDate)).slice(0, 3);
  const unresolved = data.records.filter((record) => record.resolutionStatus === "unresolved").length;
  const [query, setQuery] = useState("");
  const router = useRouter();
  const ja = locale === "ja";

  function search(event: FormEvent) {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  if (!vehicle) return null;

  return (
    <div className="page-stack">
      <DemoNotice />
      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">VEHICLE KNOWLEDGE, KEPT USEFUL</span>
          <h1>{ja ? "困ったとき、同じクルマの記録から探せる。" : "When something feels wrong, start with records from cars like yours."}</h1>
          <p>{ja ? "整備記録を残し、出典と確認状態を見ながら、同型車の事例を安全に探すためのローカルプロトタイプです。" : "A local prototype for recording maintenance and finding comparable cases with source and verification context."}</p>
          <form className="hero-search" onSubmit={search}>
            <Search size={20} aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ja ? "症状・作業・部品名で検索" : "Search symptoms, work, or parts"} aria-label={translate(locale, "search")} />
            <button type="submit" aria-label={translate(locale, "search")}><ArrowRight size={20} /></button>
          </form>
          <div className="hero-actions">
            <Link href="/records/new" className="primary-action"><Plus size={18} />{translate(locale, "addRecord")}</Link>
            <Link href="/search" className="secondary-action"><BookOpenText size={18} />{translate(locale, "search")}</Link>
          </div>
        </div>
        <Link href="/garage" className="vehicle-feature">
          <Image src={vehicle.imagePath} alt={ja ? "DEMO用の汎用ロードスター" : "Generic demo roadster"} fill priority sizes="(max-width: 900px) 100vw, 45vw" />
          <div className="vehicle-overlay">
            <span className="demo-label">DEMO VEHICLE</span>
            <h2>{vehicle.make} {vehicle.model}</h2>
            <p>{vehicle.year} · {vehicle.engine} · {vehicle.transmission}</p>
          </div>
        </Link>
      </section>

      <section className="metric-band" aria-label={ja ? "車両概要" : "Vehicle summary"}>
        <div><CarFront size={20} /><span><strong>{data.records.length}</strong>{ja ? "登録記録" : "records"}</span></div>
        <div><ShieldCheck size={20} /><span><strong>{data.records.filter((record) => record.verificationStatus === "owner_confirmed").length}</strong>{ja ? "オーナー確認" : "owner confirmed"}</span></div>
        <div><BookOpenText size={20} /><span><strong>{unresolved}</strong>{ja ? "未解決" : "unresolved"}</span></div>
      </section>

      <section>
        <div className="section-heading">
          <div><span className="eyebrow">RECENT</span><h2>{translate(locale, "recentRecords")}</h2></div>
          <Link href="/records" className="text-link">{ja ? "すべて見る" : "View all"}<ArrowRight size={16} /></Link>
        </div>
        <div className="record-grid">{recent.map((record) => <RecordCard key={record.id} record={record} locale={locale} />)}</div>
      </section>
    </div>
  );
}
