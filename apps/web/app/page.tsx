"use client";

import { DemoNotice } from "@/components/demo-notice";
import { JournalCard } from "@/components/journal-card";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { getFollowingFeed } from "@mechory/core";
import { translate } from "@mechory/i18n";
import {
  ArrowRight,
  BookOpenText,
  CarFront,
  FileInput,
  Plus,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function HomePage() {
  const { data, locale } = useApp();
  const vehicle = data.vehicles[0];
  const recent = [...data.records]
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
    .slice(0, 2);
  const feed = getFollowingFeed(data).slice(0, 2);
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

      <section className="home-workspace">
        <div className="home-search-panel">
          <span className="eyebrow">YOUR GARAGE TODAY</span>
          <h1>{ja ? "記録する。探す。続きを読む。" : "Record it. Find it. Follow the story."}</h1>
          <p>
            {ja
              ? "整備の事実は履歴へ、その日の経験は自分の言葉でJournalへ。"
              : "Keep maintenance facts in history and the experience in your own journal."}
          </p>
          <form className="home-search" onSubmit={search}>
            <Search size={20} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={ja ? "症状・作業・部品名で検索" : "Search symptoms, work, or parts"}
              aria-label={translate(locale, "search")}
            />
            <button type="submit" aria-label={translate(locale, "search")}>
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </form>
          <div className="home-action-grid">
            <Link href="/records/new">
              <Plus size={20} aria-hidden="true" />
              <span>
                <strong>{translate(locale, "addRecord")}</strong>
                <small>{ja ? "整備の事実を定型で残す" : "Keep structured maintenance facts"}</small>
              </span>
            </Link>
            <Link href="/journal/new">
              <BookOpenText size={20} aria-hidden="true" />
              <span>
                <strong>{translate(locale, "addJournal")}</strong>
                <small>{ja ? "自分の言葉で自由に書く" : "Write freely in your own words"}</small>
              </span>
            </Link>
            <Link href="/import">
              <FileInput size={20} aria-hidden="true" />
              <span>
                <strong>{ja ? "記録を取り込む" : "Import records"}</strong>
                <small>{ja ? "現在は確認DEMOのみ" : "Review demo only for now"}</small>
              </span>
            </Link>
          </div>
        </div>

        <Link href="/garage" className="home-vehicle-panel">
          <Image
            src={vehicle.imagePath}
            alt={ja ? "DEMO用の汎用ロードスター" : "Generic demo roadster"}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 38vw"
          />
          <div>
            <span className="demo-label">DEMO VEHICLE</span>
            <h2>
              {vehicle.make} {vehicle.model}
            </h2>
            <p>
              {vehicle.year} · {vehicle.engine} · {vehicle.transmission}
            </p>
            <span className="vehicle-panel-meta">
              <CarFront size={16} aria-hidden="true" />
              {data.records.length} {ja ? "件の整備記録" : "maintenance records"}
            </span>
          </div>
        </Link>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">FOLLOWING</span>
            <h2>{ja ? "気になるクルマの続き" : "Stories you follow"}</h2>
          </div>
          <Link href="/feed" className="text-link">
            {ja ? "フィードを見る" : "View feed"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="journal-grid">
          {feed.map((journal) => (
            <JournalCard
              key={journal.id}
              journal={journal}
              author={data.profiles.find(
                (profile) => profile.id === journal.authorProfileId,
              )}
              record={data.records.find(
                (record) => record.id === journal.linkedRecordId,
              )}
              locale={locale}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">PRIVATE HISTORY</span>
            <h2>{translate(locale, "recentRecords")}</h2>
          </div>
          <Link href="/records" className="text-link">
            {ja ? "すべて見る" : "View all"}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="record-grid home-record-grid">
          {recent.map((record) => (
            <RecordCard key={record.id} record={record} locale={locale} />
          ))}
        </div>
      </section>
    </div>
  );
}
