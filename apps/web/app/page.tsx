"use client";

import { DemoNotice } from "@/components/demo-notice";
import { JournalCard } from "@/components/journal-card";
import { JournalMedia } from "@/components/journal-media";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { buildMonthlyOwnerSummary, getFollowingFeed } from "@mechori/core";
import { translate } from "@mechori/i18n";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  FileClock,
  Heart,
  LogIn,
  Search,
  TriangleAlert,
  UserPlus,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function HomePage() {
  const { data, locale, signedIn } = useApp();
  const vehicle = data.vehicles[0];
  const recent = [...data.records]
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate))
    .slice(0, 2);
  const allFeed = signedIn
    ? getFollowingFeed(data)
    : data.journals
        .filter((journal) => journal.visibility === "public")
        .sort((left, right) =>
          (right.publishedAt ?? right.createdAt).localeCompare(
            left.publishedAt ?? left.createdAt,
          ),
        );
  const featuredJournal = allFeed.find((journal) => journal.media.length > 0) ?? allFeed[0];
  const feed = allFeed.filter((journal) => journal.id !== featuredJournal?.id).slice(0, 2);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const ja = locale === "ja";
  const monthly = buildMonthlyOwnerSummary(data);
  const monthLabel = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "long",
  }).format(new Date());
  const unresolvedRecord = data.records.find((record) => record.resolutionStatus === "unresolved");

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
          <span className="eyebrow">{signedIn ? "TODAY IN THE GARAGE" : "PUBLIC GARAGE JOURNAL"}</span>
          <h1>{ja ? "愛車の整備も、日々の出来事も、一台の履歴に。" : "Breakdowns and the drives after them."}</h1>
          <p>
            {ja
              ? "整備記録を自分のために残し、困ったときは同型車の事例を探せます。写真や言葉で残した日々も、愛車の履歴につながります。"
              : "Even a roadside breakdown becomes a story another owner wants to read. Keep the next chapter in words and pictures."}
          </p>
          <div className="home-community-actions">
            {signedIn ? (
              <>
                <Link href="/journal/new" className="primary-action">
                  <BookOpenText size={19} aria-hidden="true" />
                  {ja ? "愛車の出来事を書く" : "Write today's story"}
                </Link>
                <Link href="/records/new" className="secondary-action">
                  <Wrench size={18} aria-hidden="true" />
                  {ja ? "整備記録だけ残す" : "Maintenance record only"}
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth?mode=signup&invite=MECHORI-DEMO" className="primary-action">
                  <UserPlus size={18} aria-hidden="true" />
                  {ja ? "招待で新規登録" : "Join with an invitation"}
                </Link>
                <Link href="/auth" className="secondary-action">
                  <LogIn size={18} aria-hidden="true" />
                  {ja ? "ログイン" : "Sign in"}
                </Link>
              </>
            )}
          </div>
          <form className="home-knowledge-prompt" onSubmit={search}>
            <Search size={20} aria-hidden="true" />
            <div>
              <small>{ja ? "公開されている整備事例を調べる" : "Search shared experience"}</small>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ja ? "症状や部品名を入力" : "My car is doing this…"} aria-label={translate(locale, "search")} />
            </div>
            <button type="submit" aria-label={translate(locale, "search")}><ArrowRight size={20} aria-hidden="true" /></button>
          </form>
        </div>

        {featuredJournal && (
          <Link href={`/journal/${featuredJournal.id}`} className="home-featured-journal">
            <JournalMedia attachments={featuredJournal.media} locale={locale} compact priority />
            <div className="home-featured-copy">
              <span className="eyebrow">{signedIn ? "FROM YOUR FOLLOWING" : "PUBLIC JOURNAL"}</span>
              <h2>{featuredJournal.title}</h2>
              <p>{featuredJournal.bodyOriginal}</p>
              <footer><span>{featuredJournal.vehicleLabel}</span><span><Heart size={15} aria-hidden="true" />{featuredJournal.appreciationCount}</span></footer>
            </div>
          </Link>
        )}
      </section>

      {signedIn && (
        <section className="monthly-owner-band" aria-labelledby="monthly-owner-heading">
          <div className="monthly-owner-heading">
            <span className="monthly-owner-icon"><CalendarDays size={22} aria-hidden="true" /></span>
            <div><span className="eyebrow">THIS MONTH</span><h2 id="monthly-owner-heading">{ja ? `${monthLabel}の愛車` : `Your vehicles in ${monthLabel}`}</h2></div>
            <p>{ja ? "整備がない月も、愛車の履歴と気になるクルマの続きをここから見返せます。" : "Even without maintenance this month, return to your vehicle history and the cars you follow."}</p>
          </div>
          <div className="monthly-owner-actions">
            <Link href={unresolvedRecord ? `/records/${unresolvedRecord.id}/edit` : "/records"}>
              <TriangleAlert size={19} aria-hidden="true" />
              <span><strong>{monthly.unresolvedCount}</strong><small>{ja ? "未解決・要追記" : "unresolved follow-ups"}</small></span>
            </Link>
            <Link href="/feed">
              <BookOpenText size={19} aria-hidden="true" />
              <span><strong>{monthly.followingUpdateCount}</strong><small>{ja ? "今月のフォロー更新" : "followed updates this month"}</small></span>
            </Link>
            <Link href={monthly.journalCount > 0 ? "/garage" : "/journal/new"}>
              <Heart size={19} aria-hidden="true" />
              <span><strong>{monthly.journalCount}</strong><small>{ja ? "今月残したJournal" : "journals kept this month"}</small></span>
            </Link>
            <Link href="/garage/history">
              <FileClock size={19} aria-hidden="true" />
              <span><strong>{monthly.recordCount}</strong><small>{ja ? "今月の整備記録" : "maintenance records this month"}</small></span>
            </Link>
          </div>
        </section>
      )}

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">{signedIn ? "FOLLOWING" : "PUBLIC JOURNALS"}</span>
            <h2>{signedIn ? (ja ? "気になるクルマの続き" : "Stories you follow") : (ja ? "公開されている愛車の記録" : "Public vehicle stories")}</h2>
          </div>
          {signedIn && (
            <Link href="/feed" className="text-link">
              {ja ? "フィードを見る" : "View feed"}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          )}
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

      {signedIn && <section>
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
      </section>}
    </div>
  );
}
