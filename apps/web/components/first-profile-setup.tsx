"use client";

import {
  completeFirstProfileSetup,
  deferDefaultNameRescue,
  firstProfileSetupIntent,
  firstProfileSetupIntentFromAuthResult,
  hasCompletedActivationOnboarding,
  hasDeferredDefaultNameRescue,
  needsProfileDisplayNameSetup,
} from "@/lib/activation-state";
import { useApp } from "@/lib/app-context";
import { initialPublicUsername, validateProfileIdentity } from "@/lib/profile-identity";
import { ArrowRight, LoaderCircle, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function FirstProfileSetup() {
  const { authSession } = useApp();
  const profileId = authSession.status === "signed_in" ? authSession.profileId : "";

  if (!profileId) return null;
  return <FirstProfileSetupForProfile key={profileId} profileId={profileId} />;
}

function FirstProfileSetupForProfile({ profileId }: { profileId: string }) {
  const { data, updateProfileIdentity, workspaceLoadState } = useApp();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deferred, setDeferred] = useState(() => hasDeferredDefaultNameRescue(profileId));
  const profile = workspaceLoadState === "ready"
    ? data.profiles.find((item) => item.id === data.currentProfileId)
    : undefined;
  const pendingIntent = typeof window === "undefined" ? undefined : firstProfileSetupIntentFromAuthResult(
    new URLSearchParams(window.location.search).get("authEvent"),
    new URLSearchParams(window.location.search).get("inviteCompleted") === "1",
  );
  const intent = firstProfileSetupIntent(profileId) ?? pendingIntent;
  const defaultName = needsProfileDisplayNameSetup(profile?.displayName);
  const [displayName, setDisplayName] = useState(() => defaultName ? "" : profile?.displayName ?? "");

  if (workspaceLoadState !== "ready" || !profile || !defaultName) return null;
  if (intent === "signup" && !hasCompletedActivationOnboarding(profileId)) return null;
  if (!intent && deferred) return null;

  const configuredProfile = profile;
  const firstSetup = Boolean(intent);
  const title = firstSetup ? "MECHORIで使う名前を決めよう" : "表示名を登録しよう！";
  const description = firstSetup
    ? "友だちや他のオーナーから分かる名前を設定してください。"
    : "いまは仮の名前になっています。友だちから誰なのか分かる名前に変更しましょう。";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const validation = validateProfileIdentity({
      displayName,
      publicUsername: configuredProfile.publicUsername ?? initialPublicUsername(configuredProfile.id),
      bio: configuredProfile.bio,
    });
    if (!validation.valid) {
      setError(validation.errors.displayName === "required"
        ? "表示名を入力してください。"
        : "表示名は80文字以内で入力してください。");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await updateProfileIdentity(
        validation.normalized.displayName,
        validation.normalized.publicUsername,
        validation.normalized.bio,
      );
      completeFirstProfileSetup(profileId);
      if (firstSetup) {
        const hasVehicle = data.vehicles.some((vehicle) => vehicle.ownerProfileId === data.currentProfileId);
        router.replace(hasVehicle ? "/garage" : "/garage/new");
      }
    } catch (caught) {
      setError(caught instanceof Error && caught.message === "public_username_taken"
        ? "名前を保存できませんでした。もう一度お試しください。"
        : "表示名を保存できませんでした。通信を確認して、もう一度お試しください。");
    } finally {
      setSaving(false);
    }
  }

  function defer() {
    deferDefaultNameRescue(profileId);
    setDeferred(true);
  }

  return (
    <div className="profile-setup-layer" role="presentation">
      <section className="profile-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-setup-title">
        <UserRound size={28} aria-hidden="true" />
        <div>
          <span className="eyebrow">YOUR PROFILE</span>
          <h2 id="profile-setup-title">{title}</h2>
          <p>{description}</p>
        </div>
        <form onSubmit={submit} noValidate>
          <label>
            <span>表示名</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              maxLength={80}
              disabled={saving}
              autoFocus
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="profile-setup-actions">
            {firstSetup ? <span /> : (
              <button type="button" className="text-link" onClick={defer} disabled={saving}>あとで</button>
            )}
            <button type="submit" className="primary-action" disabled={saving}>
              {saving ? <LoaderCircle className="spin" size={17} aria-hidden="true" /> : null}
              {firstSetup ? "この名前ではじめる" : "この名前で登録"}
              {!saving && <ArrowRight size={17} aria-hidden="true" />}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
