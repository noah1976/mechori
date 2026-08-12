"use client";

import {
  applyPersonFollowResult,
  connectionCollectionState,
  connectionProfileHref,
  loadAlphaConnectionPeople,
  loadMyAlphaFollowedVehicles,
  removeVehicleAfterUnfollow,
  type AlphaConnectionPerson,
  type AlphaFollowedVehicle,
  type ConnectionPersonList,
} from "@/lib/alpha-connections";
import { canLoadAlphaConnections } from "@/lib/connections-state";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useApp } from "@/lib/app-context";
import {
  CarFront,
  LoaderCircle,
  RefreshCw,
  Search,
  UserCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";

type ConnectionCategory = "people" | "vehicles";

export function ConnectionsProfileLinks({
  profileId,
  ownProfile = false,
  locale,
}: {
  profileId: string;
  ownProfile?: boolean;
  locale: "ja" | "en";
}) {
  const baseHref = ownProfile
    ? "/connections"
    : `/connections?profile=${encodeURIComponent(profileId)}`;
  const href = (tab: ConnectionPersonList) => `${baseHref}${baseHref.includes("?") ? "&" : "?"}tab=${tab}`;
  const ja = locale === "ja";

  return (
    <nav className="profile-connections-links" aria-label={ja ? "つながり" : "Connections"}>
      <Link href={href("following")}>
        <UsersRound size={17} aria-hidden="true" />
        {ja ? "フォロー中を見る" : "View following"}
      </Link>
      <Link href={href("followers")}>
        <UserRound size={17} aria-hidden="true" />
        {ja ? "フォロワーを見る" : "View followers"}
      </Link>
    </nav>
  );
}

export function ConnectionsView({
  ownerPublicProfileId,
  initialList = "following",
}: {
  ownerPublicProfileId: string | null;
  initialList?: ConnectionPersonList;
}) {
  const {
    locale,
    signedIn,
    isRemoteAlpha,
    workspaceLoadState,
    retryWorkspace,
    toggleFollow,
    isFollowPending,
  } = useApp();
  const [category, setCategory] = useState<ConnectionCategory>("people");
  const [personList, setPersonList] = useState<ConnectionPersonList>(initialList);
  const [people, setPeople] = useState<AlphaConnectionPerson[]>([]);
  const [vehicles, setVehicles] = useState<AlphaFollowedVehicle[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [peopleFailed, setPeopleFailed] = useState(false);
  const [vehiclesFailed, setVehiclesFailed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const ja = locale === "ja";

  const loadPeople = useCallback(async () => {
    if (!canLoadAlphaConnections(signedIn, isRemoteAlpha) || workspaceLoadState !== "ready") return;
    setPeopleLoading(true);
    setPeopleFailed(false);
    try {
      setPeople(await loadAlphaConnectionPeople(ownerPublicProfileId, personList));
    } catch {
      setPeople([]);
      setPeopleFailed(true);
    } finally {
      setPeopleLoading(false);
    }
  }, [isRemoteAlpha, ownerPublicProfileId, personList, signedIn, workspaceLoadState]);

  const loadVehicles = useCallback(async () => {
    if (!canLoadAlphaConnections(signedIn, isRemoteAlpha) || workspaceLoadState !== "ready") return;
    setVehiclesLoading(true);
    setVehiclesFailed(false);
    try {
      setVehicles(await loadMyAlphaFollowedVehicles());
    } catch {
      setVehicles([]);
      setVehiclesFailed(true);
    } finally {
      setVehiclesLoading(false);
    }
  }, [isRemoteAlpha, signedIn, workspaceLoadState]);

  useEffect(() => {
    if (category !== "people") return;
    const timer = window.setTimeout(() => void loadPeople(), 0);
    return () => window.clearTimeout(timer);
  }, [category, loadPeople]);

  useEffect(() => {
    if (category !== "vehicles") return;
    const timer = window.setTimeout(() => void loadVehicles(), 0);
    return () => window.clearTimeout(timer);
  }, [category, loadVehicles]);

  async function changePersonFollow(person: AlphaConnectionPerson) {
    setActionError(null);
    const result = await toggleFollow("profile", person.id);
    if (!result.ok) {
      setActionError(
        ja
          ? "フォローを更新できませんでした。時間をおいてもう一度お試しください。"
          : "The follow could not be updated. Please try again shortly.",
      );
      return;
    }
    setPeople((current) => applyPersonFollowResult(current, person.id, result));
  }

  async function unfollowVehicle(vehicle: AlphaFollowedVehicle) {
    setActionError(null);
    const result = await toggleFollow("vehicle", vehicle.targetId);
    if (!result.ok) {
      setActionError(
        ja
          ? "クルマのフォローを解除できませんでした。時間をおいてもう一度お試しください。"
          : "The vehicle follow could not be removed. Please try again shortly.",
      );
      return;
    }
    setVehicles((current) => removeVehicleAfterUnfollow(current, vehicle.targetId, result));
  }

  const peopleState = connectionCollectionState(
    peopleLoading || workspaceLoadState === "loading",
    peopleFailed || workspaceLoadState === "error",
    people,
  );
  const vehiclesState = connectionCollectionState(
    vehiclesLoading || workspaceLoadState === "loading",
    vehiclesFailed || workspaceLoadState === "error",
    vehicles,
  );

  if (!signedIn) {
    return (
      <div className="empty-state">
        <UsersRound size={28} aria-hidden="true" />
        <h1>{ja ? "つながりを見るにはログインが必要です" : "Sign in to view connections"}</h1>
        <Link href="/auth?returnTo=%2Fconnections" className="primary-action">
          {ja ? "ログイン" : "Sign in"}
        </Link>
      </div>
    );
  }

  return (
    <div className="page-stack connections-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">CONNECTIONS</span>
          <h1>{ja ? "つながり" : "Connections"}</h1>
          <p>
            {ownerPublicProfileId
              ? ja
                ? "この人のつながりから、気になるオーナーを探せます。"
                : "Explore people connected to this owner."
              : ja
                ? "フォローしている人やクルマを確認できます。"
                : "Manage the people and vehicles you follow."}
          </p>
        </div>
        <UsersRound size={29} aria-hidden="true" />
      </header>

      <div className="connections-category-tabs" role="tablist" aria-label={ja ? "つながりの種類" : "Connection type"}>
        <button type="button" role="tab" aria-selected={category === "people"} onClick={() => setCategory("people")}>
          <UsersRound size={17} aria-hidden="true" />
          {ja ? "人" : "People"}
        </button>
        <button type="button" role="tab" aria-selected={category === "vehicles"} onClick={() => setCategory("vehicles")} disabled={Boolean(ownerPublicProfileId)}>
          <CarFront size={17} aria-hidden="true" />
          {ja ? "クルマ" : "Vehicles"}
        </button>
      </div>

      {actionError && <p className="form-error" role="alert">{actionError}</p>}

      {category === "people" ? (
        <section className="connections-section" aria-labelledby="connections-people-heading">
          <div className="connections-person-tabs" role="tablist" aria-label={ja ? "人のつながり" : "People connections"}>
            <button type="button" role="tab" aria-selected={personList === "following"} onClick={() => setPersonList("following")}>
              {ja ? "フォロー中" : "Following"}
            </button>
            <button type="button" role="tab" aria-selected={personList === "followers"} onClick={() => setPersonList("followers")}>
              {ja ? "フォロワー" : "Followers"}
            </button>
          </div>
          <h2 id="connections-people-heading" className="sr-only">
            {personList === "following" ? (ja ? "フォロー中" : "Following") : (ja ? "フォロワー" : "Followers")}
          </h2>
          {peopleState === "loading" && <ConnectionLoading label={ja ? "つながりを読み込み中" : "Loading connections"} />}
          {peopleState === "error" && <ConnectionError onRetry={() => workspaceLoadState === "error" ? void retryWorkspace() : void loadPeople()} label={ja ? "つながりを読み込めませんでした。" : "Connections could not be loaded."} retryLabel={ja ? "もう一度試す" : "Retry"} />}
          {peopleState === "empty" && (
            <ConnectionEmpty
              icon={personList === "following" ? UserCheck : UsersRound}
              title={personList === "following" ? (ja ? "まだフォローしている人はいません" : "You are not following anyone yet") : (ja ? "まだフォロワーはいません" : "You do not have followers yet")}
              action={personList === "following" ? <Link href="/people" className="secondary-action"><Search size={17} aria-hidden="true" />{ja ? "探す" : "Search"}</Link> : undefined}
            />
          )}
          {peopleState === "ready" && (
            <div className="connections-list">
              {people.map((person) => {
                const pending = isFollowPending("profile", person.id);
                return (
                  <article key={person.id} className="connection-person-row">
                    <Link href={connectionProfileHref(person.id)} className="connection-person-main">
                      <ProfileAvatar displayName={person.displayName} imagePath={person.profileImagePath} className="owner-search-avatar" />
                      <span>
                        <strong>{person.displayName}</strong>
                        {person.publicUsername && <small>@{person.publicUsername}</small>}
                        {person.representativeVehicle && <small>{person.representativeVehicle.year ? `${person.representativeVehicle.year} ` : ""}{person.representativeVehicle.make} {person.representativeVehicle.model}</small>}
                      </span>
                    </Link>
                    <span className={`connection-relationship connection-${person.relationship}`}>
                      {relationshipLabel(person.relationship, ja)}
                    </span>
                    <button type="button" className={person.viewerFollowsTarget ? "follow-button is-following" : "follow-button"} aria-pressed={person.viewerFollowsTarget} disabled={pending} onClick={() => void changePersonFollow(person)}>
                      {pending ? <LoaderCircle className="loading-spinner" size={15} aria-hidden="true" /> : null}
                      {person.viewerFollowsTarget ? (ja ? "フォロー解除" : "Unfollow") : (ja ? "フォロー" : "Follow")}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="connections-section" aria-labelledby="connections-vehicles-heading">
          <div className="section-heading compact"><div><span className="eyebrow">FOLLOWED VEHICLES</span><h2 id="connections-vehicles-heading">{ja ? "フォロー中のクルマ" : "Followed vehicles"}</h2></div></div>
          {vehiclesState === "loading" && <ConnectionLoading label={ja ? "フォロー中のクルマを読み込み中" : "Loading followed vehicles"} />}
          {vehiclesState === "error" && <ConnectionError onRetry={() => workspaceLoadState === "error" ? void retryWorkspace() : void loadVehicles()} label={ja ? "フォロー中のクルマを読み込めませんでした。" : "Followed vehicles could not be loaded."} retryLabel={ja ? "もう一度試す" : "Retry"} />}
          {vehiclesState === "empty" && <ConnectionEmpty icon={CarFront} title={ja ? "まだフォローしているクルマはありません" : "You are not following vehicles yet"} action={<Link href="/people" className="secondary-action"><Search size={17} aria-hidden="true" />{ja ? "探す" : "Search"}</Link>} />}
          {vehiclesState === "ready" && (
            <div className="connections-list connections-vehicle-list">
              {vehicles.map((vehicle) => {
                const pending = isFollowPending("vehicle", vehicle.targetId);
                const vehicleHref = vehicle.imageDataUrl
                  ? `/v/${encodeURIComponent(vehicle.slug)}`
                  : connectionProfileHref(vehicle.owner.id);
                return (
                  <article key={vehicle.targetId} className="connection-vehicle-row">
                    <Link href={vehicleHref} className="connection-vehicle-image" aria-label={`${vehicle.make} ${vehicle.model}`}>
                      {vehicle.imageDataUrl ? (
                        <Image src={vehicle.imageDataUrl} alt="" fill sizes="(max-width: 760px) 96px, 120px" unoptimized />
                      ) : (
                        <CarFront size={26} aria-hidden="true" />
                      )}
                    </Link>
                    <div className="connection-vehicle-copy">
                      <Link href={vehicleHref}><strong>{vehicle.year ? `${vehicle.year} ` : ""}{vehicle.make} {vehicle.model}</strong></Link>
                      <Link href={connectionProfileHref(vehicle.owner.id)} className="connection-owner-link">
                        <ProfileAvatar displayName={vehicle.owner.displayName} imagePath={vehicle.owner.profileImagePath} className="connection-owner-avatar" />
                        <span>{vehicle.owner.displayName}{vehicle.owner.publicUsername ? ` @${vehicle.owner.publicUsername}` : ""}</span>
                      </Link>
                      {vehicle.owner.viewerFollowsOwner && <small className="connection-owner-following">{ja ? "この人もフォロー中" : "You also follow this person"}</small>}
                    </div>
                    <button type="button" className="follow-button is-following" disabled={pending} onClick={() => void unfollowVehicle(vehicle)}>
                      {pending ? <LoaderCircle className="loading-spinner" size={15} aria-hidden="true" /> : null}
                      {ja ? "フォロー解除" : "Unfollow"}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ConnectionLoading({ label }: { label: string }) {
  return <div className="empty-state compact-empty" role="status"><LoaderCircle className="loading-spinner" size={26} aria-hidden="true" /><p>{label}</p></div>;
}

function ConnectionError({ label, retryLabel, onRetry }: { label: string; retryLabel: string; onRetry(): void }) {
  return <div className="empty-state compact-empty"><p role="alert">{label}</p><button type="button" className="secondary-action" onClick={onRetry}><RefreshCw size={17} aria-hidden="true" />{retryLabel}</button></div>;
}

function ConnectionEmpty({ icon: Icon, title, action }: { icon: typeof UsersRound; title: string; action?: ReactNode }) {
  return <div className="empty-state compact-empty"><Icon size={26} aria-hidden="true" /><p>{title}</p>{action}</div>;
}

function relationshipLabel(relationship: AlphaConnectionPerson["relationship"], ja: boolean): string {
  if (relationship === "mutual") return ja ? "相互フォロー" : "Mutual";
  if (relationship === "following") return ja ? "フォロー中" : "Following";
  return ja ? "フォローされています" : "Follows you";
}
