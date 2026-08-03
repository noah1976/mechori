"use client";

import { DemoNotice } from "@/components/demo-notice";
import { useApp } from "@/lib/app-context";
import { Eye, ImageIcon, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ProfilePrivacySettingsPage() {
  const { data, locale } = useApp();
  const profile = data.profiles.find((item) => item.id === data.currentProfileId);
  if (!profile) return null;
  const ja = locale === "ja";

  return (
    <div className="page-stack narrow-page">
      <DemoNotice />
      <header className="page-header">
        <div>
          <span className="eyebrow">PRIVACY & SAFETY</span>
          <h1>{ja ? "公開情報とプライバシー" : "Public information and privacy"}</h1>
          <p>{ja ? "プロフィールの基本情報と、愛車・投稿ごとの公開範囲は別に扱います。" : "Basic profile information is separate from vehicle and post visibility."}</p>
        </div>
        <ShieldCheck size={28} aria-hidden="true" />
      </header>

      <section className="settings-section">
        <div className="section-heading compact">
          <div><span className="eyebrow">PUBLIC PROFILE</span><h2>{ja ? "プロフィールの外枠は公開されます" : "Your profile shell is public"}</h2></div>
        </div>
        <p className="settings-help">
          {ja
            ? "表示名、@username、入力した自己紹介は、他の利用者から確認できます。公開中の愛車や投稿がない場合も、プロフィール自体は表示されます。"
            : "Your display name, @username, and bio are visible to others. The profile remains visible even when you have no public vehicles or posts."}
        </p>
        <p className="legal-note">
          {ja
            ? "メールアドレス、電話番号、住所、内部ID、車台番号、非公開メモ、原本書類、管理者メモは公開しません。"
            : "Email addresses, phone numbers, addresses, internal IDs, VINs, private notes, original documents, and admin notes are not public."}
        </p>
        <Link href={`/profile/${profile.id}`} className="secondary-action"><Eye size={17} />{ja ? "プロフィールを確認" : "View profile"}</Link>
      </section>

      <section className="settings-section">
        <div className="section-heading compact">
          <div><span className="eyebrow">CONTENT VISIBILITY</span><h2>{ja ? "愛車と投稿は個別に管理" : "Control vehicles and posts individually"}</h2></div>
        </div>
        <p className="settings-help">
          {ja
            ? "既存の愛車・投稿の公開範囲は変更しません。公開範囲を選べる項目は、保存時に選んだ内容に従います。"
            : "Existing vehicle and post visibility is unchanged. Items with audience controls follow the visibility selected when saved."}
        </p>
      </section>

      <section className="safety-tools">
        <Link href="/privacy-review"><ImageIcon size={20} /><span><strong>{ja ? "画像の公開前チェック" : "Pre-publish image review"}</strong><small>{ja ? "ナンバープレートや周囲の写り込みを確認" : "Review plates and surrounding details"}</small></span></Link>
        <Link href="/moderation"><ShieldCheck size={20} /><span><strong>{ja ? "安全・通報について" : "Safety and reporting"}</strong><small>{ja ? "通報、確認、一時非公開、復元" : "Reports, review, temporary hiding, and restoration"}</small></span></Link>
      </section>
    </div>
  );
}
