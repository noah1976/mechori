"use client";

import { DemoNotice } from "@/components/demo-notice";
import { useApp } from "@/lib/app-context";
import { validateProfileIdentity } from "@/lib/profile-identity";
import { Eye, LoaderCircle, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type SaveStatus = "" | "saved" | "taken" | "error";

export default function ProfileSettingsPage() {
  const { data } = useApp();
  const profile = data.profiles.find(
    (item) => item.id === data.currentProfileId,
  );
  if (!profile) return null;
  return <ProfileIdentityForm key={profile.id} />;
}

function ProfileIdentityForm() {
  const { data, locale, signOut, updateProfileIdentity } = useApp();
  const router = useRouter();
  const profile = data.profiles.find(
    (item) => item.id === data.currentProfileId,
  )!;
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [publicUsername, setPublicUsername] = useState(
    profile.publicUsername ?? "",
  );
  const [bio, setBio] = useState(profile.bio ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("");
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const ja = locale === "ja";
  const validation = validateProfileIdentity({
    displayName,
    publicUsername,
    bio,
  });

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setStatus("");
    if (!validation.valid) return;
    setSaving(true);
    try {
      await updateProfileIdentity(
        validation.normalized.displayName,
        validation.normalized.publicUsername,
        validation.normalized.bio,
      );
      setDisplayName(validation.normalized.displayName);
      setPublicUsername(validation.normalized.publicUsername);
      setBio(validation.normalized.bio);
      setStatus("saved");
    } catch (error) {
      setStatus(
        error instanceof Error && error.message === "public_username_taken"
          ? "taken"
          : "error",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack narrow-page">
      <DemoNotice />
      <header className="page-header">
        <div>
          <span className="eyebrow">PROFILE</span>
          <h1>{ja ? "プロフィール編集" : "Edit profile"}</h1>
          <p>
            {ja
              ? "表示名は重複できます。公開ユーザー名は、友人があなたを見つけるための固有IDです。"
              : "Display names may be shared. Your public username is the unique ID friends use to find you."}
          </p>
        </div>
        <UserRound size={29} aria-hidden="true" />
      </header>

      <form className="settings-section" onSubmit={save} noValidate>
        <label
          className={
            submitted && validation.errors.displayName
              ? "field has-error"
              : "field"
          }
        >
          <span>{ja ? "表示名" : "Display name"}</span>
          <input
            value={displayName}
            onChange={(event) => {
              setDisplayName(event.target.value);
              setStatus("");
            }}
            maxLength={80}
            autoComplete="name"
          />
          <small>
            {submitted && validation.errors.displayName
              ? ja
                ? "表示名を1〜80文字で入力してください。"
                : "Enter a display name between 1 and 80 characters."
              : ja
                ? "他の利用者と同じ表示名も使用できます。"
                : "The same display name may be used by other people."}
          </small>
        </label>

        <label
          className={submitted && validation.errors.bio ? "field has-error" : "field"}
        >
          <span>{ja ? "自己紹介" : "Bio"}</span>
          <textarea
            value={bio}
            onChange={(event) => {
              setBio(event.target.value);
              setStatus("");
            }}
            maxLength={300}
            rows={5}
            placeholder={ja ? "愛車やクルマとの過ごし方を、無理のない範囲で。" : "Share a little about your vehicles and motoring life."}
          />
          <small>
            {submitted && validation.errors.bio
              ? ja
                ? "300文字以内で、メールアドレスや電話番号を含めずに入力してください。"
                : "Use up to 300 characters without email addresses or phone numbers."
              : ja
                ? `公開プロフィールに表示されます。個人情報は入力しないでください。${bio.length}/300`
                : `Shown on your public profile. Do not enter personal contact details. ${bio.length}/300`}
          </small>
        </label>

        <label
          className={
            submitted && validation.errors.publicUsername
              ? "field has-error"
              : "field"
          }
        >
          <span>{ja ? "公開ユーザー名" : "Public username"}</span>
          <span className="username-input">
            <span aria-hidden="true">@</span>
            <input
              value={publicUsername}
              onChange={(event) => {
                setPublicUsername(event.target.value);
                setStatus("");
              }}
              minLength={3}
              maxLength={30}
              pattern="[a-z0-9_]{3,30}"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="username"
            />
          </span>
          <small>
            {submitted && validation.errors.publicUsername
              ? ja
                ? "半角英小文字・数字・アンダースコアで3〜30文字入力してください。"
                : "Use 3–30 lowercase letters, numbers, or underscores."
              : ja
                ? "保存時に小文字へ統一されます。ログイン用IDではありません。"
                : "Saved in lowercase. This is not your sign-in ID."}
          </small>
        </label>

        {status === "taken" && (
          <p className="form-error" role="alert">
            {ja
              ? "この公開ユーザー名はすでに使われています。別の名前をお試しください。"
              : "That public username is already in use. Try another one."}
          </p>
        )}
        {status === "error" && (
          <p className="form-error" role="alert">
            {ja
              ? "プロフィールを保存できませんでした。時間をおいてもう一度お試しください。"
              : "Profile changes could not be saved. Please try again shortly."}
          </p>
        )}
        {status === "saved" && (
          <p className="local-draft-status" role="status">
            {ja ? "プロフィールを保存しました。" : "Profile saved."}
          </p>
        )}

        <div className="settings-actions">
          <Link
            href={`/profile/${profile.id}`}
            className="secondary-action"
          >
            <Eye size={17} aria-hidden="true" />
            {ja ? "プロフィールを確認" : "Preview profile"}
          </Link>
          <button type="submit" className="primary-action" disabled={saving}>
            {saving ? (
              <LoaderCircle
                className="loading-spinner"
                size={17}
                aria-hidden="true"
              />
            ) : (
              <Save size={17} aria-hidden="true" />
            )}
            {saving
              ? ja
                ? "保存中"
                : "Saving"
              : ja
                ? "変更を保存"
                : "Save changes"}
          </button>
        </div>
      </form>

      <Link href="/settings/privacy" className="settings-navigation-row">
        <ShieldCheck size={20} aria-hidden="true" />
        <span>
          <strong>{ja ? "公開範囲と安全設定" : "Visibility and safety"}</strong>
          <small>
            {ja
              ? "公開される情報と、安全に投稿するための注意点を確認します。"
              : "Review what is public and how to post safely."}
          </small>
        </span>
      </Link>

      <section className="settings-danger-zone" aria-labelledby="sign-out-heading">
        <div>
          <strong id="sign-out-heading">{ja ? "この端末からログアウト" : "Sign out on this device"}</strong>
          <p>
            {ja
              ? "愛車や記録は削除されません。もう一度利用するときはGoogleでログインできます。"
              : "Your vehicles and records will not be deleted. You can sign in with Google again."}
          </p>
        </div>
        <button type="button" className="secondary-action" onClick={() => { setSignOutError(false); setConfirmingSignOut(true); }}>
          <LogOut size={17} aria-hidden="true" />
          {ja ? "ログアウト" : "Sign out"}
        </button>
      </section>

      {confirmingSignOut && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirmation-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-sign-out-title">
            <h2 id="confirm-sign-out-title">{ja ? "ログアウトしますか？" : "Sign out?"}</h2>
            <p>
              {ja
                ? "MECHORIからログアウトします。保存済みのデータは残ります。"
                : "You will be signed out of MECHORI. Saved data will remain."}
            </p>
            {signOutError && (
              <p className="form-error" role="alert">
                {ja ? "ログアウトできませんでした。もう一度お試しください。" : "Sign-out failed. Please try again."}
              </p>
            )}
            <div className="settings-actions">
              <button type="button" className="secondary-action" disabled={signingOut} onClick={() => setConfirmingSignOut(false)}>
                {ja ? "キャンセル" : "Cancel"}
              </button>
              <button
                type="button"
                className="primary-action"
                disabled={signingOut}
                onClick={async () => {
                  setSigningOut(true);
                  try {
                    await signOut();
                    router.replace("/auth/signed-out");
                  } catch {
                    setSignOutError(true);
                  } finally {
                    setSigningOut(false);
                  }
                }}
              >
                {signingOut && <LoaderCircle className="spin" size={17} aria-hidden="true" />}
                {ja ? "ログアウトする" : "Sign out"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
