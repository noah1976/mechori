"use client";

import { DemoNotice } from "@/components/demo-notice";
import { ActivationChecklist } from "@/components/activation-checklist";
import { JournalCard } from "@/components/journal-card";
import { JournalMedia } from "@/components/journal-media";
import { RecordCard } from "@/components/record-card";
import { useApp } from "@/lib/app-context";
import { journalDetailHref } from "@/lib/journal-detail-route";
import {
  buildMonthlyOwnerSummary,
  getFollowedSharedFeed,
  getFollowingFeed,
  getPreferredVehicle,
  journalMediaForViewer,
  maintenanceRecordDateKey,
  preferSharedJournalMediaForDisplay,
  resolveJournalDisplayContent,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import {
  ArrowRight,
  BookOpenText,
  CalendarDays,
  Camera,
  CarFront,
  FileClock,
  Heart,
  LogIn,
  Search,
  TriangleAlert,
  UserPlus,
  UsersRound,
  Wrench,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export default function HomePage() {
  const {
    data,
    locale,
    signedIn,
    isRemoteAlpha,
    workspaceLoadState,
    retryWorkspace,
    ensureSocialData,
    sharedJournalLoadState,
    refreshSharedJournals,
    sharedJournals,
    sharedProfiles,
  } = useApp();
  const vehicle = getPreferredVehicle(data.vehicles);
  const recent = [...data.records]
    .sort((a, b) =>
      maintenanceRecordDateKey(b).localeCompare(maintenanceRecordDateKey(a)))
    .slice(0, 2);
  const ownJournalIds = new Set(data.journals.map((journal) => journal.id));
  const allFeed = signedIn
    ? [
        ...getFollowingFeed(data),
        ...(isRemoteAlpha
          ? getFollowedSharedFeed(data, sharedJournals).filter(
              (journal) => !ownJournalIds.has(journal.id),
            )
          : []),
      ].sort((left, right) =>
        (right.publishedAt ?? right.createdAt).localeCompare(
          left.publishedAt ?? left.createdAt,
        ),
      )
    : data.journals
        .filter((journal) => journal.visibility === "public")
        .sort((left, right) =>
          (right.publishedAt ?? right.createdAt).localeCompare(
            left.publishedAt ?? left.createdAt,
          ),
        );
  const visibleMediaFor = (journal: (typeof allFeed)[number]) =>
    journalMediaForViewer(
      preferSharedJournalMediaForDisplay(
        journal,
        sharedJournals.find((item) => item.id === journal.id),
      ),
      signedIn && journal.authorProfileId === data.currentProfileId,
    );
  const featuredJournal = allFeed.find((journal) => visibleMediaFor(journal).length > 0) ?? allFeed[0];
  const featuredDisplayJournal = featuredJournal
    ? preferSharedJournalMediaForDisplay(
        featuredJournal,
        sharedJournals.find((item) => item.id === featuredJournal.id),
      )
    : undefined;
  const featuredDisplay = featuredDisplayJournal
    ? resolveJournalDisplayContent(data, featuredDisplayJournal, locale)
    : undefined;
  const feed = allFeed.filter((journal) => journal.id !== featuredJournal?.id).slice(0, 2);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const ja = locale === "ja";
  const getStartedHref = isRemoteAlpha
    ? "/auth?mode=signup"
    : "/auth?mode=signup&invite=MECHORI-DEMO";
  useEffect(() => {
    if (signedIn && isRemoteAlpha && workspaceLoadState === "ready") {
      void ensureSocialData().catch(() => undefined);
    }
  }, [ensureSocialData, isRemoteAlpha, signedIn, workspaceLoadState]);
  const monthly = buildMonthlyOwnerSummary(data);
  const monthLabel = new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "long",
  }).format(new Date());
  const unresolvedRecord = data.records.find((record) => record.resolutionStatus === "unresolved");

  function search(event: FormEvent) {
    event.preventDefault();
    router.push(`/search?q=${encodeURIComponent(query)}`);
  }

  if (signedIn && workspaceLoadState === "loading") {
    return (
      <div className="page-stack">
        <header className="page-header"><div><span className="eyebrow">MY GARAGE</span><h1>{ja ? "ガレージを準備しています" : "Preparing your Garage"}</h1><p>{ja ? "愛車と記録を読み込んでいます。" : "Loading your vehicles and records."}</p></div></header>
        <div className="empty-state" role="status"><CarFront size={28} aria-hidden="true" /><p>{ja ? "読み込み中…" : "Loading…"}</p></div>
      </div>
    );
  }

  if (signedIn && workspaceLoadState === "error") {
    return (
      <div className="page-stack">
        <header className="page-header"><div><span className="eyebrow">MY GARAGE</span><h1>{ja ? "ガレージを読み込めませんでした" : "Your Garage could not be loaded"}</h1><p>{ja ? "通信を確認して、もう一度お試しください。" : "Check your connection and try again."}</p></div></header>
        <div className="empty-state"><button type="button" className="primary-action" onClick={() => void retryWorkspace()}>{ja ? "もう一度試す" : "Try again"}</button></div>
      </div>
    );
  }

  if (!vehicle && signedIn) {
    return (
      <div className="page-stack first-garage-home">
        <section className="first-garage-invitation">
          <span className="eyebrow">WELCOME TO MECHORI</span>
          <CarFront size={42} aria-hidden="true" />
          <h1>{ja ? "あなたのクルマを、ここから主役に。" : "Put your vehicle at the center."}</h1>
          <p>{ja ? "メーカーと車名だけで始められます。写真、年式、詳しい仕様は、分かるときに後から足せます。" : "Make and model are enough to begin. Add a photo, year, and detailed specifications whenever you know them."}</p>
          <Link href="/garage/new" className="primary-action"><ArrowRight size={18} />{ja ? "愛車ページをつくる" : "Create my vehicle page"}</Link>
          <small>{ja ? "クルマもバイクも、候補にない車種はその場で自由入力できます。" : "Cars and motorcycles can be entered freely, including unlisted and rare models."}</small>
        </section>
        <ActivationChecklist />
      </div>
    );
  }

  if (!vehicle) return null;

  return (
    <div className="page-stack">
      {signedIn && <DemoNotice />}

      {signedIn && isRemoteAlpha && sharedJournalLoadState === "loading" && (
        <p className="muted-copy" role="status">{ja ? "みんなの記録を読み込んでいます…" : "Loading shared records…"}</p>
      )}
      {signedIn && isRemoteAlpha && sharedJournalLoadState === "error" && (
        <div className="empty-state"><p>{ja ? "みんなの記録を読み込めませんでした。" : "Shared records could not be loaded."}</p><button type="button" className="secondary-action" onClick={() => void refreshSharedJournals()}>{ja ? "もう一度試す" : "Try again"}</button></div>
      )}

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
            <span className="eyebrow">MECHORI / MAINTENANCE KNOWLEDGE</span>
            <h1 id="signed-out-hero-heading">
              {ja ? "愛車との時間を、記録して、つないで、残していく。" : "Record, connect, and keep the time you share with your vehicle."}
            </h1>
            <p>
              {ja
                ? "クルマやバイクの整備、故障、部品交換、思い出を愛車の履歴として残し、人やクルマを通じて経験をつないでいくサービスです。"
                : "MECHORI keeps maintenance, repairs, parts, and memories in your vehicle history, then connects experience through people and vehicles."}
            </p>
            <div className="home-community-actions">
              <Link href={getStartedHref} className="primary-action">
                <UserPlus size={18} aria-hidden="true" />
                {ja ? "MECHORIをはじめる" : "Get started with MECHORI"}
              </Link>
              <Link href="/auth" className="signed-out-hero-login">
                <LogIn size={18} aria-hidden="true" />
                {ja ? "ログイン" : "Sign in"}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
          <div className="signed-out-hero-caption">
            <span>{ja ? "愛車履歴" : "VEHICLE HISTORY"}</span>
            <span>{ja ? "整備・故障" : "MAINTENANCE"}</span>
            <span>{ja ? "根拠付きナレッジ" : "CITED KNOWLEDGE"}</span>
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
              : "Keep maintenance for yourself and look for comparable owner cases when needed. Photos and everyday notes stay connected to the same vehicle history."}
          </p>
          <div className="home-community-actions">
            <Link
              href={`/garage/${encodeURIComponent(vehicle.id)}/event/new`}
              className="primary-action"
            >
              <Camera size={19} aria-hidden="true" />
              {ja ? "さっと記録" : "Quick record"}
            </Link>
            <Link href="/people" className="secondary-action">
              <UsersRound size={18} aria-hidden="true" />
              {ja ? "人・クルマを探す" : "Find people and vehicles"}
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
          <Link href={journalDetailHref(featuredJournal.id)} prefetch={false} className="home-featured-journal">
            <JournalMedia attachments={visibleMediaFor(featuredJournal)} locale={locale} compact priority />
            <div className="home-featured-copy">
              <span className="eyebrow">{signedIn ? isRemoteAlpha ? "FROM ALPHA GARAGES" : "FROM YOUR FOLLOWING" : "PUBLIC RECORD"}</span>
              <h2>{featuredDisplay?.title}</h2>
              <p>{featuredDisplay?.body}</p>
              <footer><span>{featuredJournal.vehicleLabel}</span><span><Heart size={15} aria-hidden="true" />{featuredJournal.appreciationCount}</span></footer>
            </div>
          </Link>
        )}
      </section>
      )}

      {signedIn && <ActivationChecklist />}

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
            <h2>{signedIn ? (ja ? "フォロー中の人・クルマの続き" : "Stories from people and vehicles you follow") : (ja ? "公開されている愛車の記録" : "Public vehicle stories")}</h2>
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
              sharedJournal={sharedJournals.find((item) => item.id === journal.id)}
              author={
                data.profiles.find(
                  (profile) => profile.id === journal.authorProfileId,
                ) ?? sharedProfiles.find(
                  (profile) => profile.id === journal.authorProfileId,
                )
              }
              record={data.records.find(
                (record) => record.id === journal.linkedRecordId,
              )}
              locale={locale}
              translations={data.contentTranslations}
              authorLinkEnabled={
                !sharedProfiles.some(
                  (profile) => profile.id === journal.authorProfileId,
                ) ||
                sharedProfiles.some(
                  (profile) =>
                    profile.id === journal.authorProfileId &&
                    profile.visibility === "public",
                )
              }
              alphaAudience={isRemoteAlpha}
              showPrivateMedia={signedIn && journal.authorProfileId === data.currentProfileId}
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
