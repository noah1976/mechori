"use client";

import { DemoNotice } from "@/components/demo-notice";
import { JournalCard } from "@/components/journal-card";
import { useApp } from "@/lib/app-context";
import {
  createFollowTargets,
  getFollowedSharedFeed,
  getFollowingFeed,
  getPreferredVehicle,
  isFollowing,
  isProfileBlocked,
  isProfileMuted,
  type FollowTargetSummary,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { Ban, BookOpenText, Camera, CarFront, RotateCcw, UserRound, VolumeX, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function FeedPage() {
  const {
    data,
    locale,
    signedIn,
    isRemoteAlpha,
    workspaceLoadState,
    ensureSocialData,
    sharedJournalLoadState,
    refreshSharedJournals,
    retryWorkspace,
    sharedJournals,
    sharedProfiles,
    toggleFollow,
    toggleMuteProfile,
    toggleBlockProfile,
    recordEngagement,
  } = useApp();
  const ja = locale === "ja";
  const preferredVehicle = getPreferredVehicle(
    data.vehicles.filter((vehicle) => vehicle.ownerProfileId === data.currentProfileId),
  );
  const ownJournalIds = new Set(data.journals.map((journal) => journal.id));
  const feed = [
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
  );
  const targets = createFollowTargets(data);
  const safetyRelations = data.profileSafetyRelations.filter(
    (relation) => relation.actorProfileId === data.currentProfileId,
  );
  useEffect(() => recordEngagement("feed_viewed"), [recordEngagement]);
  useEffect(() => {
    if (signedIn && isRemoteAlpha && workspaceLoadState === "ready") {
      void ensureSocialData().catch(() => undefined);
    }
  }, [ensureSocialData, isRemoteAlpha, signedIn, workspaceLoadState]);

  if (signedIn && workspaceLoadState === "loading") {
    return <div className="page-stack"><header className="page-header"><div><span className="eyebrow">FOLLOWING</span><h1>{translate(locale, "feed")}</h1></div></header><div className="empty-state" role="status"><BookOpenText size={28} aria-hidden="true" /><p>{ja ? "フォロー中の記録を準備しています…" : "Preparing followed records…"}</p></div></div>;
  }

  if (signedIn && workspaceLoadState === "error") {
    return <div className="page-stack"><header className="page-header"><div><span className="eyebrow">FOLLOWING</span><h1>{translate(locale, "feed")}</h1></div></header><div className="empty-state"><p>{ja ? "フィードを準備できませんでした。" : "The feed could not be prepared."}</p><button type="button" className="primary-action" onClick={() => void retryWorkspace()}>{ja ? "もう一度試す" : "Try again"}</button></div></div>;
  }

  return (
    <div className="page-stack">
      <DemoNotice />
      <header className="page-header">
        <div>
          <span className="eyebrow">FOLLOWING</span>
          <h1>{translate(locale, "feed")}</h1>
          <p>
            {isRemoteAlpha
              ? ja
                ? "人をフォローして全公開車両を追うことも、気になる一台だけをフォローすることもできます。同じ投稿は重複表示しません。"
                : "Follow a person across all public vehicles or follow one vehicle only. The same post is never shown twice."
              : ja
              ? "人だけでなく、気になる一台や車種の続きを時系列で追えます。人気はナレッジの信頼度に影響しません。"
              : "Follow people, individual vehicles, and models in chronological order. Popularity never changes knowledge trust."}
          </p>
        </div>
        <Link
          href={preferredVehicle
            ? `/garage/${encodeURIComponent(preferredVehicle.id)}/event/new`
            : "/garage/new"}
          className="primary-action"
        >
          <Camera size={17} aria-hidden="true" />
          {preferredVehicle
            ? ja ? "さっと記録" : "Quick record"
            : ja ? "愛車を登録" : "Add vehicle"}
        </Link>
      </header>

      <div className={isRemoteAlpha ? "feed-layout alpha-community-feed" : "feed-layout"}>
        <section className="feed-stream">
          <div className="section-heading">
            <div>
              <span className="eyebrow">LATEST</span>
              <h2>{ja ? "フォロー中の人・クルマの新着" : "Latest from followed people and vehicles"}</h2>
            </div>
          </div>
          {isRemoteAlpha && sharedJournalLoadState === "loading" && (
            <p className="muted-copy" role="status">{ja ? "フォロー中の記録を読み込んでいます…" : "Loading followed records…"}</p>
          )}
          {isRemoteAlpha && sharedJournalLoadState === "error" && (
            <div className="empty-state"><p>{ja ? "公開記録を読み込めませんでした。" : "Shared records could not be loaded."}</p><button type="button" className="secondary-action" onClick={() => void refreshSharedJournals()}>{ja ? "もう一度試す" : "Try again"}</button></div>
          )}
          {sharedJournalLoadState !== "error" && feed.length ? (
            <div className="journal-list">
              {feed.map((journal, index) => {
                const author = data.profiles.find(
                  (profile) => profile.id === journal.authorProfileId,
                ) ?? sharedProfiles.find(
                  (profile) => profile.id === journal.authorProfileId,
                );
                const sharedPost = sharedProfiles.some(
                  (profile) => profile.id === journal.authorProfileId,
                );
                const sharedProfileLinkable =
                  sharedPost && author?.visibility === "public";
                return (
                  <JournalCard
                    key={journal.id}
                    journal={journal}
                    sharedJournal={sharedJournals.find((item) => item.id === journal.id)}
                    author={author}
                    record={data.records.find(
                      (record) => record.id === journal.linkedRecordId,
                    )}
                    locale={locale}
                    translations={data.contentTranslations}
                    mediaPriority={index === 0}
                    authorLinkEnabled={!sharedPost || sharedProfileLinkable}
                    alphaAudience={isRemoteAlpha}
                    showPrivateMedia={journal.authorProfileId === data.currentProfileId}
                    safety={
                      journal.authorProfileId === data.currentProfileId ||
                      (sharedPost && !sharedProfileLinkable)
                        ? undefined
                        : {
                      muted: isProfileMuted(data, journal.authorProfileId),
                      blocked: isProfileBlocked(data, journal.authorProfileId),
                      onToggleMute: () => toggleMuteProfile(journal.authorProfileId),
                      onToggleBlock: () => toggleBlockProfile(journal.authorProfileId),
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <BookOpenText size={28} aria-hidden="true" />
              <h3>{ja ? "フォロー中の更新はありません" : "No followed updates"}</h3>
              <p>
                {isRemoteAlpha
                  ? ja
                    ? "表示名や @ユーザー名から友人を探し、その人または公開中のクルマをフォローできます。"
                    : "Find friends by display name or @username, then follow the person or one of their public vehicles."
                  : ja
                  ? "右側からプロフィール、車両、車種をフォローできます。"
                  : "Follow a profile, vehicle, or model from the panel."}
              </p>
              {isRemoteAlpha && (
                <Link href="/people" className="secondary-action">
                  {ja ? "人・クルマを探す" : "Find people and vehicles"}
                </Link>
              )}
            </div>
          )}
        </section>

        {!isRemoteAlpha && <aside className="follow-panel" aria-label={ja ? "フォロー候補" : "Follow suggestions"}>
          <span className="eyebrow">DISCOVER</span>
          <h2>{ja ? "続きを見たい対象" : "Things to keep up with"}</h2>
          <p>
            {ja
              ? "DEMOの候補です。フォロー状態だけを端末内に保存します。"
              : "DEMO suggestions. Follow state stays on this device."}
          </p>
          <div className="follow-target-list">
            {targets.map((target) => (
              <FollowTargetRow
                key={`${target.type}:${target.id}`}
                target={target}
                followed={isFollowing(data, target.type, target.id)}
                onToggle={() => {
                  void toggleFollow(target.type, target.id);
                }}
                ja={ja}
              />
            ))}
          </div>
          {safetyRelations.length > 0 && (
            <section className="profile-safety-management">
              <div>
                <span className="eyebrow">VISIBILITY</span>
                <h3>{ja ? "表示管理" : "Visibility controls"}</h3>
              </div>
              <p>
                {ja
                  ? "ミュート・ブロックしたプロフィールは、ここからいつでも解除できます。"
                  : "Muted and blocked profiles can always be restored here."}
              </p>
              <div className="profile-safety-list">
                {safetyRelations.map((relation) => {
                  const profile = data.profiles.find(
                    (item) => item.id === relation.targetProfileId,
                  );
                  const Icon = relation.type === "block" ? Ban : VolumeX;
                  return (
                    <article key={relation.id}>
                      <Icon size={16} aria-hidden="true" />
                      <div>
                        <small>{relation.type === "block" ? (ja ? "ブロック中" : "Blocked") : (ja ? "ミュート中" : "Muted")}</small>
                        <strong>{profile?.displayName ?? (ja ? "不明なプロフィール" : "Unknown profile")}</strong>
                      </div>
                      <button
                        type="button"
                        className="icon-action"
                        title={ja ? "解除" : "Restore"}
                        aria-label={`${profile?.displayName ?? "Profile"}: ${ja ? "解除" : "Restore"}`}
                        onClick={() => relation.type === "block"
                          ? toggleBlockProfile(relation.targetProfileId)
                          : toggleMuteProfile(relation.targetProfileId)}
                      >
                        <RotateCcw size={16} aria-hidden="true" />
                      </button>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </aside>}
      </div>
    </div>
  );
}

function FollowTargetRow({
  target,
  followed,
  onToggle,
  ja,
}: {
  target: FollowTargetSummary;
  followed: boolean;
  onToggle(): void;
  ja: boolean;
}) {
  const Icon =
    target.type === "profile"
      ? target.description.includes("Professional")
        ? Wrench
        : UserRound
      : CarFront;
  const typeLabel = {
    profile: ja ? "プロフィール" : "Profile",
    vehicle: ja ? "個別車両" : "Vehicle",
    model: ja ? "車種" : "Model",
  }[target.type];

  return (
    <article>
      <span className="follow-target-icon">
        <Icon size={17} aria-hidden="true" />
      </span>
      <div>
        <small>{typeLabel}</small>
        <strong>{target.label}</strong>
      </div>
      <button
        type="button"
        className={followed ? "follow-button is-following" : "follow-button"}
        onClick={onToggle}
        aria-pressed={followed}
        aria-label={`${followed ? (ja ? "フォロー解除" : "Unfollow") : ja ? "フォロー" : "Follow"}: ${target.label}`}
      >
        {followed ? (ja ? "フォロー中" : "Following") : ja ? "フォロー" : "Follow"}
      </button>
    </article>
  );
}
