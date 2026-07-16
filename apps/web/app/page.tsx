"use client";

import { DemoNotice } from "@/components/demo-notice";
import { JournalCard } from "@/components/journal-card";
import { JournalMedia } from "@/components/journal-media";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { getFollowingFeed } from "@mechori/core";
import { translate } from "@mechori/i18n";
import {
  ArrowRight,
  BookOpenText,
  Heart,
  Search,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function HomePage() {
  const { data, locale } = useApp();
  const vehicle = data.vehicles[0];
  const recent = [...data.records]
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
    .slice(0, 2);
  const allFeed = getFollowingFeed(data);
  const featuredJournal = allFeed.find((journal) => journal.media.length > 0) ?? allFeed[0];
  const feed = allFeed.filter((journal) => journal.id !== featuredJournal?.id).slice(0, 2);
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

      <section className="home-community-stage">
        <div className="home-community-intro">
          <span className="eyebrow">TODAY IN THE GARAGE</span>
          <h1>{ja ? "壊れた日も、また走れた日も。" : "Breakdowns and the drives after them."}</h1>
          <p>
            {ja
              ? "路上で止まった話さえ、同じクルマを好きな誰かが読みたくなる。愛車との続きを、写真と言葉で残そう。"
              : "Even a roadside breakdown becomes a story another owner wants to read. Keep the next chapter in words and pictures."}
          </p>
          <div className="home-community-actions">
            <Link href="/journal/new" className="primary-action">
              <BookOpenText size={19} aria-hidden="true" />
              {ja ? "今日のことを書く" : "Write today's story"}
            </Link>
            <Link href="/records/new" className="secondary-action">
              <Wrench size={18} aria-hidden="true" />
              {ja ? "整備記録だけ残す" : "Maintenance record only"}
            </Link>
          </div>
          <form className="home-knowledge-prompt" onSubmit={search}>
            <Search size={20} aria-hidden="true" />
            <div>
              <small>{ja ? "みんなの経験から調べる" : "Search shared experience"}</small>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ja ? "こんな症状があるんだけど…" : "My car is doing this…"} aria-label={translate(locale, "search")} />
            </div>
            <button type="submit" aria-label={translate(locale, "search")}><ArrowRight size={20} aria-hidden="true" /></button>
          </form>
        </div>

        {featuredJournal && (
          <Link href={`/journal/${featuredJournal.id}`} className="home-featured-journal">
            <JournalMedia attachments={featuredJournal.media} locale={locale} compact priority />
            <div className="home-featured-copy">
              <span className="eyebrow">FROM YOUR FOLLOWING</span>
              <h2>{featuredJournal.title}</h2>
              <p>{featuredJournal.bodyOriginal}</p>
              <footer><span>{featuredJournal.vehicleLabel}</span><span><Heart size={15} aria-hidden="true" />{featuredJournal.appreciationCount}</span></footer>
            </div>
          </Link>
        )}
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
