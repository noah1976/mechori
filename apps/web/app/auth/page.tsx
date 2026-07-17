"use client";

import { useApp } from "@/lib/app-context";
import { alphaAuthErrorMessage } from "@/lib/auth-flow";
import { sanitizeLocalReturnPath, type AuthProvider } from "@mechori/core";
import { ArrowRight, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

type AuthMode = "signin" | "signup";

const initialProviders: Array<{ id: AuthProvider; mark: string; ja: string; en: string }> = [
  { id: "google", mark: "G", ja: "Googleで続ける", en: "Continue with Google" },
];

function AuthContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { locale, signedIn, signIn, isRemoteAlpha } = useApp();
  const ja = locale === "ja";
  const [mode, setMode] = useState<AuthMode>(params.get("mode") === "signup" || params.has("invite") ? "signup" : "signin");
  const [inviteCode, setInviteCode] = useState(params.get("invite") ?? "");
  const [error, setError] = useState("");
  const returnTo = sanitizeLocalReturnPath(params.get("returnTo"));
  const displayedError = error || alphaAuthErrorMessage(params.get("error"), locale);

  useEffect(() => {
    const cleanUrl = new URL(window.location.href);
    const fragmentInvite = new URLSearchParams(cleanUrl.hash.slice(1)).get("invite");
    if (fragmentInvite) {
      cleanUrl.hash = "";
      cleanUrl.searchParams.set("mode", "signup");
      window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}`);
      queueMicrotask(() => {
        setInviteCode(fragmentInvite);
        setMode("signup");
      });
      return;
    }
    if (!params.has("invite")) return;
    cleanUrl.searchParams.delete("invite");
    cleanUrl.searchParams.set("mode", "signup");
    window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}`);
  }, [params]);

  function validateInvite(): boolean {
    if (mode === "signin" || inviteCode.trim() === "MECHORI-DEMO") return true;
    setError(ja ? "有効な招待が必要です。" : "A valid invitation is required.");
    return false;
  }

  function complete(provider: AuthProvider) {
    if (!validateInvite()) return;
    setError("");
    signIn(provider);
    router.replace(returnTo);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    if (isRemoteAlpha) {
      if (mode === "signup" && !inviteCode.trim()) {
        event.preventDefault();
        validateInvite();
      }
      return;
    }
    event.preventDefault();
    complete("google");
  }

  if (signedIn) {
    return (
      <div className="auth-page auth-complete">
        <ShieldCheck size={34} aria-hidden="true" />
        <span className="eyebrow">SIGNED IN</span>
        <h1>{ja ? "ログイン済みです" : "You are signed in"}</h1>
        <Link href={returnTo} className="primary-action">
          {ja ? "MECHORIを開く" : "Open MECHORI"}
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <header className="auth-heading">
        <span className="auth-mark">M</span>
        <span className="eyebrow">MECHORI ACCOUNT</span>
        <h1>{mode === "signin" ? (ja ? "おかえりなさい" : "Welcome back") : (ja ? "愛車の記録を始める" : "Start your vehicle history")}</h1>
        <p>
          {mode === "signin"
            ? ja ? "自分のGarageと非公開記録へ戻ります。" : "Return to your Garage and private records."
            : isRemoteAlpha
              ? ja ? "招待URLを受け取った方だけが参加できるα版です。" : "This alpha is limited to invited participants."
              : ja ? "招待URLを受け取った方だけが参加できるDEMOです。" : "This local demo is limited to invited participants."}
        </p>
      </header>

      <section className="auth-panel">
        <div className="segmented-control" role="group" aria-label={ja ? "アカウント操作" : "Account action"}>
          <button type="button" className={mode === "signin" ? "is-selected" : ""} aria-pressed={mode === "signin"} onClick={() => { setMode("signin"); setError(""); }}>
            {ja ? "ログイン" : "Sign in"}
          </button>
          <button type="button" className={mode === "signup" ? "is-selected" : ""} aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>
            {ja ? "新規登録" : "Create account"}
          </button>
        </div>

        {mode === "signup" && (
          <label className="auth-field">
            <span>{ja ? "招待コード（招待URLから自動入力）" : "Invitation code"}</span>
            <input
              type={isRemoteAlpha ? "password" : "text"}
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              autoComplete="one-time-code"
              readOnly={isRemoteAlpha && Boolean(inviteCode)}
            />
          </label>
        )}

        <form className="auth-provider-list" action="/auth/start" method="post" onSubmit={submit}>
          <input type="hidden" name="provider" value="google" />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="invite" value={mode === "signup" ? inviteCode : ""} />
          <input type="hidden" name="returnTo" value={returnTo} />
          {initialProviders.map((provider) => (
            <button type="submit" key={provider.id}>
              <span className={`provider-mark is-${provider.id}`} aria-hidden="true">{provider.mark}</span>
              <strong>{ja ? provider.ja : provider.en}</strong>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
        </form>

        {displayedError && <p className="auth-error" role="alert">{displayedError}</p>}

        <div className="auth-local-note">
          <LockKeyhole size={17} aria-hidden="true" />
          <p>
            <strong>
              {isRemoteAlpha
                ? ja ? "Googleで安全にログイン" : "Secure Google sign-in"
                : ja ? "認証画面のDEMO" : "Local authentication demo"}
            </strong>
            <span>
              {isRemoteAlpha
                ? ja ? "MECHORIが受け取るのはログインに必要な最小限の情報だけです。Googleの連絡先やDriveにはアクセスしません。" : "MECHORI requests only the minimum information needed to sign in. It does not access Google contacts or Drive."
                : ja ? "現在はGoogleログインの流れだけを再現しています。実際のGoogleアカウントには接続しません。" : "This screen models Google sign-in without contacting an external service."}
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="app-loading" />}>
      <AuthContent />
    </Suspense>
  );
}
