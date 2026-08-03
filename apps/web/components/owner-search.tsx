"use client";

import { useApp } from "@/lib/app-context";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  searchAlphaPublicOwners,
  type AlphaPublicOwnerSummary,
} from "@/lib/alpha-public-owners";
import { isProfileBlocked } from "@mechori/core";
import { ArrowRight, LoaderCircle, Search, UserRound } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

type SearchState = "idle" | "loading" | "success" | "error";

export function OwnerSearch() {
  const { data, locale, signedIn, isRemoteAlpha } = useApp();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlphaPublicOwnerSummary[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const ja = locale === "ja";

  if (!signedIn || !isRemoteAlpha) return null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      setResults([]);
      setState("idle");
      return;
    }
    setState("loading");
    try {
      const owners = await searchAlphaPublicOwners(normalizedQuery);
      setResults(
        owners.filter((owner) => !isProfileBlocked(data, owner.id)),
      );
      setState("success");
    } catch {
      setResults([]);
      setState("error");
    }
  }

  return (
    <section className="owner-search-panel" aria-labelledby="owner-search-heading">
      <div className="owner-search-heading">
        <UserRound size={22} aria-hidden="true" />
        <div>
          <span className="eyebrow">FIND AN OWNER</span>
          <h2 id="owner-search-heading">
            {ja ? "人・クルマを検索" : "Search people and vehicles"}
          </h2>
          <p>
            {ja
              ? "表示名または @ユーザー名から、車種が違う友人も探せます。"
              : "Find friends across vehicle types by display name or @username."}
          </p>
        </div>
      </div>
      <form className="owner-search-form" onSubmit={submit}>
        <label>
          <span className="sr-only">
            {ja ? "表示名または公開ユーザー名" : "Display name or public username"}
          </span>
          <Search size={19} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={ja ? "表示名または @ユーザー名" : "Display name or @username"}
            maxLength={80}
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          className="primary-action"
          disabled={state === "loading" || !query.trim()}
        >
          {state === "loading" ? (
            <LoaderCircle className="loading-spinner" size={18} aria-hidden="true" />
          ) : (
            <Search size={18} aria-hidden="true" />
          )}
          {ja ? "探す" : "Search"}
        </button>
      </form>

      {state === "error" && (
        <p className="form-error" role="alert">
          {ja
            ? "オーナーを検索できませんでした。時間をおいてもう一度お試しください。"
            : "Owner search failed. Please try again shortly."}
        </p>
      )}
      {state === "success" && results.length === 0 && (
        <p className="owner-search-empty">
          {ja
            ? "一致する公開オーナーは見つかりませんでした。"
            : "No matching public owner was found."}
        </p>
      )}
      {results.length > 0 && (
        <div className="owner-search-results">
          {results.map((owner) => (
            <Link key={owner.id} href={`/profile/${owner.id}`}>
              <ProfileAvatar
                displayName={owner.displayName}
                imagePath={owner.profileImagePath}
                className="owner-search-avatar"
              />
              <span>
                <strong>{owner.displayName}</strong>
                {owner.publicUsername && <small>@{owner.publicUsername}</small>}
                <small>
                  {ja
                    ? `公開中の愛車 ${owner.vehicleCount}台`
                    : `${owner.vehicleCount} shared ${owner.vehicleCount === 1 ? "vehicle" : "vehicles"}`}
                </small>
              </span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
