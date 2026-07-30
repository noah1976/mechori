"use client";

import { JournalCard } from "@/components/journal-card";
import { useApp } from "@/lib/app-context";
import {
  loadAlphaPublicOwner,
  type AlphaPublicOwner,
} from "@/lib/alpha-public-owners";
import {
  isFollowing,
  isProfileBlocked,
  isProfileMuted,
  type SocialProfile,
} from "@mechori/core";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  CarFront,
  LoaderCircle,
  LockKeyhole,
  UserRoundPlus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LoadState = "loading" | "ready" | "unavailable";

export function RemoteOwnerProfile({
  publicProfileId,
}: {
  publicProfileId: string;
}) {
  const {
    data,
    locale,
    sharedJournals,
    toggleBlockProfile,
    toggleFollow,
    toggleMuteProfile,
  } = useApp();
  const [owner, setOwner] = useState<AlphaPublicOwner | null>(null);
  const [state, setState] = useState<LoadState>("loading");
  const ja = locale === "ja";
  const blocked = isProfileBlocked(data, publicProfileId);
  const profileFollowed = isFollowing(data, "profile", publicProfileId);

  useEffect(() => {
    let active = true;
    if (blocked) return;
    void loadAlphaPublicOwner(publicProfileId)
      .then((loadedOwner) => {
        if (!active) return;
        setOwner(loadedOwner);
        setState(loadedOwner ? "ready" : "unavailable");
      })
      .catch(() => {
        if (active) setState("unavailable");
      });
    return () => {
      active = false;
    };
  }, [blocked, publicProfileId]);

  const vehicleTargetIds = useMemo(
    () => new Set(owner?.vehicles.map((vehicle) => vehicle.targetId) ?? []),
    [owner],
  );
  const journals = sharedJournals.filter(
    (journal) =>
      journal.authorProfileId === publicProfileId &&
      Boolean(journal.vehicleTargetId) &&
      vehicleTargetIds.has(journal.vehicleTargetId!),
  );

  if (blocked || state === "unavailable") {
    return (
      <div className="empty-state">
        <LockKeyhole size={30} aria-hidden="true" />
        <h1>
          {ja
            ? "このプロフィールは表示できません"
            : "This profile is unavailable"}
        </h1>
        <p>
          {ja
            ? "公開車両がないか、プロフィールが利用できない状態です。"
            : "This owner has no shared vehicles or the profile is unavailable."}
        </p>
        <Link href="/people" className="secondary-action">
          {ja ? "検索へ戻る" : "Back to search"}
        </Link>
      </div>
    );
  }

  if (state === "loading" || !owner) {
    return (
      <div className="empty-state" role="status">
        <LoaderCircle className="loading-spinner" size={30} aria-hidden="true" />
        <h1>{ja ? "公開プロフィールを読み込み中" : "Loading public profile"}</h1>
      </div>
    );
  }

  const profile: SocialProfile = {
    id: owner.id,
    displayName: owner.displayName,
    publicUsername: owner.publicUsername,
    role: "owner",
    bio: "",
    visibility: "public",
    displayFields: ["vehicles"],
    isProfessional: false,
    isDemo: false,
  };

  return (
    <div className="page-stack profile-page">
      <Link href="/people" className="back-link">
        <ArrowLeft size={17} aria-hidden="true" />
        {ja ? "オーナー検索へ戻る" : "Back to owner search"}
      </Link>
      <header className="profile-header">
        <span className="profile-avatar" aria-hidden="true">
          {owner.displayName.slice(0, 1).toLocaleUpperCase()}
        </span>
        <div>
          <span className="eyebrow">PUBLIC OWNER</span>
          <h1>{owner.displayName}</h1>
          {owner.publicUsername && (
            <p className="public-username">@{owner.publicUsername}</p>
          )}
          <p>
            {ja
              ? `公開中の愛車 ${owner.vehicles.length}台`
              : `${owner.vehicles.length} shared ${owner.vehicles.length === 1 ? "vehicle" : "vehicles"}`}
          </p>
        </div>
        <button
          type="button"
          className={
            profileFollowed
              ? "follow-button is-following"
              : "follow-button"
          }
          aria-pressed={profileFollowed}
          onClick={() => toggleFollow("profile", owner.id)}
        >
          <UserRoundPlus size={16} aria-hidden="true" />
          {profileFollowed
            ? ja
              ? "この人をフォロー中"
              : "Following this person"
            : ja
              ? "この人をフォロー"
              : "Follow this person"}
        </button>
      </header>

      <section className="remote-owner-vehicles" aria-labelledby="remote-owner-vehicles-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">SHARED VEHICLES</span>
            <h2 id="remote-owner-vehicles-heading">
              {ja ? "公開中の愛車" : "Shared vehicles"}
            </h2>
          </div>
        </div>
        <div className="remote-owner-vehicle-list">
          {owner.vehicles.map((vehicle) => {
            const followed = isFollowing(data, "vehicle", vehicle.targetId);
            return (
              <article key={vehicle.targetId} className="remote-owner-vehicle">
                <Link href={`/v/${vehicle.slug}`} className="remote-owner-vehicle-photo">
                  <Image
                    src={vehicle.imageDataUrl}
                    alt={`${vehicle.make} ${vehicle.model}`}
                    fill
                    sizes="(max-width: 760px) 100vw, 280px"
                    unoptimized
                  />
                </Link>
                <div className="remote-owner-vehicle-copy">
                  <span className="eyebrow">
                    {vehicle.modelYear ?? (ja ? "年式未登録" : "YEAR UNKNOWN")}
                  </span>
                  <h3>{vehicle.make} {vehicle.model}</h3>
                  {vehicle.ownerComment && <p>{vehicle.ownerComment}</p>}
                  <div className="remote-owner-vehicle-actions">
                    <button
                      type="button"
                      className={followed ? "follow-button is-following" : "follow-button"}
                      aria-pressed={followed}
                      onClick={() => toggleFollow("vehicle", vehicle.targetId)}
                    >
                      <CarFront size={16} aria-hidden="true" />
                      {followed
                        ? ja ? "フォロー中" : "Following"
                        : ja ? "このクルマをフォロー" : "Follow this vehicle"}
                    </button>
                    <Link href={`/v/${vehicle.slug}`} className="text-link">
                      {ja ? "愛車ページを見る" : "View vehicle"}
                      <ArrowRight size={15} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <span className="eyebrow">VEHICLE RECORDS</span>
            <h2>{ja ? "公開中の愛車記録" : "Shared vehicle records"}</h2>
          </div>
        </div>
        {journals.length > 0 ? (
          <div className="journal-grid">
            {journals.map((journal) => (
              <JournalCard
                key={journal.id}
                journal={journal}
                sharedJournal={journal}
                author={profile}
                locale={locale}
                alphaAudience
                safety={{
                  muted: isProfileMuted(data, owner.id),
                  blocked: false,
                  onToggleMute: () => toggleMuteProfile(owner.id),
                  onToggleBlock: () => toggleBlockProfile(owner.id),
                }}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <BookOpenText size={26} aria-hidden="true" />
            <h3>
              {ja
                ? "公開中の愛車記録はまだありません"
                : "No shared vehicle records yet"}
            </h3>
          </div>
        )}
      </section>
      <p className="legal-note">
        {ja
          ? "車両の公開や投稿数は、整備情報の正しさや専門性を証明するものではありません。"
          : "Shared vehicles and post counts do not prove maintenance accuracy or expertise."}
      </p>
    </div>
  );
}
