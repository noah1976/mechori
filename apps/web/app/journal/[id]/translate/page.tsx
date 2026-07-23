"use client";

import {
  existingJournalTranslationDraft,
  type GarageJournalPost,
  type JournalContentBlock,
  type JournalTranslationDraft,
} from "@mechori/core";
import { ArrowLeft, Languages, Save } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useApp } from "@/lib/app-context";

export default function JournalTranslationPage() {
  const { id } = useParams<{ id: string }>();
  const { data, locale, signedIn } = useApp();
  const journal = data.journals.find((item) => item.id === id);
  const ja = locale === "ja";

  if (!journal || !signedIn || journal.authorProfileId !== data.currentProfileId) {
    return (
      <div className="empty-state">
        <h1>{ja ? "翻訳を編集できません" : "Translation cannot be edited"}</h1>
        <p>{ja ? "投稿が見つからないか、投稿者本人の記録ではありません。" : "The post is missing or does not belong to the current profile."}</p>
        <Link href="/garage" className="primary-action">{ja ? "My Garageへ戻る" : "Back to My Garage"}</Link>
      </div>
    );
  }

  return <JournalTranslationEditor journal={journal} />;
}

function JournalTranslationEditor({ journal }: { journal: GarageJournalPost }) {
  const { data, locale, updateJournalTranslation } = useApp();
  const router = useRouter();
  const ja = locale === "ja";
  const targetLanguage = journal.sourceLanguage.split("-")[0] === "ja" ? "en" : "ja";
  const [draft, setDraft] = useState<JournalTranslationDraft>(() =>
    existingJournalTranslationDraft(data, journal, targetLanguage),
  );
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const textBlocks = journal.contentBlocks.filter(
    (block): block is Extract<JournalContentBlock, { type: "text" }> =>
      block.type === "text" && Boolean(block.text.trim()),
  );
  const incomplete = !draft.title.trim() || textBlocks.some((block) => !draft.textBlocks[block.id]?.trim());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    if (incomplete || saving) return;
    setSaving(true);
    setError("");
    try {
      await updateJournalTranslation(journal.id, draft);
      router.push(`/journal/${journal.id}?translation=updated`);
    } catch {
      setError(ja ? "翻訳を保存できませんでした。入力内容を確認してください。" : "The translation could not be saved. Check the entered text.");
      setSaving(false);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <Link href={`/journal/${journal.id}`} className="back-link"><ArrowLeft size={17} />{ja ? "記事へ戻る" : "Back to post"}</Link>
      <header className="page-header">
        <div>
          <span className="eyebrow">TRANSLATION</span>
          <h1>{ja ? "別の言語でも読めるようにする" : "Make this post readable in another language"}</h1>
          <p>{ja ? "原文は保持したまま、英語版を追加します。翻訳がない場合は原文であることを明示して表示します。" : "The original remains unchanged while you add a Japanese version."}</p>
        </div>
        <Languages size={28} aria-hidden="true" />
      </header>

      <form className="translation-editor" onSubmit={submit} noValidate>
        <div className="translation-language-line">
          <span><small>{ja ? "原文" : "Original"}</small><strong>{languageName(journal.sourceLanguage, ja)}</strong></span>
          <span aria-hidden="true">→</span>
          <span><small>{ja ? "翻訳" : "Translation"}</small><strong>{languageName(targetLanguage, ja)}</strong></span>
        </div>

        <section>
          <label className="field">
            {ja ? "翻訳タイトル" : "Translated title"}
            <small className="source-copy">{journal.title}</small>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} aria-invalid={submitted && !draft.title.trim()} />
            {submitted && !draft.title.trim() && <small className="field-error">{ja ? "翻訳タイトルを入力してください" : "Enter the translated title"}</small>}
          </label>
        </section>

        {textBlocks.map((block, index) => (
          <section key={block.id}>
            <label className="field">
              {ja ? `本文 ${index + 1}` : `Text block ${index + 1}`}
              <small className="source-copy">{block.text}</small>
              <textarea value={draft.textBlocks[block.id] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, textBlocks: { ...current.textBlocks, [block.id]: event.target.value } }))} aria-invalid={submitted && !draft.textBlocks[block.id]?.trim()} />
              {submitted && !draft.textBlocks[block.id]?.trim() && <small className="field-error">{ja ? "この段落の翻訳を入力してください" : "Translate this text block"}</small>}
            </label>
          </section>
        ))}

        <div className="translation-privacy-note">
          {ja ? "この画面では外部AIへ文章を送信しません。入力した翻訳だけをMECHORIに保存します。" : "This screen does not send the post to an external AI. Only the translation you enter is saved."}
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="form-actions"><button type="submit" className="primary-action" disabled={saving}><Save size={17} />{saving ? (ja ? "保存中…" : "Saving…") : (ja ? "翻訳を保存" : "Save translation")}</button></div>
      </form>
    </div>
  );
}

function languageName(language: string, ja: boolean): string {
  const base = language.split("-")[0];
  if (base === "ja") return ja ? "日本語" : "Japanese";
  if (base === "en") return ja ? "英語" : "English";
  return language;
}
