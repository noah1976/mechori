"use client";

import { useApp } from "@/lib/app-context";
import { alphaAuthErrorMessage } from "@/lib/auth-flow";
import { pushAnalyticsEvent } from "@/lib/analytics";
import { sanitizeLocalReturnPath, type AuthProvider } from "@mechori/core";
import { translate } from "@mechori/i18n";
import { ArrowRight, CircleCheck, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

type AuthMode = "signin" | "signup";

const initialProviders: Array<{ id: AuthProvider; mark: string }> = [
  { id: "google", mark: "G" },
];

function AuthContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { locale, signedIn, signIn, isRemoteAlpha } = useApp();
  const [mode, setMode] = useState<AuthMode>(params.get("mode") === "signup" || params.has("invite") ? "signup" : "signin");
  const [inviteCode, setInviteCode] = useState(params.get("invite") ?? "");
  const [error, setError] = useState("");
  const returnTo = sanitizeLocalReturnPath(params.get("returnTo"));
  const displayedError = error || alphaAuthErrorMessage(params.get("error"), locale);
  const invitedSignup = mode === "signup" && Boolean(inviteCode.trim());

  useEffect(() => {
    const cleanUrl = new URL(window.location.href);
    const fragmentInvite = new URLSearchParams(cleanUrl.hash.slice(1)).get("invite");
    if (fragmentInvite) {
      if (params.get("inviteLanding") !== "1") {
        const inviteLandingUrl = new URL("/join", window.location.origin);
        inviteLandingUrl.hash = new URLSearchParams({ invite: fragmentInvite }).toString();
        window.location.replace(`${inviteLandingUrl.pathname}${inviteLandingUrl.hash}`);
        return;
      }
      pushAnalyticsEvent("invite_opened");
      cleanUrl.hash = "";
      cleanUrl.searchParams.delete("inviteLanding");
      window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}`);
      queueMicrotask(() => {
        setInviteCode(fragmentInvite);
        setMode(params.get("mode") === "signin" ? "signin" : "signup");
      });
      return;
    }
    if (!params.has("invite")) return;
    pushAnalyticsEvent("invite_opened");
    cleanUrl.searchParams.delete("invite");
    cleanUrl.searchParams.set("mode", "signup");
    window.history.replaceState(null, "", `${cleanUrl.pathname}${cleanUrl.search}`);
  }, [params]);

  function validateInvite(): boolean {
    if (mode === "signin" || inviteCode.trim() === "MECHORI-DEMO") return true;
    setError(translate(locale, "inviteRequiredForSignup"));
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

  if (signedIn && !inviteCode) {
    return (
      <div className="auth-page auth-complete">
        <ShieldCheck size={34} aria-hidden="true" />
        <span className="eyebrow">SIGNED IN</span>
        <h1>{translate(locale, "signedIn")}</h1>
        <Link href={returnTo} className="primary-action">
          {translate(locale, "openMechori")}
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
        <h1>{translate(locale, mode === "signin" ? "welcomeBack" : "startVehicleHistory")}</h1>
        <p>
          {invitedSignup
            ? translate(locale, "invitedSignupInstruction")
            : mode === "signin"
            ? translate(locale, "returnToGarage")
            : isRemoteAlpha
              ? translate(locale, "invitedAlphaOnly")
              : translate(locale, "invitedDemoOnly")}
        </p>
      </header>

      <section className="auth-panel">
        {!invitedSignup && (
          <div className="segmented-control has-two-options" role="group" aria-label={translate(locale, "accountAction")}>
            <button type="button" className={mode === "signin" ? "is-selected" : ""} aria-pressed={mode === "signin"} onClick={() => { setMode("signin"); setError(""); }}>
              {translate(locale, "signIn")}
            </button>
            <button type="button" className={mode === "signup" ? "is-selected" : ""} aria-pressed={mode === "signup"} onClick={() => { setMode("signup"); setError(""); }}>
              {translate(locale, "createAccount")}
            </button>
          </div>
        )}

        {mode === "signup" && !invitedSignup && (
          <label className="auth-field">
            <span>{translate(locale, "invitationCode")}</span>
            <input
              type={isRemoteAlpha ? "password" : "text"}
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
              autoComplete="one-time-code"
              readOnly={isRemoteAlpha && Boolean(inviteCode)}
            />
          </label>
        )}

        {invitedSignup && (
          <div className="auth-invite-ready" role="status">
            <CircleCheck size={19} aria-hidden="true" />
            <p>
              <strong>{translate(locale, "invitationConfirmed")}</strong>
              <span>{translate(locale, "invitationConfirmedNotice")}</span>
            </p>
          </div>
        )}

        <form className="auth-provider-list" action="/auth/start" method="post" onSubmit={submit}>
          <input type="hidden" name="provider" value="google" />
          <input type="hidden" name="mode" value={mode} />
          <input type="hidden" name="invite" value={inviteCode} />
          <input type="hidden" name="returnTo" value={returnTo} />
          {initialProviders.map((provider) => (
            <button type="submit" key={provider.id}>
              <span className={`provider-mark is-${provider.id}`} aria-hidden="true">{provider.mark}</span>
              <strong>
                {translate(locale, invitedSignup ? "signUpWithGoogle" : "continueWithGoogle")}
              </strong>
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
                ? translate(locale, "secureGoogleSignIn")
                : translate(locale, "localAuthDemo")}
            </strong>
            <span>
              {isRemoteAlpha
                ? translate(locale, "googleDataNotice")
                : translate(locale, "localAuthDemoNotice")}
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
