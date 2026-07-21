"use client";

import { DemoNotice } from "@/components/demo-notice";
import { useApp } from "@/lib/app-context";
import type { ProfileDisplayField, ProfileVisibility, SocialProfile } from "@mechori/core";
import { Eye, ImageIcon, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const fields: ProfileDisplayField[] = ["role", "bio", "vehicles", "ownership_duration", "journal_count"];

export default function ProfilePrivacySettingsPage() {
  const { data } = useApp();
  const profile = data.profiles.find((item) => item.id === data.currentProfileId);
  if (!profile) return null;
  return <PrivacySettingsForm key={profile.id} profile={profile} />;
}

function PrivacySettingsForm({ profile }: { profile: SocialProfile }) {
  const { locale, updateProfilePrivacy } = useApp();
  const [visibility, setVisibility] = useState<ProfileVisibility>(profile.visibility);
  const [displayFields, setDisplayFields] = useState<ProfileDisplayField[]>(profile.displayFields);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"" | "saved" | "error">("");
  const ja = locale === "ja";

  function toggleField(field: ProfileDisplayField) {
    setStatus("");
    setDisplayFields((current) => current.includes(field) ? current.filter((item) => item !== field) : [...current, field]);
  }

  async function save() {
    setSaving(true);
    setStatus("");
    try {
      await updateProfilePrivacy(visibility, displayFields);
      setStatus("saved");
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <DemoNotice />
      <header className="page-header"><div><span className="eyebrow">PRIVACY & SAFETY</span><h1>{ja ? "プロフィールの公開範囲" : "Profile visibility"}</h1><p>{ja ? "愛車の記録、整備記録、写真とは別にプロフィールページの見え方を設定します。" : "Control profile-page visibility independently from vehicle records, maintenance records, and photos."}</p></div><ShieldCheck size={28} aria-hidden="true" /></header>

      <section className="settings-section">
        <div className="section-heading compact"><div><span className="eyebrow">AUDIENCE</span><h2>{ja ? "プロフィールを見ることができる人" : "Who can view your profile"}</h2></div></div>
        <div className="segmented-control profile-visibility-control" role="group" aria-label={ja ? "プロフィール公開範囲" : "Profile visibility"}>
          {(["private", "followers", "public"] as ProfileVisibility[]).map((item) => (
            <button key={item} type="button" className={visibility === item ? "is-selected" : ""} aria-pressed={visibility === item} onClick={() => { setVisibility(item); setStatus(""); }}>
              {visibilityLabel(item, ja)}
            </button>
          ))}
        </div>
        <p className="settings-help">{visibilityDescription(visibility, ja)}</p>
      </section>

      <section className="settings-section">
        <div className="section-heading compact"><div><span className="eyebrow">FIELDS</span><h2>{ja ? "表示する項目" : "Visible fields"}</h2></div></div>
        <div className="privacy-field-list">
          {fields.map((field) => (
            <label key={field}><input type="checkbox" checked={displayFields.includes(field)} onChange={() => toggleField(field)} /><span><strong>{fieldLabel(field, ja)}</strong><small>{fieldDescription(field, ja)}</small></span></label>
          ))}
        </div>
        <p className="legal-note">{ja ? "表示名は投稿者を識別するため常に表示されます。VIN、ナンバープレート、正確な保管場所は設定対象にも含めません。" : "Your display name remains visible to identify authorship. VIN, registration plate, and precise storage location are never available as profile fields."}</p>
      </section>

      <div className="settings-actions">
        <Link href={`/profile/${profile.id}`} className="secondary-action"><Eye size={17} />{ja ? "プロフィールを確認" : "Preview profile"}</Link>
        <button type="button" className="primary-action" onClick={save} disabled={saving}><Save size={17} />{saving ? (ja ? "保存中" : "Saving") : (ja ? "設定を保存" : "Save settings")}</button>
      </div>
      {status && <p className={`local-draft-status ${status === "error" ? "is-error" : "is-restored"}`} role={status === "error" ? "alert" : "status"}>{status === "saved" ? (ja ? "端末内へ保存しました" : "Saved on this device") : (ja ? "設定を保存できませんでした" : "Settings could not be saved")}</p>}

      <section className="safety-tools">
        <Link href="/privacy-review"><ImageIcon size={20} /><span><strong>{ja ? "画像の公開前チェック" : "Pre-publish image review"}</strong><small>{ja ? "マスク候補と目視確認の流れ" : "Candidate redaction and manual review flow"}</small></span></Link>
        <Link href="/moderation"><ShieldCheck size={20} /><span><strong>{ja ? "運営フローDEMO" : "Moderation workflow DEMO"}</strong><small>{ja ? "通報、確認、一時非公開、復元" : "Reports, review, temporary hiding, and restoration"}</small></span></Link>
      </section>
    </div>
  );
}

function visibilityLabel(value: ProfileVisibility, ja: boolean) {
  if (value === "private") return ja ? "自分だけ" : "Only me";
  if (value === "followers") return ja ? "フォロワー" : "Followers";
  return ja ? "公開" : "Public";
}

function visibilityDescription(value: ProfileVisibility, ja: boolean) {
  if (value === "private") return ja ? "プロフィールページは自分だけが確認できます。公開中の愛車記録の公開範囲は変わりません。" : "Only you can open the profile page. Public vehicle-record visibility is unchanged.";
  if (value === "followers") return ja ? "プロフィールを直接フォローしている利用者だけが確認できます。車種・車両フォローは含みません。" : "Only direct profile followers can view it. Model and vehicle follows do not count.";
  return ja ? "未ログインの閲覧者を含め、公開プロフィールとして表示します。" : "The profile is visible publicly, including to signed-out visitors.";
}

function fieldLabel(field: ProfileDisplayField, ja: boolean) {
  const labels: Record<ProfileDisplayField, [string, string]> = { role: ["役割", "Role"], bio: ["自己紹介", "Bio"], vehicles: ["愛車の一般情報", "Vehicle overview"], ownership_duration: ["所有期間", "Ownership duration"], journal_count: ["公開中の愛車記録数", "Public vehicle record count"] };
  return labels[field][ja ? 0 : 1];
}

function fieldDescription(field: ProfileDisplayField, ja: boolean) {
  const labels: Record<ProfileDisplayField, [string, string]> = { role: ["オーナー／メカニック", "Owner or mechanic"], bio: ["プロフィールに入力した紹介文", "Your profile introduction"], vehicles: ["メーカー、車種、年式のみ", "Make, model, and model year only"], ownership_duration: ["開始年・月から算出した期間", "Duration derived from start year and month"], journal_count: ["公開中の投稿数だけ", "Only currently public posts"] };
  return labels[field][ja ? 0 : 1];
}
