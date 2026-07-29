"use client";

import {
  journalMediaForViewer,
  journalOccurrenceLabel,
  resolveJournalDisplayContent,
} from "@mechori/core";
import type {
  ContentTranslation,
  GarageJournalPost,
  Locale,
  MaintenanceRecord,
  SocialProfile,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { ArrowRight, BookOpen, Heart, Link2, Lock, Users } from "lucide-react";
import Link from "next/link";
import { JournalMedia } from "@/components/journal-media";
import { ProfileSafetyMenu } from "@/components/profile-safety-menu";

export function JournalCard({
  journal,
  author,
  record,
  locale,
  safety,
  mediaPriority = false,
  translations = [],
  authorLinkEnabled = true,
  alphaAudience = false,
  showPrivateMedia = false,
}: {
  journal: GarageJournalPost;
  author?: SocialProfile;
  record?: MaintenanceRecord;
  locale: Locale;
  mediaPriority?: boolean;
  translations?: ContentTranslation[];
  authorLinkEnabled?: boolean;
  alphaAudience?: boolean;
  showPrivateMedia?: boolean;
  safety?: {
    muted: boolean;
    blocked: boolean;
    onToggleMute(): void;
    onToggleBlock(): void;
  };
}) {
  const ja = locale === "ja";
  const display = resolveJournalDisplayContent({ contentTranslations: translations }, journal, locale);
  const visibleMedia = journalMediaForViewer(journal, showPrivateMedia);
  return (
    <article className="journal-card">
      <div className="journal-card-meta">
        <span className="journal-avatar" aria-hidden="true">
          {(author?.displayName ?? "M").slice(0, 1).toLocaleUpperCase()}
        </span>
        <div>
          <strong>
            {author && authorLinkEnabled ? (
              <Link href={`/profile/${author.id}`}>{author.displayName}</Link>
            ) : author ? author.displayName : ja ? "不明な投稿者" : "Unknown author"} / {journal.vehicleLabel}
          </strong>
          <small>
            {journalOccurrenceLabel(journal, locale)}
          </small>
        </div>
        <div className="journal-card-actions">
          {journal.isDemo && <span className="demo-label">DEMO</span>}
          {safety && author && (
            <ProfileSafetyMenu
              profileName={author.displayName}
              muted={safety.muted}
              blocked={safety.blocked}
              ja={ja}
              onToggleMute={safety.onToggleMute}
              onToggleBlock={safety.onToggleBlock}
              reportHref={`/journal/${journal.id}/report`}
            />
          )}
        </div>
      </div>
      <JournalMedia attachments={visibleMedia} locale={locale} compact priority={mediaPriority} />
      <h3>{display.title}</h3>
      <p>{display.body}</p>
      {!display.translated && display.sourceLanguage !== locale && (
        <small className="translation-note">
          {ja ? "原文のまま表示しています" : `Shown in the original (${display.sourceLanguage})`}
        </small>
      )}
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
            : journal.visibility === "public" && alphaAudience
              ? ja ? "α参加者に公開" : "Shared with alpha participants"
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
