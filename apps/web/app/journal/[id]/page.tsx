"use client";

import { useApp } from "@/lib/app-context";
import {
  canCurrentProfileViewJournal,
  classifyJournalForKnowledge,
  isProfileBlocked,
  isProfileMuted,
  journalContentBlocksForViewer,
  journalMediaForViewer,
  journalOccurrenceLabel,
  maintenanceRecordDateLabel,
  preferSharedJournalMediaForDisplay,
  resolveJournalDisplayContent,
  type MaintenanceServiceAttributionV1,
} from "@mechori/core";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Gauge,
  Heart,
  Link2,
  Lock,
  Pencil,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  Languages,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { JournalContent } from "@/components/journal-content";
import { ProfileAvatar } from "@/components/profile-avatar";
import { ProfileSafetyMenu } from "@/components/profile-safety-menu";
import { recordOdometerLabel } from "@/components/record-card";
import { publicProfileHref } from "@/lib/public-profile-url";
import { journalDetailAvailability } from "@/lib/journal-detail-route";

export default function JournalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const {
    data,
    locale,
    signedIn,
    hydrated,
    isRemoteAlpha,
    workspaceLoadState,
    ensureSocialData,
    sharedJournalLoadState,
    sharedJournals,
    sharedProfiles,
    toggleMuteProfile,
    toggleBlockProfile,
    journalReaction,
    toggleJournalLike,
    refreshSharedJournals,
  } = useApp();
  const [showOriginal, setShowOriginal] = useState(false);
  const [reacting, setReacting] = useState(false);
  const [reactionError, setReactionError] = useState(false);
  const ja = locale === "ja";
  useEffect(() => {
    if (signedIn && isRemoteAlpha && workspaceLoadState === "ready") {
      void ensureSocialData().catch(() => undefined);
    }
  }, [ensureSocialData, isRemoteAlpha, signedIn, workspaceLoadState]);
  const localJournal = data.journals.find((item) => item.id === id);
  const sharedJournal = sharedJournals.find((item) => item.id === id);
  const journal = localJournal
    ? preferSharedJournalMediaForDisplay(localJournal, sharedJournal)
    : sharedJournal;
  const isSharedPost = !localJournal && Boolean(sharedJournal);
  const availability = journalDetailAvailability({
    hydrated,
    isRemoteAlpha,
    signedIn,
    workspaceLoadState,
    localJournal,
    sharedJournal,
    sharedLoadState: sharedJournalLoadState,
  });
  const blocked = signedIn && journal ? isProfileBlocked(data, journal.authorProfileId) : false;
  const canView = journal && (
    isSharedPost
      ? signedIn
      : signedIn
      ? canCurrentProfileViewJournal(data, journal)
      : journal.visibility === "public" && journal.moderationState === "visible"
  );
  if (availability === "loading") {
    return (
      <div className="empty-state" role="status" aria-live="polite">
        <h1>{ja ? "記録を開いています" : "Opening record"}</h1>
        <p>{ja ? "公開中の記録を確認しています。" : "Checking the shared record."}</p>
      </div>
    );
  }

  if (availability === "retryable_error") {
    return (
      <div className="empty-state">
        <h1>{ja ? "記録を読み込めませんでした" : "The record could not be loaded"}</h1>
        <p>{ja ? "一時的に公開中の記録を確認できませんでした。もう一度お試しください。" : "The shared record could not be checked just now. Please try again."}</p>
        <button type="button" className="primary-action" onClick={() => void refreshSharedJournals()}>
          {ja ? "再読み込み" : "Try again"}
        </button>
        <Link href="/feed" className="secondary-action">{ja ? "フィードへ戻る" : "Back to feed"}</Link>
      </div>
    );
  }

  if (!journal || !canView) {
    return (
      <div className="empty-state">
        <h1>{ja ? "この記録は表示できません" : "This record is unavailable"}</h1>
        <p>
          {!journal
            ? ja ? "記録が見つからないか、削除されています。" : "The record could not be found or has been removed."
            : blocked
            ? ja ? "ブロック中のプロフィールによる投稿です。" : "This post is from a blocked profile."
            : !signedIn
              ? ja ? "公開されていない記録を見るにはログインが必要です。" : "Sign in to view a record that is not public."
            : journal.moderationState === "temporarily_hidden"
              ? ja ? "この記録は運営確認により一時非公開です。" : "This record is temporarily hidden for moderation review."
            : ja ? "公開範囲または投稿状態を確認してください。" : "Check its audience or publication state."}
        </p>
        {blocked && journal && (
          <button
            type="button"
            className="secondary-action"
            onClick={() => toggleBlockProfile(journal.authorProfileId)}
          >
            {ja ? "ブロックを解除" : "Unblock profile"}
          </button>
        )}
        {!signedIn && journal && (
          <Link href={`/auth?returnTo=${encodeURIComponent(`/journal/${journal.id}`)}`} className="primary-action">
            {ja ? "ログイン" : "Sign in"}
          </Link>
        )}
        <Link href={signedIn ? "/feed" : "/"} className="secondary-action">
          {signedIn ? (ja ? "フィードへ戻る" : "Back to feed") : (ja ? "ホームへ戻る" : "Back to home")}
        </Link>
      </div>
    );
  }

  const author = data.profiles.find(
    (profile) => profile.id === journal.authorProfileId,
  ) ?? sharedProfiles.find((profile) => profile.id === journal.authorProfileId);
  const authorHref = author ? publicProfileHref(author) : undefined;
  const vehicleHref = journal.vehicleId
    ? `/garage/${encodeURIComponent(journal.vehicleId)}`
    : journal.vehicleTargetId
      ? `/v/${encodeURIComponent(journal.vehicleTargetId)}`
      : undefined;
  const record = data.records.find((item) => item.id === journal.linkedRecordId);
  const knowledgeClass = classifyJournalForKnowledge(journal);
  const ownJournal = signedIn && journal.authorProfileId === data.currentProfileId;
  const automaticDisplay = resolveJournalDisplayContent(data, journal, locale);
  const display = resolveJournalDisplayContent(data, journal, locale, showOriginal);
  const visibleMedia = journalMediaForViewer(journal, ownJournal);
  const visibleMediaIds = new Set(visibleMedia.map((attachment) => attachment.id));
  const visibleContentBlocks = journalContentBlocksForViewer(journal, ownJournal);
  const visibleBlockIds = new Set(visibleContentBlocks.map((block) => block.id));
  const displayContentBlocks = display.contentBlocks.filter(
    (block) =>
      block.type === "text"
        ? visibleBlockIds.has(block.id)
        : visibleMediaIds.has(block.mediaId),
  );
  const visibleJournal = { ...journal, media: visibleMedia };
  const reaction = journalReaction(journal.id);
  const appreciationCount = isRemoteAlpha
    ? reaction.appreciationCount
    : journal.appreciationCount;
  const canReact = signedIn && !ownJournal && isRemoteAlpha;

  return (
    <div className="page-stack journal-detail-page">
      <Link href={signedIn ? "/feed" : "/"} className="back-link">
        <ArrowLeft size={17} aria-hidden="true" />
        {signedIn ? (ja ? "フォロー中へ戻る" : "Back to following") : (ja ? "ホームへ戻る" : "Back to home")}
      </Link>

      {searchParams.get("updated") === "1" && ownJournal && (
        <div className="lovable-success" role="status">
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <strong>{ja ? "記録を更新しました。" : "Record updated."}</strong>
            <span>{ja ? "日付や内容の変更を反映しました。" : "Your date and content changes are now saved."}</span>
          </div>
        </div>
      )}

      {journal.authorProfileId === data.currentProfileId && journal.moderationState !== "visible" && (
        <div className="moderation-author-notice" role="status">
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>
              {journal.moderationState === "temporarily_hidden"
                ? ja ? "この記録は一時非公開です" : "This record is temporarily hidden"
                : ja ? "この記録は運営確認中です" : "This record is under moderation review"}
            </strong>
            <p>
              {ja
                ? "投稿者本人には表示されています。ほかの利用者への表示状態とは別です。"
                : "It remains visible to you as the author. Other viewers may see a different state."}
            </p>
          </div>
        </div>
      )}

      <article className="journal-detail">
        <header>
          <div className="journal-author-line">
            {authorHref ? (
              <Link href={authorHref} className="journal-author-link" aria-label={ja ? `${author?.displayName}のガレージ` : `${author?.displayName}'s garage`}>
                <ProfileAvatar
                  displayName={author?.displayName ?? "M"}
                  imagePath={author?.profileImagePath}
                  className="journal-avatar"
                />
              </Link>
            ) : (
              <ProfileAvatar
                displayName={author?.displayName ?? "M"}
                imagePath={author?.profileImagePath}
                className="journal-avatar"
              />
            )}
            <div>
              <strong>
                {author && (authorHref ? <Link href={authorHref}>{author.displayName}</Link> : author.displayName)}
              </strong>
              <small>{vehicleHref ? <Link href={vehicleHref} className="journal-vehicle-link">{journal.vehicleLabel}</Link> : journal.vehicleLabel}</small>
            </div>
            <div className="journal-author-actions">
              {journal.isDemo && <span className="demo-label">DEMO</span>}
              {ownJournal && (
                <>
                  <Link href={`/journal/${journal.id}/translate`} className="secondary-action">
                    <Languages size={16} aria-hidden="true" />
                    {ja ? "翻訳" : "Translation"}
                  </Link>
                  <Link href={`/journal/${journal.id}/edit`} className="secondary-action">
                    <Pencil size={16} aria-hidden="true" />
                    {ja ? "編集" : "Edit"}
                  </Link>
                </>
              )}
              {signedIn && !isSharedPost && journal.authorProfileId !== data.currentProfileId && author && (
                <ProfileSafetyMenu
                  profileName={author.displayName}
                  muted={isProfileMuted(data, author.id)}
                  blocked={blocked}
                  ja={ja}
                  onToggleMute={() => toggleMuteProfile(author.id)}
                  onToggleBlock={() => toggleBlockProfile(author.id)}
                  reportHref={`/journal/${journal.id}/report`}
                />
              )}
            </div>
          </div>
          <h1>{display.title}</h1>
          <div className="journal-detail-meta">
            {journal.eventType === "issue" && journal.issueStatus === "open" && (
              <span className="journal-issue-state">{ja ? "未解決" : "Unresolved"}</span>
            )}
            <span>
              <CalendarDays size={16} aria-hidden="true" />
              {journalOccurrenceLabel(journal, locale)}
            </span>
            <span>
              {journal.visibility === "private" ? (
                <Lock size={16} aria-hidden="true" />
              ) : journal.visibility === "followers" ? (
                <Users size={16} aria-hidden="true" />
              ) : (
                <BookOpen size={16} aria-hidden="true" />
              )}
              {journal.visibility === "public" && isRemoteAlpha
                ? ja ? "α参加者に公開" : "Shared with alpha participants"
                : visibilityLabel(journal.visibility, ja)}
            </span>
            {ownJournal && isRemoteAlpha ? (
              <span className="journal-like-status">
                <Heart size={16} aria-hidden="true" />
                {appreciationCount}
              </span>
            ) : (
              <button
                type="button"
                className={reaction.likedByMe ? "journal-like is-liked" : "journal-like"}
                aria-pressed={reaction.likedByMe}
                aria-label={ja ? "この記録にいいね" : "Like this record"}
                disabled={!canReact || reacting}
                onClick={async () => {
                  if (!canReact || reacting) return;
                  setReacting(true);
                  setReactionError(false);
                  try {
                    await toggleJournalLike(journal.id);
                  } catch {
                    setReactionError(true);
                  } finally {
                    setReacting(false);
                  }
                }}
              >
                <Heart size={16} aria-hidden="true" />
                {appreciationCount}
              </button>
            )}
          </div>
          {reactionError && <p className="form-error" role="alert">{ja ? "いいねを保存できませんでした。もう一度お試しください。" : "The like could not be saved. Please try again."}</p>}
        </header>

        {automaticDisplay.translated && (
          <div className="translation-status">
            <Languages size={17} aria-hidden="true" />
            <span>{ja ? `${languageDisplayName(display.sourceLanguage, true)}の原文から翻訳して表示中` : `Translated from ${languageDisplayName(display.sourceLanguage, false)}`}</span>
            <button type="button" onClick={() => setShowOriginal((current) => !current)}>
              {showOriginal ? (ja ? "翻訳を表示" : "Show translation") : (ja ? "原文を表示" : "Show original")}
            </button>
          </div>
        )}
        {!automaticDisplay.translated && display.sourceLanguage !== locale && (
          <div className="translation-status is-original">
            <Languages size={17} aria-hidden="true" />
            <span>{ja ? "この投稿には日本語訳がないため、原文を表示しています。" : "No English translation is available yet. Showing the original."}</span>
          </div>
        )}

        <JournalContent journal={visibleJournal} locale={locale} contentBlocks={displayContentBlocks} vehicleHref={vehicleHref} />
        {ownJournal && journal.serviceAttribution && (
          <div className="journal-service-attribution">
            <Wrench size={17} aria-hidden="true" />
            <span>{ja ? "作業した人・場所" : "Work performed by"}</span>
            <strong>{serviceAttributionLabel(journal.serviceAttribution, ja)}</strong>
          </div>
        )}
      </article>

      {record && (
        <section className="linked-record-panel">
          <div className="section-heading compact">
            <div>
              <span className="eyebrow">LINKED RECORD</span>
              <h2>{ja ? "関連する整備記録" : "Related maintenance record"}</h2>
            </div>
            <Link2 size={22} aria-hidden="true" />
          </div>
          <div className="linked-record-facts">
            {journal.displayFields.includes("service_date") && (
              <div>
                <CalendarDays size={18} aria-hidden="true" />
                <span>{ja ? "整備日" : "Service date"}</span>
                <strong>{maintenanceRecordDateLabel(record, locale)}</strong>
              </div>
            )}
            {journal.displayFields.includes("odometer") && (
              <div>
                <Gauge size={18} aria-hidden="true" />
                <span>{ja ? "走行距離" : "Odometer"}</span>
                <strong>{recordOdometerLabel(record, locale)}</strong>
              </div>
            )}
            {journal.displayFields.includes("actions") && (
              <div>
                <Wrench size={18} aria-hidden="true" />
                <span>{ja ? "整備箇所・作業" : "Maintenance actions"}</span>
                <strong>{record.actions.map((action) => action.summary).join(" / ")}</strong>
              </div>
            )}
          </div>
          {signedIn && (
            <Link href={`/records/${record.id}`} className="text-link">
              {ja ? "整備記録を確認" : "View maintenance record"}
            </Link>
          )}
        </section>
      )}

      <section className="journal-knowledge-note">
        {knowledgeClass === "related_owner_record" ? (
          <Sparkles size={22} aria-hidden="true" />
        ) : (
          <ShieldCheck size={22} aria-hidden="true" />
        )}
        <div>
          <strong>
            {knowledgeClass === "related_owner_record"
              ? ja
                ? "車両履歴に残るオーナー記録です"
                : "This owner record remains in the vehicle history"
              : ja
                ? "この記録は、まだ確認済みナレッジではありません"
                : "This record is not yet verified knowledge"}
          </strong>
          <p>
            {knowledgeClass === "related_owner_record"
              ? ja
                ? "経験として参照できますが、根拠が揃うまで原因候補や確認済みナレッジにはしません。"
                : "It can be referenced as experience, but it is not promoted to a cause candidate or verified knowledge without supporting evidence."
              : ja
                ? "車両履歴として残り、根拠や確認が揃うまで原因候補や確認済みナレッジとして検索へ出しません。"
                : "It remains in the vehicle history and is not surfaced as a cause candidate or verified knowledge until supporting evidence and review are available."}
          </p>
        </div>
      </section>
    </div>
  );
}

function serviceAttributionLabel(
  attribution: MaintenanceServiceAttributionV1,
  ja: boolean,
): string {
  if (attribution.performedByType === "self") return ja ? "自分で作業" : "DIY";
  if (attribution.performedByType === "service_provider") {
    return [attribution.providerDisplayNameSnapshot, attribution.providerLocalitySnapshot]
      .filter(Boolean)
      .join(" · ");
  }
  return ja ? "不明・記録なし" : "Unknown";
}

function visibilityLabel(value: string, ja: boolean): string {
  if (value === "private") return ja ? "非公開" : "Private";
  if (value === "followers") return ja ? "フォロワー限定" : "Followers only";
  return ja ? "公開" : "Public";
}

function languageDisplayName(language: string, ja: boolean): string {
  const base = language.split("-")[0];
  if (base === "ja") return ja ? "日本語" : "Japanese";
  if (base === "en") return ja ? "英語" : "English";
  return language;
}
