"use client";

import { translate, uiLocaleOptions } from "@mechori/i18n";
import { getPreferredVehicle, type SupportedUiLocale } from "@mechori/core";
import {
  Camera,
  CircleAlert,
  Languages,
  LoaderCircle,
  LogOut,
  LogIn,
  Menu,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";
import { pushAnalyticsEvent } from "@/lib/analytics";
import { ProfileAvatar } from "@/components/profile-avatar";
import { FirstProfileSetup } from "@/components/first-profile-setup";
import { useNotifications } from "@/components/notification-provider";
import { loadAlphaAdminDashboard } from "@/lib/alpha-operations";
import {
  beginFirstProfileSetup,
  completeActivationOnboarding,
} from "@/lib/activation-state";
import {
  authDisplayState,
  getNavigationItems,
  isActiveNavigation,
  navigationLabel,
  screenTitle,
  shouldShowRecordFab,
} from "@/lib/navigation";
import { loadMyProfessionalAccess } from "@/lib/professional-organizations";
import { notificationBadgeLabel } from "@/lib/notifications";


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    data,
    locale,
    setLocale,
    hydrated,
    workspaceLoadState,
    authSession,
    signedIn,
    isRemoteAlpha,
    persistenceError,
    clearPersistenceError,
    contentPolicyAccepted,
    acceptContentPolicy,
    signOut,
  } = useApp();
  const { unreadCount } = useNotifications();
  const publicPath = isPublicPath(pathname);
  const [acceptingPolicy, setAcceptingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navigationAccess, setNavigationAccess] = useState({
    profileId: "",
    admin: false,
    professional: false,
  });
  const menuCloseRef = useRef<HTMLButtonElement>(null);
  const authResultHandledRef = useRef(false);
  const authState = authDisplayState(hydrated, signedIn);
  const authenticated = authState === "authenticated";
  const loggedOut = authState === "signed-out";
  const navigationReady = authState !== "loading";
  const accessMatchesCurrentProfile =
    authenticated && navigationAccess.profileId === data.currentProfileId;
  const adminVisible = accessMatchesCurrentProfile && navigationAccess.admin;
  const professionalVisible =
    accessMatchesCurrentProfile && navigationAccess.professional;
  const workspaceReady = workspaceLoadState === "ready";
  const showRecordFab = authenticated && workspaceReady && shouldShowRecordFab(pathname) && !menuOpen;
  const currentProfile = workspaceReady
    ? data.profiles.find((profile) => profile.id === data.currentProfileId)
    : undefined;
  const preferredVehicle = workspaceReady
    ? getPreferredVehicle(
        data.vehicles.filter((vehicle) => vehicle.ownerProfileId === data.currentProfileId),
      )
    : undefined;
  const desktopNavItems = getNavigationItems("desktopSide", authState, adminVisible, professionalVisible);
  const desktopPrimaryItems = desktopNavItems.filter((item) => item.group === "primary");
  const desktopSecondaryItems = desktopNavItems.filter((item) => item.group === "secondary");
  const desktopAdminItems = desktopNavItems.filter((item) => item.group === "admin");
  const mobileNavItems = getNavigationItems("mobileBottom", authState);
  const drawerPrimaryItems = getNavigationItems("drawer", authState, adminVisible, professionalVisible).filter((item) => item.group === "primary");
  const drawerSecondaryItems = getNavigationItems("drawer", authState, adminVisible, professionalVisible).filter((item) => item.group === "secondary");
  const drawerAdminItems = getNavigationItems("drawer", authState, adminVisible, professionalVisible).filter((item) => item.group === "admin");

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
    if (!authenticated || !isRemoteAlpha) return;
    let active = true;
    const profileId = data.currentProfileId;
    void Promise.all([
      loadAlphaAdminDashboard().catch(() => null),
      loadMyProfessionalAccess().catch(() => false),
    ]).then(([dashboard, professionalAccess]) => {
      if (!active) return;
      const admin = dashboard?.isAdmin === true;
      setNavigationAccess({
        profileId,
        admin,
        professional: professionalAccess || admin,
      });
    });
    return () => {
      active = false;
    };
  }, [authenticated, data.currentProfileId, isRemoteAlpha]);

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
    if (authResultHandledRef.current || !hydrated) return;
    const url = new URL(window.location.href);
    const authEvent = url.searchParams.get("authEvent");
    if (authEvent !== "sign_up" && authEvent !== "login") {
      authResultHandledRef.current = true;
      return;
    }
    if (authSession.status !== "signed_in") return;

    const inviteCompleted = url.searchParams.get("inviteCompleted") === "1";
    pushAnalyticsEvent(authEvent);
    if (inviteCompleted) pushAnalyticsEvent("invite_completed");
    if (authEvent === "sign_up") {
      beginFirstProfileSetup(authSession.profileId, inviteCompleted ? "invite" : "signup");
      if (inviteCompleted) completeActivationOnboarding(authSession.profileId);
    }
    url.searchParams.delete("authEvent");
    url.searchParams.delete("inviteCompleted");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    authResultHandledRef.current = true;
  }, [authSession, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    pushAnalyticsEvent("page_view", { page_path: pathname });
  }, [hydrated, pathname]);

  const usernameSetupNotice = authenticated
    && workspaceReady
    && contentPolicyAccepted
    && !currentProfile?.publicUsername ? (
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
    ) : null;

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
        {authenticated && workspaceReady ? (
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
        ) : loggedOut ? (
          <Link href="/auth" className="primary-action nav-add">
            <LogIn size={18} aria-hidden="true" />
            {translate(locale, "signIn")}
          </Link>
        ) : null}
        {navigationReady && <>
          <nav className="side-nav-links side-nav-primary">
          {desktopPrimaryItems.map((item) => {
            const active = isActiveNavigation(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                <Icon size={20} aria-hidden="true" />
                <span>{navigationLabel(item.label, locale)}</span>
                <NavigationBadge itemId={item.id} unreadCount={unreadCount} locale={locale} />
              </Link>
            );
          })}
          </nav>
          {desktopSecondaryItems.length > 0 && (
            <nav className="side-nav-links side-nav-secondary" aria-label={locale === "ja" ? "アカウントと補助" : "Account and support"}>
              {desktopSecondaryItems.map((item) => {
                const active = isActiveNavigation(pathname, item.href);
                const Icon = item.icon;
                const href = item.id === "feedback"
                  ? `/feedback?from=${encodeURIComponent(pathname)}`
                  : item.href;
                return (
                  <Link key={item.id} href={href} className={active ? "active" : ""}>
                    <Icon size={19} aria-hidden="true" />
                    <span>{navigationLabel(item.label, locale)}</span>
                  </Link>
                );
              })}
            </nav>
          )}
          {desktopAdminItems.map((item) => {
            const Icon = item.icon;
            const active = isActiveNavigation(pathname, item.href);
            return (
              <nav key={item.id} className="side-nav-links side-nav-admin" aria-label={locale === "ja" ? "管理" : "Administration"}>
                <Link href={item.href} className={active ? "active" : ""}>
                  <Icon size={19} aria-hidden="true" />
                  <span>{navigationLabel(item.label, locale)}</span>
                </Link>
              </nav>
            );
          })}
        </>}
        {navigationReady && authenticated && (
          <label className="side-nav-locale">
            <Languages size={18} aria-hidden="true" />
            <span>{locale === "ja" ? "言語" : "Language"}</span>
            <select value={locale} onChange={(event) => setLocale(event.target.value as SupportedUiLocale)} aria-label={locale === "ja" ? "言語" : "Language"}>
              {uiLocaleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
            </select>
          </label>
        )}
        {navigationReady && authenticated && (
          <button type="button" className="side-nav-logout" onClick={() => void handleSignOut()}>
            <LogOut size={18} aria-hidden="true" />
            <span>{locale === "ja" ? "ログアウト" : "Log out"}</span>
          </button>
        )}
      </aside>

      <div className="content-column">
        <header className="top-bar">
          <div className="top-bar-leading">
            {authenticated && (
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
            )}
          </div>
          {authenticated ? (
            <strong className={`top-bar-title${pathname === "/" ? " is-home" : ""}`}>
              {screenTitle(pathname, locale)}
            </strong>
          ) : (
            <Link href="/" className="mobile-brand">MECHORI</Link>
          )}
          <div className="top-bar-actions">
            {loggedOut && pathname !== "/auth" ? (
              <Link href="/auth" className="icon-text-button logged-out-header-login" aria-label={translate(locale, "signIn")} title={translate(locale, "signIn")}>
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
        {authenticated && workspaceReady && !contentPolicyAccepted && (
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
        {pathname !== "/" && usernameSetupNotice}
        <main className={showRecordFab ? "has-record-fab" : undefined}>
          {hydrated && (signedIn || publicPath) ? <>
            {authenticated && pathname !== "/auth" && <FirstProfileSetup />}
            {children}
          </> : (
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
        {pathname === "/" && usernameSetupNotice}
        <footer className="site-policy-footer">
          <Link href="/privacy">
            {locale === "ja" ? "プライバシーポリシー" : "Privacy policy"}
          </Link>
          <Link href="/ai-policy">
            {translate(locale, "aiTrainingPolicy")}
          </Link>
        </footer>
      </div>

      {navigationReady && <nav className={authenticated ? "bottom-nav" : "bottom-nav signed-out"} aria-label="Mobile navigation">
        {mobileNavItems.map((item) => {
          const active = isActiveNavigation(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
              <Icon size={20} aria-hidden="true" />
              <span>{navigationLabel(item.label, locale)}</span>
              <NavigationBadge itemId={item.id} unreadCount={unreadCount} locale={locale} />
            </Link>
          );
        })}
      </nav>}

      {showRecordFab && (
        <Link
          href={preferredVehicle ? `/garage/${encodeURIComponent(preferredVehicle.id)}/event/new` : "/journal/new"}
          className={pathname === "/" ? "record-fab record-fab-home" : "record-fab"}
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
              {drawerPrimaryItems.map((item) => {
                const Icon = item.icon;
                const active = isActiveNavigation(pathname, item.href);
                return (
                <Link key={item.id} href={item.href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>
                  <Icon size={19} aria-hidden="true" />
                  <span>{navigationLabel(item.label, locale)}</span>
                  <NavigationBadge itemId={item.id} unreadCount={unreadCount} locale={locale} />
                </Link>
                );
              })}
            </nav>
            <div className="app-menu-links app-menu-secondary">
              {drawerSecondaryItems.map((item) => {
                const Icon = item.icon;
                const href = item.id === "feedback"
                  ? `/feedback?from=${encodeURIComponent(pathname)}`
                  : item.href;
                return (
                  <Link key={item.id} href={href} onClick={() => setMenuOpen(false)}>
                    <Icon size={18} aria-hidden="true" />
                    <span>{navigationLabel(item.label, locale)}</span>
                  </Link>
                );
              })}
              <label className="app-menu-locale"><Languages size={18} aria-hidden="true" /><span>{locale === "ja" ? "言語" : "Language"}</span><select value={locale} onChange={(event) => setLocale(event.target.value as SupportedUiLocale)} aria-label={locale === "ja" ? "言語" : "Language"}>{uiLocaleOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
              {drawerAdminItems.map((item) => {
                const Icon = item.icon;
                return <Link key={item.id} href={item.href} onClick={() => setMenuOpen(false)}><Icon size={18} aria-hidden="true" /><span>{navigationLabel(item.label, locale)}</span></Link>;
              })}
              <button type="button" onClick={() => void handleSignOut()}><LogOut size={18} aria-hidden="true" /><span>{locale === "ja" ? "ログアウト" : "Log out"}</span></button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function NavigationBadge({
  itemId,
  unreadCount,
  locale,
}: {
  itemId: string;
  unreadCount: number | null;
  locale: SupportedUiLocale;
}) {
  if (itemId !== "notifications" || unreadCount === null) return null;
  const label = notificationBadgeLabel(unreadCount);
  if (!label) return null;
  return (
    <span
      className="notification-badge"
      aria-label={locale === "ja" ? `未読${unreadCount}件` : `${unreadCount} unread`}
    >
      {label}
    </span>
  );
}

function isPublicPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/garage" ||
    pathname === "/search" ||
    pathname === "/auth" ||
    pathname === "/join" ||
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
