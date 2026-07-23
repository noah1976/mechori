"use client";

import { DemoNotice } from "@/components/demo-notice";
import { JournalCard } from "@/components/journal-card";
import { JournalMedia } from "@/components/journal-media";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { buildMonthlyOwnerSummary, getFollowingFeed, getPreferredVehicle, resolveJournalDisplayContent } from "@mechori/core";
import { translate } from "@mechori/i18n";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  CarFront,
  FileClock,
  Heart,
  LogIn,
  Search,
  TriangleAlert,
  UserPlus,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function HomePage() {
  const { data, locale, signedIn } = useApp();
  const vehicle = getPreferredVehicle(data.vehicles);
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
  const featuredDisplay = featuredJournal
    ? resolveJournalDisplayContent(data, featuredJournal, locale)
    : undefined;
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

  if (!vehicle && signedIn) {
    return (
      <div className="page-stack first-garage-home">
        <section className="first-garage-invitation">
          <span className="eyebrow">WELCOME TO MECHORI</span>
          <CarFront size={42} aria-hidden="true" />
          <h1>{ja ? "あなたのクルマを、ここから主役に。" : "Put your vehicle at the center."}</h1>
          <p>{ja ? "写真を一枚選び、車名とおおよその年月を入れるだけ。3分ほどで、最初の愛車ページができます。" : "Choose one photo and add its name and approximate dates. Your first vehicle page takes about three minutes."}</p>
          <Link href="/garage/new" className="primary-action"><ArrowRight size={18} />{ja ? "愛車ページをつくる" : "Create my vehicle page"}</Link>
          <small>{ja ? "車種が候補になくても、その場で自由に登録できます。" : "Unlisted and rare vehicles are always welcome."}</small>
        </section>
      </div>
    );
  }

  if (!vehicle) return null;

  return (
    <div className="page-stack">
      {signedIn && <DemoNotice />}

      {!signedIn ? (
        <section className="signed-out-hero" aria-labelledby="signed-out-hero-heading">
          <Image
            src="/demo-roadster.png"
            alt={ja ? "ガレージの前に停めたオープンカー" : "A roadster parked in front of its garage"}
            fill
            sizes="(max-width: 760px) 100vw, 1180px"
            priority
          />
          <div className="signed-out-hero-shade" aria-hidden="true" />
          <div className="signed-out-hero-copy">
            <span className="eyebrow">MECHORI / VEHICLE MEMORY</span>
            <h1 id="signed-out-hero-heading">
              {ja ? "愛車との時間を、一台の履歴に。" : "Every chapter of your vehicle, in one history."}
            </h1>
            <p>
              {ja
                ? "ドライブの一枚も、故障の症状も、交換した部品も。思い出と維持の記録を車両ごとに残し、同じクルマを守る知識へつなげます。"
                : "A drive, a symptom, a part that finally worked. Keep memories and maintenance together, then turn lived experience into knowledge for the next owner."}
            </p>
            <div className="home-community-actions">
              <Link href="/auth?mode=signup&invite=MECHORI-DEMO" className="primary-action">
                <UserPlus size={18} aria-hidden="true" />
                {ja ? "招待コードで参加" : "Join with an invitation"}
              </Link>
              <Link href="/auth" className="signed-out-hero-login">
                <LogIn size={18} aria-hidden="true" />
                {ja ? "ログイン" : "Sign in"}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="signed-out-hero-caption">
            <span>{ja ? "思い出" : "MEMORIES"}</span>
            <span>{ja ? "整備履歴" : "MAINTENANCE"}</span>
            <span>{ja ? "実体験のナレッジ" : "LIVED KNOWLEDGE"}</span>
          </div>
        </section>
      ) : (
      <section className="home-community-stage">
        <div className="home-community-intro">
          <span className="eyebrow">{signedIn ? "TODAY IN THE GARAGE" : "PUBLIC VEHICLE RECORDS"}</span>
          <h1>{ja ? "愛車の整備も、日々の出来事も、一台の履歴に。" : "Breakdowns and the drives after them."}</h1>
          <p>
            {ja
              ? "整備記録を自分のために残し、困ったときは同型車の事例を探せます。写真や言葉で残した日々も、愛車の履歴につながります。"
              : "Even a roadside breakdown becomes a story another owner wants to read. Keep the next chapter in words and pictures."}
          </p>
          <div className="home-community-actions">
            <Link href="/journal/new" className="primary-action">
              <BookOpenText size={19} aria-hidden="true" />
              {ja ? "詳しく記録する" : "Write a detailed record"}
            </Link>
            <Link href="/records/new" className="secondary-action">
              <Wrench size={18} aria-hidden="true" />
              {ja ? "整備記録だけ残す" : "Maintenance record only"}
            </Link>
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
              <span className="eyebrow">{signedIn ? "FROM YOUR FOLLOWING" : "PUBLIC RECORD"}</span>
              <h2>{featuredDisplay?.title}</h2>
              <p>{featuredDisplay?.body}</p>
              <footer><span>{featuredJournal.vehicleLabel}</span><span><Heart size={15} aria-hidden="true" />{featuredJournal.appreciationCount}</span></footer>
            </div>
          </Link>
        )}
      </section>
      )}

      {!signedIn && (
        <section className="signed-out-discovery" aria-labelledby="signed-out-search-heading">
          <div>
            <span className="eyebrow">SEARCH THE KNOWLEDGE</span>
            <h2 id="signed-out-search-heading">{ja ? "困ったときは、同じクルマの経験を探す。" : "When something goes wrong, start with lived experience."}</h2>
            <p>{ja ? "公開されている整備・故障・部品の記録は、ログインせずに検索できます。" : "Search public maintenance, fault, and parts records without signing in."}</p>
          </div>
          <form className="home-knowledge-prompt" onSubmit={search}>
            <Search size={20} aria-hidden="true" />
            <div>
              <small>{ja ? "公開記録を検索" : "SEARCH PUBLIC RECORDS"}</small>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ja ? "症状・車名・部品名" : "Symptom, vehicle, or part"} aria-label={translate(locale, "search")} />
            </div>
            <button type="submit" aria-label={translate(locale, "search")}><ArrowRight size={20} aria-hidden="true" /></button>
          </form>
        </section>
      )}

      {!signedIn && <DemoNotice />}

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
              <span><strong>{monthly.journalCount}</strong><small>{ja ? "今月残した愛車記録" : "vehicle records this month"}</small></span>
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
            <span className="eyebrow">{signedIn ? "FOLLOWING" : "PUBLIC RECORDS"}</span>
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
              translations={data.contentTranslations}
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
