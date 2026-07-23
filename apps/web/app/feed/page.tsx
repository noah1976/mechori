"use client";

import { DemoNotice } from "@/components/demo-notice";
import { JournalCard } from "@/components/journal-card";
import { useApp } from "@/lib/app-context";
import {
  createFollowTargets,
  getFollowingFeed,
  isFollowing,
  isProfileBlocked,
  isProfileMuted,
  type FollowTargetSummary,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { Ban, BookOpenText, CarFront, Plus, RotateCcw, UserRound, VolumeX, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function FeedPage() {
  const { data, locale, toggleFollow, toggleMuteProfile, toggleBlockProfile, recordEngagement } = useApp();
  const ja = locale === "ja";
  const feed = getFollowingFeed(data);
  const targets = createFollowTargets(data);
  const safetyRelations = data.profileSafetyRelations.filter(
    (relation) => relation.actorProfileId === data.currentProfileId,
  );
  useEffect(() => recordEngagement("feed_viewed"), [recordEngagement]);

  return (
    <div className="page-stack">
      <DemoNotice />
      <header className="page-header">
        <div>
          <span className="eyebrow">FOLLOWING</span>
          <h1>{translate(locale, "feed")}</h1>
          <p>
            {ja
              ? "人だけでなく、気になる一台や車種の続きを時系列で追えます。人気はナレッジの信頼度に影響しません。"
              : "Follow people, individual vehicles, and models in chronological order. Popularity never changes knowledge trust."}
          </p>
        </div>
        <Link href="/journal/new" className="primary-action">
          <Plus size={17} aria-hidden="true" />
          {translate(locale, "addJournal")}
        </Link>
      </header>

      <div className="feed-layout">
        <section className="feed-stream">
          <div className="section-heading">
            <div>
              <span className="eyebrow">LATEST</span>
              <h2>{ja ? "新しい愛車の記録" : "Latest vehicle records"}</h2>
            </div>
          </div>
          {feed.length ? (
            <div className="journal-list">
              {feed.map((journal, index) => {
                const author = data.profiles.find(
                  (profile) => profile.id === journal.authorProfileId,
                );
                return (
                  <JournalCard
                    key={journal.id}
                    journal={journal}
                    author={author}
                    record={data.records.find(
                      (record) => record.id === journal.linkedRecordId,
                    )}
                    locale={locale}
                    translations={data.contentTranslations}
                    mediaPriority={index === 0}
                    safety={journal.authorProfileId === data.currentProfileId ? undefined : {
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
                {ja
                  ? "右側からプロフィール、車両、車種をフォローできます。"
                  : "Follow a profile, vehicle, or model from the panel."}
              </p>
            </div>
          )}
        </section>

        <aside className="follow-panel" aria-label={ja ? "フォロー候補" : "Follow suggestions"}>
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
                onToggle={() => toggleFollow(target.type, target.id)}
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
        </aside>
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
