"use client";

import type {
  GarageJournalPost,
  Locale,
  MaintenanceRecord,
  SocialProfile,
} from "@mechory/core";
import { translate } from "@mechory/i18n";
import { ArrowRight, BookOpen, Heart, Link2, Lock, Users } from "lucide-react";
import Link from "next/link";

export function JournalCard({
  journal,
  author,
  record,
  locale,
}: {
  journal: GarageJournalPost;
  author?: SocialProfile;
  record?: MaintenanceRecord;
  locale: Locale;
}) {
  const ja = locale === "ja";
  return (
    <article className="journal-card">
      <div className="journal-card-meta">
        <span className="journal-avatar" aria-hidden="true">
          {(author?.displayName ?? "M").slice(0, 1).toLocaleUpperCase()}
        </span>
        <div>
          <strong>{author?.displayName ?? (ja ? "不明な投稿者" : "Unknown author")}</strong>
          <small>
            {journal.vehicleLabel} · {formatDate(journal.publishedAt ?? journal.createdAt, locale)}
          </small>
        </div>
        {journal.isDemo && <span className="demo-label">DEMO</span>}
      </div>
      <h3>{journal.title}</h3>
      <p>{journal.bodyOriginal}</p>
      {record && (
        <div className="journal-record-link">
          <Link2 size={15} aria-hidden="true" />
          <span>{ja ? "整備記録にリンク" : "Linked maintenance record"}</span>
          <strong>{record.summary}</strong>
        </div>
      )}
      <footer>
        <span>
          {journal.visibility === "private" ? (
            <Lock size={15} aria-hidden="true" />
          ) : journal.visibility === "followers" ? (
            <Users size={15} aria-hidden="true" />
          ) : (
            <BookOpen size={15} aria-hidden="true" />
          )}
          {journal.visibility === "followers"
            ? translate(locale, "followersOnly")
            : translate(locale, journal.visibility)}
        </span>
        <span>
          <Heart size={15} aria-hidden="true" />
          {journal.appreciationCount}
        </span>
        <Link href={`/journal/${journal.id}`} className="text-link">
          {ja ? "読む" : "Read"}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}

function formatDate(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
