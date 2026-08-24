"use client";

import { DemoNotice } from "@/components/demo-notice";
import { ActivationChecklist } from "@/components/activation-checklist";
import { JournalCard } from "@/components/journal-card";
import { useApp } from "@/lib/app-context";
import {
  getFollowedSharedFeed,
  getFollowingFeed,
  getPreferredVehicle,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import {
  ArrowRight,
  BookOpenText,
  CarFront,
  LogIn,
  PenLine,
  Search,
  UserPlus,
  UsersRound,
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
  // Home is the following feed for signed-in alpha users; signed-out discovery stays compact.
  const feed = signedIn ? allFeed : allFeed.slice(0, 4);
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
      ) : null}

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

      {signedIn && <section className="home-feed-section home-following-section" aria-labelledby="following-feed-heading">
        <div className="home-feed-heading">
          <div>
            <h1 id="following-feed-heading">{ja ? "フォロー中" : "Following"}</h1>
            <p>{ja ? "人とクルマの新しい記録" : "New records from people and vehicles"}</p>
          </div>
        </div>
        {feed.length ? <div className="home-journal-feed">
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
              variant="home"
            />
          ))}
        </div> : <div className="home-feed-empty">
          <BookOpenText size={22} aria-hidden="true" />
          <div>
            <strong>{ja ? "フォロー中の新しい記録はありません" : "No new records from people you follow"}</strong>
            <p>{ja ? "人やクルマをフォローすると、ここで新しい記録を確認できます。" : "Follow people or vehicles to see their new records here."}</p>
          </div>
          <Link href="/people" className="text-link"><UsersRound size={16} aria-hidden="true" />{ja ? "人・クルマを探す" : "Find people and vehicles"}</Link>
        </div>}
        <div className="home-following-actions">
          <Link href="/journal/new" className="text-link home-record-link-desktop">
            <PenLine size={16} aria-hidden="true" />
            {ja ? "記録する" : "Record"}
          </Link>
          <Link href="/garage" className="text-link">
            <CarFront size={16} aria-hidden="true" />
            {ja ? "自分のガレージ" : "My Garage"}
          </Link>
          <Link href="/search" className="text-link">
            <Search size={16} aria-hidden="true" />
            {ja ? "記録を探す" : "Search records"}
          </Link>
        </div>
      </section>}

      {!signedIn && <section className="home-feed-section home-public-feed" aria-labelledby="public-feed-heading">
        <div className="home-feed-heading">
          <div>
            <p className="home-section-label">{ja ? "公開記録" : "Public records"}</p>
            <h2 id="public-feed-heading">{ja ? "公開されている愛車の記録" : "Public vehicle records"}</h2>
          </div>
        </div>
        {feed.length ? <div className="home-journal-feed">
          {feed.map((journal) => (
            <JournalCard
              key={journal.id}
              journal={journal}
              author={data.profiles.find((profile) => profile.id === journal.authorProfileId)}
              record={data.records.find((record) => record.id === journal.linkedRecordId)}
              locale={locale}
              translations={data.contentTranslations}
              showPrivateMedia={false}
              variant="home"
            />
          ))}
        </div> : <div className="home-feed-empty">
          <BookOpenText size={22} aria-hidden="true" />
          <div><strong>{ja ? "公開記録はまだありません" : "No public records yet"}</strong></div>
        </div>}
      </section>}

    </div>
  );
}
