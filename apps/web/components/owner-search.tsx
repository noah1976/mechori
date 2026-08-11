"use client";

import { ProfileAvatar } from "@/components/profile-avatar";
import {
  searchAlphaPublicOwners,
  searchAlphaPublicVehicles,
  type AlphaPublicOwnerSummary,
  type AlphaPublicVehicleSearchResult,
} from "@/lib/alpha-public-owners";
import { useApp } from "@/lib/app-context";
import {
  applyDiscoveryOwnerFollowResult,
  applyDiscoveryVehicleFollowResult,
} from "@/lib/discovery-search-state";
import { isFollowing } from "@mechori/core";
import {
  ArrowRight,
  CarFront,
  LoaderCircle,
  RefreshCw,
  Search,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

type SearchState = "idle" | "loading" | "success" | "error";

type OwnerSearchProps = {
  query?: string;
  submitted?: boolean;
  searchVersion?: number;
  onResultCountChange?(count: number): void;
};

export function OwnerSearch({
  query: controlledQuery,
  submitted: controlledSubmitted = false,
  searchVersion = 0,
  onResultCountChange,
}: OwnerSearchProps) {
  const {
    data,
    ensureSocialData,
    isFollowPending,
    isRemoteAlpha,
    locale,
    signedIn,
    toggleFollow,
    workspaceLoadState,
  } = useApp();
  const [inputQuery, setInputQuery] = useState("");
  const [owners, setOwners] = useState<AlphaPublicOwnerSummary[]>([]);
  const [vehicles, setVehicles] = useState<AlphaPublicVehicleSearchResult[]>([]);
  const [ownerState, setOwnerState] = useState<SearchState>("idle");
  const [vehicleState, setVehicleState] = useState<SearchState>("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const searchRequestRef = useRef(0);
  const ja = locale === "ja";
  const controlled = controlledQuery !== undefined;

  const clearResults = useCallback(() => {
    searchRequestRef.current += 1;
    setOwners([]);
    setVehicles([]);
    setOwnerState("idle");
    setVehicleState("idle");
    setActionError(null);
  }, []);

  const runSearch = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    if (!query) {
      clearResults();
      return;
    }

    setActionError(null);
    setOwnerState("loading");
    setVehicleState("loading");
    const requestId = searchRequestRef.current + 1;
    searchRequestRef.current = requestId;
    await Promise.all([
      searchAlphaPublicOwners(query)
        .then((result) => {
          if (searchRequestRef.current !== requestId) return;
          setOwners(result);
          setOwnerState("success");
        })
        .catch(() => {
          if (searchRequestRef.current !== requestId) return;
          setOwners([]);
          setOwnerState("error");
        }),
      searchAlphaPublicVehicles(query)
        .then((result) => {
          if (searchRequestRef.current !== requestId) return;
          setVehicles(result);
          setVehicleState("success");
        })
        .catch(() => {
          if (searchRequestRef.current !== requestId) return;
          setVehicles([]);
          setVehicleState("error");
        }),
    ]);
  }, [clearResults]);

  useEffect(() => {
    if (!controlled || !controlledSubmitted || !(controlledQuery ?? "").trim()) return;
    const timer = window.setTimeout(() => {
      void runSearch(controlledQuery ?? "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [controlled, controlledQuery, controlledSubmitted, runSearch, searchVersion]);

  useEffect(() => {
    if (!onResultCountChange) return;
    const ownerCount = ownerState === "success" ? owners.length : 0;
    const vehicleCount = vehicleState === "success" ? vehicles.length : 0;
    onResultCountChange(ownerCount + vehicleCount);
  }, [onResultCountChange, ownerState, owners.length, vehicleState, vehicles.length]);

  if (!signedIn || !isRemoteAlpha || (controlled && !(controlledQuery ?? "").trim())) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ownerState === "loading" || vehicleState === "loading") return;
    await runSearch(inputQuery);
  }

  async function changeOwnerFollow(owner: AlphaPublicOwnerSummary) {
    if (workspaceLoadState !== "ready") return;
    setActionError(null);
    try {
      await ensureSocialData();
      const result = await toggleFollow("profile", owner.id);
      if (!result.ok) {
        setActionError(ja ? "フォローを更新できませんでした。もう一度お試しください。" : "The follow could not be updated. Please try again.");
        return;
      }
      setOwners((current) => applyDiscoveryOwnerFollowResult(current, owner.id, result));
    } catch {
      setActionError(ja ? "フォローを更新できませんでした。もう一度お試しください。" : "The follow could not be updated. Please try again.");
    }
  }

  async function changeVehicleFollow(vehicle: AlphaPublicVehicleSearchResult) {
    if (workspaceLoadState !== "ready") return;
    setActionError(null);
    const result = await toggleFollow("vehicle", vehicle.targetId);
    if (!result.ok) {
      setActionError(ja ? "クルマのフォローを更新できませんでした。もう一度お試しください。" : "The vehicle follow could not be updated. Please try again.");
      return;
    }
    setVehicles((current) => applyDiscoveryVehicleFollowResult(current, vehicle.targetId, result));
  }

  const submittedQuery = controlled ? (controlledQuery ?? "").trim() : inputQuery.trim();
  const hasSearched = controlled ? controlledSubmitted && Boolean(submittedQuery) : ownerState !== "idle" || vehicleState !== "idle";
  const loading = ownerState === "loading" || vehicleState === "loading";

  return (
    <section className="owner-search-panel" aria-labelledby="owner-search-heading">
      <div className="owner-search-heading">
        <UserRound size={22} aria-hidden="true" />
        <div>
          <span className="eyebrow">OWNER &amp; VEHICLE DISCOVERY</span>
          <h2 id="owner-search-heading">
            {hasSearched ? (ja ? "人・クルマの検索結果" : "People and vehicle results") : (ja ? "人・クルマを検索" : "Search people and vehicles")}
          </h2>
          <p>
            {ja
              ? "表示名、@ユーザー名、メーカー、車名、呼び名から公開中の人とクルマを探せます。"
              : "Find public owners and vehicles by name, @username, make, model, or nickname."}
          </p>
        </div>
      </div>

      {!controlled && (
        <form className="owner-search-form" onSubmit={submit} aria-busy={loading}>
          <label>
            <span className="sr-only">
              {ja ? "人またはクルマを検索" : "Search people or vehicles"}
            </span>
            <Search size={19} aria-hidden="true" />
            <input
              type="search"
              value={inputQuery}
              onChange={(event) => setInputQuery(event.target.value)}
              placeholder={ja ? "名前、車名、メーカーなど" : "Name, vehicle, make, and more"}
              maxLength={80}
              autoComplete="off"
            />
          </label>
          <button type="submit" className="primary-action" disabled={loading || !inputQuery.trim()}>
            {loading ? <LoaderCircle className="loading-spinner" size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
            {loading ? (ja ? "検索中…" : "Searching…") : (ja ? "探す" : "Search")}
          </button>
        </form>
      )}

      {actionError && <p className="form-error" role="alert">{actionError}</p>}
      {hasSearched && (
        <div className="discovery-search-results" aria-live="polite">
          <DiscoveryResultSection
            heading={ja ? "人" : "People"}
            state={ownerState}
            emptyLabel={ja ? "該当する人はいません" : "No matching people were found."}
            errorLabel={ja ? "人を検索できませんでした" : "People could not be searched."}
            onRetry={() => void runSearch(submittedQuery)}
          >
            {owners.map((owner) => {
              const pending = isFollowPending("profile", owner.id);
              return (
                <article key={owner.id} className="discovery-owner-row">
                  <Link href={`/profile/${encodeURIComponent(owner.id)}`} className="discovery-owner-main">
                    <ProfileAvatar displayName={owner.displayName} imagePath={owner.profileImagePath} className="owner-search-avatar" />
                    <span>
                      <strong>{owner.displayName}</strong>
                      {owner.publicUsername && <small>@{owner.publicUsername}</small>}
                      {owner.representativeVehicle && <small>{formatVehicleLabel(owner.representativeVehicle, ja)}</small>}
                      {owner.relationship && <small className={`connection-relationship connection-${owner.relationship}`}>{relationshipLabel(owner.relationship, ja)}</small>}
                    </span>
                    <ArrowRight size={18} aria-hidden="true" />
                  </Link>
                  <button
                    type="button"
                    className={owner.viewerFollowsTarget ? "follow-button is-following" : "follow-button"}
                    aria-pressed={owner.viewerFollowsTarget}
                    disabled={pending || workspaceLoadState !== "ready"}
                    onClick={() => void changeOwnerFollow(owner)}
                  >
                    {pending && <LoaderCircle className="loading-spinner" size={15} aria-hidden="true" />}
                    {owner.viewerFollowsTarget ? (ja ? "フォロー解除" : "Unfollow") : <><UserRoundPlus size={15} aria-hidden="true" />{ja ? "フォロー" : "Follow"}</>}
                  </button>
                </article>
              );
            })}
          </DiscoveryResultSection>

          <DiscoveryResultSection
            heading={ja ? "クルマ" : "Vehicles"}
            state={vehicleState}
            emptyLabel={ja ? "該当するクルマはありません" : "No matching vehicles were found."}
            errorLabel={ja ? "クルマを検索できませんでした" : "Vehicles could not be searched."}
            onRetry={() => void runSearch(submittedQuery)}
          >
            {vehicles.map((vehicle) => {
              const followed = vehicle.viewerFollowsVehicle || isFollowing(data, "vehicle", vehicle.targetId);
              const pending = isFollowPending("vehicle", vehicle.targetId);
              return (
                <article key={vehicle.targetId} className="discovery-vehicle-row">
                  <Link href={`/v/${encodeURIComponent(vehicle.slug)}`} className="discovery-vehicle-image" aria-label={formatVehicleLabel(vehicle, ja)}>
                    <Image src={vehicle.imageDataUrl} alt="" fill sizes="(max-width: 760px) 76px, 96px" unoptimized />
                  </Link>
                  <div className="discovery-vehicle-copy">
                    <Link href={`/v/${encodeURIComponent(vehicle.slug)}`}>
                      <strong>{vehicle.nickname || formatVehicleLabel(vehicle, ja)}</strong>
                      {vehicle.nickname && <small>{formatVehicleLabel(vehicle, ja)}</small>}
                    </Link>
                    <Link href={`/profile/${encodeURIComponent(vehicle.owner.id)}`} className="connection-owner-link">
                      <ProfileAvatar displayName={vehicle.owner.displayName} imagePath={vehicle.owner.profileImagePath} className="connection-owner-avatar" />
                      <span>{vehicle.owner.displayName}{vehicle.owner.publicUsername ? ` @${vehicle.owner.publicUsername}` : ""}</span>
                    </Link>
                    {vehicle.owner.viewerFollowsOwner && <small className="connection-owner-following">{ja ? "この人もフォロー中" : "You also follow this owner"}</small>}
                  </div>
                  <button
                    type="button"
                    className={followed ? "follow-button is-following" : "follow-button"}
                    aria-pressed={followed}
                    disabled={pending || workspaceLoadState !== "ready"}
                    onClick={() => void changeVehicleFollow(vehicle)}
                  >
                    {pending && <LoaderCircle className="loading-spinner" size={15} aria-hidden="true" />}
                    <CarFront size={15} aria-hidden="true" />
                    {followed ? (ja ? "フォロー解除" : "Unfollow") : (ja ? "このクルマをフォロー" : "Follow vehicle")}
                  </button>
                </article>
              );
            })}
          </DiscoveryResultSection>
        </div>
      )}
    </section>
  );
}

function DiscoveryResultSection({
  children,
  emptyLabel,
  errorLabel,
  heading,
  onRetry,
  state,
}: {
  children: ReactNode;
  emptyLabel: string;
  errorLabel: string;
  heading: string;
  onRetry(): void;
  state: SearchState;
}) {
  return (
    <section className="discovery-result-section" aria-label={heading}>
      <h3>{heading}</h3>
      {state === "loading" && <p className="owner-search-empty"><LoaderCircle className="loading-spinner" size={16} aria-hidden="true" /> {heading}を検索中…</p>}
      {state === "error" && <p className="form-error" role="alert">{errorLabel} <button type="button" className="text-link" onClick={onRetry}><RefreshCw size={14} aria-hidden="true" />再試行</button></p>}
      {state === "success" && !hasChildren(children) && <p className="owner-search-empty">{emptyLabel}</p>}
      {state === "success" && hasChildren(children) && <div className="discovery-result-list">{children}</div>}
    </section>
  );
}

function hasChildren(children: ReactNode): boolean {
  return Array.isArray(children) ? children.length > 0 : Boolean(children);
}

function formatVehicleLabel(
  vehicle: { make: string; model: string; modelYear?: number; year?: number },
  ja: boolean,
): string {
  const year = vehicle.modelYear ?? vehicle.year;
  return `${year ? `${year} ` : ""}${vehicle.make} ${vehicle.model}` || (ja ? "クルマ" : "Vehicle");
}

function relationshipLabel(
  relationship: NonNullable<AlphaPublicOwnerSummary["relationship"]>,
  ja: boolean,
): string {
  if (relationship === "mutual") return ja ? "相互フォロー" : "Mutual";
  if (relationship === "following") return ja ? "フォロー中" : "Following";
  return ja ? "フォローされています" : "Follows you";
}
