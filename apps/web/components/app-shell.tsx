"use client";

import { translate, uiLocaleOptions, type TranslationKey } from "@mechori/i18n";
import { getPreferredVehicle, type SupportedUiLocale } from "@mechori/core";
import {
  BookOpenText,
  Camera,
  CarFront,
  CircleAlert,
  House,
  Languages,
  LoaderCircle,
  LogIn,
  MessageSquareText,
  Newspaper,
  Plus,
  Search,
  Settings2,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";
import { pushAnalyticsEvent } from "@/lib/analytics";

const navItems: Array<{
  href: string;
  label: TranslationKey;
  icon: typeof House;
}> = [
  { href: "/", label: "home", icon: House },
  { href: "/feed", label: "feed", icon: Newspaper },
  { href: "/garage", label: "garage", icon: CarFront },
  { href: "/records", label: "records", icon: BookOpenText },
  { href: "/search", label: "search", icon: Search },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    data,
    locale,
    setLocale,
    hydrated,
    signedIn,
    isRemoteAlpha,
    persistenceError,
    clearPersistenceError,
    contentPolicyAccepted,
    acceptContentPolicy,
  } = useApp();
  const publicPath = isPublicPath(pathname);
  const [acceptingPolicy, setAcceptingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const authenticated = hydrated && signedIn;
  const currentProfile = data.profiles.find((profile) => profile.id === data.currentProfileId);
  const preferredVehicle = getPreferredVehicle(
    data.vehicles.filter((vehicle) => vehicle.ownerProfileId === data.currentProfileId),
  );
  const visibleNavItems = authenticated
    ? navItems
    : navItems.filter((item) => item.href === "/" || item.href === "/search");

  useEffect(() => {
    if (hydrated && !signedIn && !publicPath) {
      router.replace(`/auth?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [hydrated, pathname, publicPath, router, signedIn]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const authEvent = url.searchParams.get("authEvent");
    if (authEvent === "sign_up" || authEvent === "login") {
      pushAnalyticsEvent(authEvent);
      if (url.searchParams.get("inviteCompleted") === "1") {
        pushAnalyticsEvent("invite_completed");
      }
      url.searchParams.delete("authEvent");
      url.searchParams.delete("inviteCompleted");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    pushAnalyticsEvent("page_view", { page_path: pathname });
  }, [hydrated, pathname]);

  if (pathname === "/professional") {
    return (
      <div className="professional-frame" data-clarity-mask="true">
        <header className="professional-site-header">
          <Link href="/professional" className="professional-site-brand" aria-label="MECHORI Professional">
            <strong>MECHORI</strong>
            <span>PROFESSIONAL</span>
          </Link>
          <label className="locale-select">
            <Languages size={18} aria-hidden="true" />
            <span className="sr-only">{translate(locale, "displayLanguage")}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as SupportedUiLocale)}
              aria-label={translate(locale, "displayLanguage")}
            >
              {uiLocaleOptions.map((option) => (
                <option value={option.value} key={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </header>
        <main className="professional-site-main">
          {hydrated ? children : (
            <div className="app-loading" role="status" aria-live="polite">
              <LoaderCircle className="spin" size={24} aria-hidden="true" />
              <span>{translate(locale, "loadingGarage")}</span>
            </div>
          )}
        </main>
        <footer className="professional-site-footer">
          <strong>MECHORI PROFESSIONAL</strong>
          <span className="professional-policy-links">
            <Link href="/privacy">{locale === "ja" ? "プライバシーポリシー" : "Privacy policy"}</Link>
            <Link href="/ai-policy">{translate(locale, "aiTrainingPolicy")}</Link>
          </span>
        </footer>
      </div>
    );
  }

  return (
    <div className="app-frame" data-clarity-mask="true">
      <aside className="side-nav" aria-label="Primary navigation">
        <Link href="/" className="brand-block" aria-label="MECHORI home">
          <span className="brand-mark">M</span>
          <span>
            <strong>MECHORI</strong>
            <small>{translate(locale, "tagline")}</small>
          </span>
        </Link>
        <nav>
          {visibleNavItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                <Icon size={20} aria-hidden="true" />
                <span>{translate(locale, item.label)}</span>
              </Link>
            );
          })}
        </nav>
        {authenticated ? (
          <Link
            href={preferredVehicle
              ? `/garage/${encodeURIComponent(preferredVehicle.id)}/event/new`
              : "/garage/new"}
            className="primary-action nav-add"
          >
            {preferredVehicle
              ? <Camera size={18} aria-hidden="true" />
              : <Plus size={18} aria-hidden="true" />}
            {preferredVehicle
              ? locale === "ja" ? "さっと記録" : "Quick record"
              : locale === "ja" ? "愛車を登録" : "Add vehicle"}
          </Link>
        ) : (
          <Link href="/auth" className="primary-action nav-add">
            <LogIn size={18} aria-hidden="true" />
            {translate(locale, "signIn")}
          </Link>
        )}
      </aside>

      <div className="content-column">
        <header className="top-bar">
          <Link href="/" className="mobile-brand">MECHORI</Link>
          <div className="top-bar-actions">
            <label className="locale-select">
              <Languages size={18} aria-hidden="true" />
              <span className="sr-only">{translate(locale, "displayLanguage")}</span>
              <select
                value={locale}
                onChange={(event) => setLocale(event.target.value as SupportedUiLocale)}
                aria-label={translate(locale, "displayLanguage")}
              >
                {uiLocaleOptions.map((option) => (
                  <option value={option.value} key={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            {authenticated ? (
              <>
                <Link href="/invite" className="icon-text-button" aria-label={locale === "ja" ? "友人を招待" : "Invite a friend"} title={locale === "ja" ? "友人を招待" : "Invite a friend"}>
                  <UserPlus size={18} aria-hidden="true" />
                  <span className="top-bar-action-label">{locale === "ja" ? "招待" : "Invite"}</span>
                </Link>
                <Link href={`/feedback?from=${encodeURIComponent(pathname)}`} className="icon-text-button" aria-label={translate(locale, "feedback")} title={translate(locale, "feedback")}>
                  <MessageSquareText size={18} aria-hidden="true" />
                  <span className="top-bar-action-label">{translate(locale, "feedback")}</span>
                </Link>
                <Link href="/settings/profile" className="icon-text-button" aria-label={locale === "ja" ? "プロフィール設定" : "Profile settings"} title={locale === "ja" ? "プロフィール設定" : "Profile settings"}>
                  <Settings2 size={18} aria-hidden="true" />
                  <span className="top-bar-action-label">{locale === "ja" ? "設定" : "Settings"}</span>
                </Link>
              </>
            ) : pathname !== "/auth" ? (
              <Link href="/auth" className="icon-text-button" aria-label={translate(locale, "signIn")} title={translate(locale, "signIn")}>
                <LogIn size={18} aria-hidden="true" />
                <span className="top-bar-action-label">{translate(locale, "signIn")}</span>
              </Link>
            ) : null}
          </div>
        </header>
        {persistenceError && (
          <div className="persistence-error" role="alert">
            <CircleAlert size={19} aria-hidden="true" />
            <span>
              {translate(locale, isRemoteAlpha ? "remoteSaveError" : "localSaveError")}
            </span>
            <button
              type="button"
              className="icon-action"
              onClick={clearPersistenceError}
              aria-label={translate(locale, "dismissStorageError")}
            >
              <X size={17} aria-hidden="true" />
            </button>
          </div>
        )}
        {authenticated && !contentPolicyAccepted && (
          <section className="content-policy-notice" aria-labelledby="content-policy-title">
            <div>
              <strong id="content-policy-title">
                {locale === "ja" ? "公開内容について確認してください" : "Please review public content use"}
              </strong>
              <p>
                {locale === "ja"
                  ? "公開した記録や写真は、参加者が閲覧できます。個人情報や第三者の情報を含めず、公開範囲を確認して投稿してください。"
                  : "Public records and photos can be viewed by participants. Do not include personal or third-party information, and check visibility before posting."}
              </p>
              <span>
                <Link href="/privacy">{locale === "ja" ? "プライバシーポリシー" : "Privacy policy"}</Link>
                {" / "}
                <Link href="/ai-policy">{translate(locale, "aiTrainingPolicy")}</Link>
              </span>
              {policyError && (
                <p className="form-error" role="alert">
                  {locale === "ja" ? "確認状態を保存できませんでした。もう一度お試しください。" : "Your confirmation could not be saved. Please try again."}
                </p>
              )}
            </div>
            <button
              type="button"
              className="primary-action"
              disabled={acceptingPolicy}
              onClick={async () => {
                setAcceptingPolicy(true);
                setPolicyError(false);
                try {
                  await acceptContentPolicy();
                } catch {
                  setPolicyError(true);
                } finally {
                  setAcceptingPolicy(false);
                }
              }}
            >
              {acceptingPolicy && <LoaderCircle className="spin" size={17} aria-hidden="true" />}
              {locale === "ja" ? "確認して続ける" : "Confirm and continue"}
            </button>
          </section>
        )}
        {authenticated && contentPolicyAccepted && !currentProfile?.publicUsername && (
          <section className="content-policy-notice" aria-labelledby="username-setup-title">
            <div>
              <strong id="username-setup-title">
                {locale === "ja" ? "公開ユーザー名を設定しましょう" : "Choose your public username"}
              </strong>
              <p>
                {locale === "ja"
                  ? "友人が表示名や@usernameからあなたを見つけやすくなります。閲覧はこのまま続けられます。"
                  : "This helps friends find you by display name or @username. You can keep browsing without setting it now."}
              </p>
            </div>
            <Link href="/settings/profile" className="primary-action">
              {locale === "ja" ? "プロフィールを設定" : "Set up profile"}
            </Link>
          </section>
        )}
        <main>
          {hydrated && (signedIn || publicPath) ? children : (
            <div className="app-loading" role="status" aria-live="polite">
              <LoaderCircle className="spin" size={24} aria-hidden="true" />
              <span>
                {!hydrated
                  ? isRemoteAlpha
                    ? translate(locale, "loadingGarage")
                    : translate(locale, "loadingDeviceData")
                  : translate(locale, "openingSignIn")}
              </span>
            </div>
          )}
        </main>
        <footer className="site-policy-footer">
          <Link href="/privacy">
            {locale === "ja" ? "プライバシーポリシー" : "Privacy policy"}
          </Link>
          <Link href="/ai-policy">
            {translate(locale, "aiTrainingPolicy")}
          </Link>
        </footer>
      </div>

      <nav className={authenticated ? "bottom-nav" : "bottom-nav signed-out"} aria-label="Mobile navigation">
        {visibleNavItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""}>
              <Icon size={20} aria-hidden="true" />
              <span>{translate(locale, item.label)}</span>
            </Link>
          );
        })}
        {!authenticated && (
          <Link href="/auth" className={pathname === "/auth" ? "active" : ""}>
            <LogIn size={20} aria-hidden="true" />
            <span>{translate(locale, "signIn")}</span>
          </Link>
        )}
      </nav>
    </div>
  );
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/search" ||
    pathname === "/auth" ||
    pathname === "/auth/signed-out" ||
    pathname === "/privacy" ||
    pathname === "/ai-policy" ||
    pathname === "/professional" ||
    pathname.startsWith("/v/") ||
    pathname.startsWith("/profile/") ||
    (pathname.startsWith("/journal/") &&
      pathname !== "/journal/new" &&
      !pathname.endsWith("/edit") &&
      !pathname.endsWith("/report"))
  );
}
