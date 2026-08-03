"use client";

import { OwnerSearch } from "@/components/owner-search";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useApp } from "@/lib/app-context";
import {
  suggestAlphaPublicOwners,
  type AlphaPublicOwner,
} from "@/lib/alpha-public-owners";
import { isFollowing } from "@mechori/core";
import {
  ArrowRight,
  CarFront,
  LoaderCircle,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SuggestionState = "loading" | "ready" | "error";

export function OwnerDiscovery() {
  const { data, locale, signedIn, isRemoteAlpha, toggleFollow } = useApp();
  const [owners, setOwners] = useState<AlphaPublicOwner[]>([]);
  const [state, setState] = useState<SuggestionState>("loading");
  const ja = locale === "ja";

  useEffect(() => {
    let active = true;
    if (!signedIn || !isRemoteAlpha) {
      return;
    }
    void suggestAlphaPublicOwners()
      .then((suggestions) => {
        if (!active) return;
        setOwners(suggestions);
        setState("ready");
      })
      .catch(() => {
        if (active) setState("error");
      });
    return () => {
      active = false;
    };
  }, [isRemoteAlpha, signedIn]);

  const visibleOwners = useMemo(
    () =>
      owners.filter(
        (owner) => !isFollowing(data, "profile", owner.id),
      ),
    [data, owners],
  );
  const visibleState =
    !signedIn || !isRemoteAlpha ? "ready" : state;

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <span className="eyebrow">DISCOVER</span>
          <h1>{ja ? "人・クルマを探す" : "Find people and vehicles"}</h1>
          <p>
            {ja
              ? "人をフォローすると、その人の全公開車両の投稿が届きます。気になる一台だけを選ぶこともできます。"
              : "Follow a person for posts from all their public vehicles, or follow only one vehicle."}
          </p>
        </div>
        <UsersRound size={29} aria-hidden="true" />
      </header>

      <OwnerSearch />

      <section
        className="owner-suggestions"
        aria-labelledby="owner-suggestions-heading"
      >
        <div className="section-heading">
          <div>
            <span className="eyebrow">PEOPLE YOU MAY KNOW</span>
            <h2 id="owner-suggestions-heading">
              {ja ? "友達かも？" : "People you may know"}
            </h2>
          </div>
        </div>

        {visibleState === "loading" && (
          <div className="empty-state compact-empty" role="status">
            <LoaderCircle
              className="loading-spinner"
              size={26}
              aria-hidden="true"
            />
            <p>{ja ? "候補を探しています" : "Looking for suggestions"}</p>
          </div>
        )}
        {visibleState === "error" && (
          <div className="empty-state compact-empty">
            <p>
              {ja
                ? "候補を読み込めませんでした。表示名や @ユーザー名から検索できます。"
                : "Suggestions could not be loaded. You can still search by display name or @username."}
            </p>
          </div>
        )}
        {visibleState === "ready" && visibleOwners.length === 0 && (
          <div className="empty-state compact-empty">
            <UsersRound size={26} aria-hidden="true" />
            <p>
              {ja
                ? "いま表示できる候補はありません。検索から友人を探してみてください。"
                : "There are no suggestions right now. Try searching for a friend."}
            </p>
          </div>
        )}
        {visibleOwners.length > 0 && (
          <div className="owner-suggestion-list">
            {visibleOwners.map((owner) => (
              <article key={owner.id} className="owner-suggestion">
                <header>
                  <ProfileAvatar
                    displayName={owner.displayName}
                    imagePath={owner.profileImagePath}
                    className="owner-search-avatar"
                  />
                  <div>
                    <Link href={`/profile/${owner.id}`}>
                      <strong>{owner.displayName}</strong>
                    </Link>
                    {owner.publicUsername && (
                      <small>@{owner.publicUsername}</small>
                    )}
                  </div>
                  <button
                    type="button"
                    className="follow-button"
                    onClick={() => toggleFollow("profile", owner.id)}
                  >
                    <UserRoundPlus size={16} aria-hidden="true" />
                    {ja ? "この人をフォロー" : "Follow this person"}
                  </button>
                </header>
                <div className="owner-suggestion-vehicles">
                  {owner.vehicles.map((vehicle) => {
                    const followed = isFollowing(
                      data,
                      "vehicle",
                      vehicle.targetId,
                    );
                    return (
                      <div key={vehicle.targetId}>
                        <CarFront size={17} aria-hidden="true" />
                        <Link href={`/v/${vehicle.slug}`}>
                          <strong>
                            {vehicle.modelYear ? `${vehicle.modelYear} ` : ""}
                            {vehicle.make} {vehicle.model}
                          </strong>
                        </Link>
                        <button
                          type="button"
                          className={
                            followed
                              ? "follow-button is-following"
                              : "follow-button"
                          }
                          aria-pressed={followed}
                          onClick={() =>
                            toggleFollow("vehicle", vehicle.targetId)
                          }
                        >
                          {followed
                            ? ja
                              ? "フォロー中"
                              : "Following"
                            : ja
                              ? "このクルマをフォロー"
                              : "Follow this vehicle"}
                        </button>
                      </div>
                    );
                  })}
                </div>
                <Link href={`/profile/${owner.id}`} className="text-link">
                  {ja ? "公開プロフィールを見る" : "View public profile"}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
