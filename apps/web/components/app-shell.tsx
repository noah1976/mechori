"use client";

import { translate, uiLocaleOptions } from "@mechori/i18n";
import { getPreferredVehicle, type SupportedUiLocale } from "@mechori/core";
import {
  Camera,
  CarFront,
  CircleAlert,
  CircleHelp,
  FileText,
  House,
  Languages,
  LoaderCircle,
  LogOut,
  LogIn,
  MessageSquareText,
  Menu,
  Bell,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  UserRound,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";
import { pushAnalyticsEvent } from "@/lib/analytics";
import { ProfileAvatar } from "@/components/profile-avatar";
import { loadAlphaAdminDashboard } from "@/lib/alpha-operations";
import {
  appNavigationItems,
  isActiveNavigation,
  navigationLabel,
  screenTitle,
  shouldShowRecordFab,
} from "@/lib/navigation";

const menuLinks = [
  { href: "/", label: "ホーム", icon: House },
  { href: "/search", label: "探す", icon: Search },
  { href: "/notifications", label: "通知", icon: Bell },
  { href: "/garage", label: "ガレージ", icon: CarFront },
  { href: "/connections", label: "つながり", icon: UserRound },
] as const;


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
    signOut,
  } = useApp();
  const publicPath = isPublicPath(pathname);
  const [acceptingPolicy, setAcceptingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminVisible, setAdminVisible] = useState(false);
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const authenticated = hydrated && signedIn;
  const showRecordFab = authenticated && shouldShowRecordFab(pathname) && !menuOpen;
  const currentProfile = data.profiles.find((profile) => profile.id === data.currentProfileId);
  const preferredVehicle = getPreferredVehicle(
    data.vehicles.filter((vehicle) => vehicle.ownerProfileId === data.currentProfileId),
  );
  const visibleNavItems = authenticated
    ? appNavigationItems
    : appNavigationItems.filter((item) => item.href === "/" || item.href === "/search");

  useEffect(() => {
    if (!menuOpen) return;
    menuCloseRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || !authenticated || !isRemoteAlpha) return;
    let active = true;
    void loadAlphaAdminDashboard()
      .then((dashboard) => {
        if (active) setAdminVisible(dashboard?.isAdmin === true);
      })
      .catch(() => {
        if (active) setAdminVisible(false);
      });
    return () => {
      active = false;
    };
  }, [authenticated, isRemoteAlpha, menuOpen]);

  async function handleSignOut() {
    setMenuOpen(false);
    await signOut();
    router.replace("/auth/signed-out");
  }

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
            const active = isActiveNavigation(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                <Icon size={20} aria-hidden="true" />
                <span>{navigationLabel(item.label, locale)}</span>
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
              ? locale === "ja" ? "記録する" : "Record"
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
          {authenticated ? (
            <button
              type="button"
              className="menu-trigger"
              aria-label={locale === "ja" ? "メニューを開く" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="app-menu-drawer"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={22} aria-hidden="true" />
            </button>
          ) : <Link href="/" className="mobile-brand">MECHORI</Link>}
          <strong className="top-bar-title">{authenticated ? screenTitle(pathname, locale) : ""}</strong>
          <div className="top-bar-actions">
            {!authenticated && pathname !== "/auth" ? (
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
        <main className={showRecordFab ? "has-record-fab" : undefined}>
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
          const active = isActiveNavigation(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
              <Icon size={20} aria-hidden="true" />
              <span>{navigationLabel(item.label, locale)}</span>
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

      {showRecordFab && (
        <Link
          href={preferredVehicle ? `/garage/${encodeURIComponent(preferredVehicle.id)}/event/new` : "/journal/new"}
          className="record-fab"
          aria-label={locale === "ja" ? "記録する" : "Create a record"}
        >
          <Plus size={19} aria-hidden="true" />
          <span>{locale === "ja" ? "記録する" : "Record"}</span>
        </Link>
      )}

      {authenticated && menuOpen && (
        <div className="app-menu-layer" role="presentation">
          <button type="button" className="app-menu-backdrop" aria-label={locale === "ja" ? "メニューを閉じる" : "Close menu"} onClick={() => setMenuOpen(false)} />
          <aside id="app-menu-drawer" className="app-menu-drawer" aria-label={locale === "ja" ? "メニュー" : "Menu"}>
            <div className="app-menu-header">
              <Link href="/garage" className="app-menu-profile" onClick={() => setMenuOpen(false)}>
                <ProfileAvatar displayName={currentProfile?.displayName ?? "MECHORI"} imagePath={currentProfile?.profileImagePath} />
                <span>
                  <strong>{currentProfile?.displayName ?? "MECHORI"}</strong>
                  {currentProfile?.publicUsername && <small>@{currentProfile.publicUsername}</small>}
                </span>
              </Link>
              <button ref={menuCloseRef} type="button" className="icon-action" aria-label={locale === "ja" ? "メニューを閉じる" : "Close menu"} onClick={() => setMenuOpen(false)}>
                <X size={21} aria-hidden="true" />
              </button>
            </div>
            <nav className="app-menu-links" aria-label={locale === "ja" ? "主要導線" : "Main links"}>
              {menuLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={isActiveNavigation(pathname, href) ? "active" : ""} aria-current={isActiveNavigation(pathname, href) ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                  <Icon size={19} aria-hidden="true" />
                  <span>{locale === "ja" ? label : href === "/connections" ? "Connections" : navigationLabel(appNavigationItems.find((item) => item.href === href)?.label ?? "home", locale)}</span>
                </Link>
              ))}
            </nav>
            <div className="app-menu-links app-menu-secondary">
              <Link href="/settings/profile" onClick={() => setMenuOpen(false)}><Settings2 size={18} aria-hidden="true" /><span>{locale === "ja" ? "プロフィールを編集" : "Edit profile"}</span></Link>
              <Link href="/invite" onClick={() => setMenuOpen(false)}><UserPlus size={18} aria-hidden="true" /><span>{locale === "ja" ? "友達を招待" : "Invite friends"}</span></Link>
              <label className="app-menu-locale"><Languages size={18} aria-hidden="true" /><span>{locale === "ja" ? "言語" : "Language"}</span><select value={locale} onChange={(event) => setLocale(event.target.value as SupportedUiLocale)} aria-label={locale === "ja" ? "言語" : "Language"}>{uiLocaleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
              <Link href={`/feedback?from=${encodeURIComponent(pathname)}`} onClick={() => setMenuOpen(false)}><MessageSquareText size={18} aria-hidden="true" /><span>{translate(locale, "feedback")}</span></Link>
              <Link href="/help" onClick={() => setMenuOpen(false)}><CircleHelp size={18} aria-hidden="true" /><span>{locale === "ja" ? "ヘルプ" : "Help"}</span></Link>
              <Link href="/settings/profile" onClick={() => setMenuOpen(false)}><Settings2 size={18} aria-hidden="true" /><span>{locale === "ja" ? "設定" : "Settings"}</span></Link>
              <Link href="/terms" onClick={() => setMenuOpen(false)}><FileText size={18} aria-hidden="true" /><span>{locale === "ja" ? "利用規約" : "Terms"}</span></Link>
              <Link href="/privacy" onClick={() => setMenuOpen(false)}><FileText size={18} aria-hidden="true" /><span>{locale === "ja" ? "プライバシーポリシー" : "Privacy policy"}</span></Link>
              {adminVisible && <Link href="/admin" onClick={() => setMenuOpen(false)}><ShieldCheck size={18} aria-hidden="true" /><span>{locale === "ja" ? "管理画面" : "Admin"}</span></Link>}
              <button type="button" onClick={() => void handleSignOut()}><LogOut size={18} aria-hidden="true" /><span>{locale === "ja" ? "ログアウト" : "Log out"}</span></button>
            </div>
          </aside>
        </div>
      )}
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
