import type { SupportedUiLocale } from "@mechori/core";
import {
  Bell,
  Building2,
  CarFront,
  CircleHelp,
  FileText,
  House,
  MessageSquareText,
  Search,
  Settings2,
  ShieldCheck,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type NavigationSurface = "mobileBottom" | "desktopSide" | "drawer";
export type NavigationAuth = "public" | "signed-out" | "authenticated" | "professional" | "admin";
export type NavigationStatus = "active" | "comingSoon";
export type AuthDisplayState = "loading" | "authenticated" | "signed-out";
export type NavigationLabelKey =
  | "home"
  | "search"
  | "notifications"
  | "garage"
  | "signIn"
  | "connections"
  | "profileEdit"
  | "invite"
  | "feedback"
  | "help"
  | "settings"
  | "terms"
  | "privacy"
  | "professional"
  | "admin";
export type NavigationGroup = "primary" | "secondary" | "admin";

export interface NavigationItem {
  id: string;
  href: string;
  label: NavigationLabelKey;
  icon: LucideIcon;
  surfaces: readonly NavigationSurface[];
  auth: NavigationAuth;
  activeMatch: string;
  order: number;
  status: NavigationStatus;
  group?: NavigationGroup;
}

const allNavigationItems: readonly NavigationItem[] = [
  {
    id: "professional",
    href: "/professional/organizations",
    label: "professional",
    icon: Building2,
    surfaces: ["desktopSide", "drawer"],
    auth: "professional",
    activeMatch: "professional",
    order: 55,
    status: "active",
    group: "secondary",
  },
  {
    id: "home",
    href: "/",
    label: "home",
    icon: House,
    surfaces: ["mobileBottom", "desktopSide", "drawer"],
    auth: "public",
    activeMatch: "home",
    order: 10,
    status: "active",
    group: "primary",
  },
  {
    id: "search",
    href: "/search",
    label: "search",
    icon: Search,
    surfaces: ["mobileBottom", "desktopSide", "drawer"],
    auth: "public",
    activeMatch: "search",
    order: 20,
    status: "active",
    group: "primary",
  },
  {
    id: "notifications",
    href: "/notifications",
    label: "notifications",
    icon: Bell,
    surfaces: ["mobileBottom", "desktopSide", "drawer"],
    auth: "authenticated",
    activeMatch: "notifications",
    order: 30,
    status: "active",
    group: "primary",
  },
  {
    id: "garage",
    href: "/garage",
    label: "garage",
    icon: CarFront,
    surfaces: ["mobileBottom", "desktopSide", "drawer"],
    auth: "authenticated",
    activeMatch: "garage",
    order: 40,
    status: "active",
    group: "primary",
  },
  {
    id: "sign-in",
    href: "/auth",
    label: "signIn",
    icon: UserRound,
    surfaces: ["mobileBottom"],
    auth: "signed-out",
    activeMatch: "sign-in",
    order: 90,
    status: "active",
  },
  {
    id: "connections",
    href: "/connections",
    label: "connections",
    icon: UserRound,
    surfaces: ["desktopSide", "drawer"],
    auth: "authenticated",
    activeMatch: "connections",
    order: 50,
    status: "active",
    group: "primary",
  },
  {
    id: "profile-edit",
    href: "/settings/profile",
    label: "profileEdit",
    icon: Settings2,
    surfaces: ["desktopSide", "drawer"],
    auth: "authenticated",
    activeMatch: "profile-edit",
    order: 60,
    status: "active",
    group: "secondary",
  },
  {
    id: "invite",
    href: "/invite",
    label: "invite",
    icon: UserPlus,
    surfaces: ["desktopSide", "drawer"],
    auth: "authenticated",
    activeMatch: "invite",
    order: 70,
    status: "active",
    group: "secondary",
  },
  {
    id: "feedback",
    href: "/feedback",
    label: "feedback",
    icon: MessageSquareText,
    surfaces: ["desktopSide", "drawer"],
    auth: "authenticated",
    activeMatch: "feedback",
    order: 80,
    status: "active",
    group: "secondary",
  },
  {
    id: "help",
    href: "/help",
    label: "help",
    icon: CircleHelp,
    surfaces: ["desktopSide", "drawer"],
    auth: "authenticated",
    activeMatch: "help",
    order: 90,
    status: "active",
    group: "secondary",
  },
  {
    id: "settings",
    href: "/settings/privacy",
    label: "settings",
    icon: Settings2,
    surfaces: ["desktopSide", "drawer"],
    auth: "authenticated",
    activeMatch: "settings",
    order: 105,
    status: "active",
    group: "secondary",
  },
  {
    id: "terms",
    href: "/terms",
    label: "terms",
    icon: FileText,
    surfaces: ["desktopSide", "drawer"],
    auth: "authenticated",
    activeMatch: "terms",
    order: 100,
    status: "active",
    group: "secondary",
  },
  {
    id: "privacy",
    href: "/privacy",
    label: "privacy",
    icon: FileText,
    surfaces: ["desktopSide", "drawer"],
    auth: "authenticated",
    activeMatch: "privacy",
    order: 110,
    status: "active",
    group: "secondary",
  },
  {
    id: "admin",
    href: "/admin",
    label: "admin",
    icon: ShieldCheck,
    surfaces: ["desktopSide", "drawer"],
    auth: "admin",
    activeMatch: "admin",
    order: 120,
    status: "active",
    group: "admin",
  },
];

export const navigationItems = allNavigationItems;
export const appNavigationItems = allNavigationItems.filter((item) =>
  item.surfaces.includes("mobileBottom") && item.auth !== "signed-out",
);

const labelMap: Record<NavigationLabelKey, { ja: string; en: string }> = {
  home: { ja: "ホーム", en: "Home" },
  search: { ja: "探す", en: "Search" },
  notifications: { ja: "通知", en: "Notifications" },
  garage: { ja: "ガレージ", en: "Garage" },
  signIn: { ja: "ログイン", en: "Sign in" },
  connections: { ja: "つながり", en: "Connections" },
  profileEdit: { ja: "プロフィールを編集", en: "Edit profile" },
  invite: { ja: "友達を招待", en: "Invite friends" },
  feedback: { ja: "フィードバック", en: "Feedback" },
  help: { ja: "ヘルプ", en: "Help" },
  settings: { ja: "設定", en: "Settings" },
  terms: { ja: "利用規約", en: "Terms" },
  privacy: { ja: "プライバシーポリシー", en: "Privacy policy" },
  professional: { ja: "事業者スペース", en: "Professional workspace" },
  admin: { ja: "管理画面", en: "Admin" },
};

export function authDisplayState(hydrated: boolean, signedIn: boolean): AuthDisplayState {
  if (!hydrated) return "loading";
  return signedIn ? "authenticated" : "signed-out";
}

export function canShowNavigationItem(
  item: NavigationItem,
  authState: AuthDisplayState,
  isAdmin = false,
  hasProfessionalAccess = false,
): boolean {
  if (authState === "loading") return false;
  if (item.auth === "public") return true;
  if (item.auth === "signed-out") return authState === "signed-out";
  if (authState !== "authenticated") return false;
  if (item.auth === "admin") return isAdmin;
  if (item.auth === "professional") return hasProfessionalAccess || isAdmin;
  return true;
}

export function getNavigationItems(
  surface: NavigationSurface,
  authState: AuthDisplayState,
  isAdmin = false,
  hasProfessionalAccess = false,
): NavigationItem[] {
  return allNavigationItems
    .filter((item) => item.surfaces.includes(surface))
    .filter((item) => canShowNavigationItem(item, authState, isAdmin, hasProfessionalAccess))
    .sort((left, right) => left.order - right.order);
}

export function navigationLabel(label: NavigationLabelKey, locale: SupportedUiLocale) {
  return labelMap[label][locale === "ja" ? "ja" : "en"];
}

export function isNavigationItemActive(pathname: string, item: NavigationItem): boolean {
  switch (item.activeMatch) {
    case "home":
      return pathname === "/" || pathname === "/feed" || pathname.startsWith("/journal/") || pathname.startsWith("/records/");
    case "search":
      return pathname === "/search" || pathname.startsWith("/search/") || pathname === "/people" || pathname.startsWith("/people/");
    case "notifications":
      return pathname === "/notifications" || pathname.startsWith("/notifications/");
    case "garage":
      return pathname === "/garage" || pathname.startsWith("/garage/") || pathname.startsWith("/profile/") || pathname.startsWith("/v/");
    case "sign-in":
      return pathname === "/auth" || pathname.startsWith("/auth/");
    case "connections":
      return pathname === "/connections" || pathname.startsWith("/connections/");
    case "professional":
      return pathname.startsWith("/professional/organizations");
    case "profile-edit":
      return pathname === "/settings/profile" || pathname.startsWith("/settings/profile/");
    case "settings":
      return pathname === "/settings/privacy" || pathname.startsWith("/settings/privacy/");
    default:
      return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }
}

export function isActiveNavigation(pathname: string, href: string) {
  const item = allNavigationItems.find((candidate) => candidate.href === href);
  return item ? isNavigationItemActive(pathname, item) : pathname === href || pathname.startsWith(`${href}/`);
}

export function screenTitle(pathname: string, locale: SupportedUiLocale) {
  if (locale !== "ja") {
    if (pathname === "/") return "MECHORI";
    if (pathname.startsWith("/search") || pathname.startsWith("/people")) return "Search";
    if (pathname.startsWith("/notifications")) return "Notifications";
    if (pathname.startsWith("/garage") || pathname.startsWith("/profile") || pathname.startsWith("/v/")) return "Garage";
    if (pathname.startsWith("/journal") || pathname.startsWith("/records")) return "Record";
    return "MECHORI";
  }
  if (pathname === "/") return "MECHORI";
  if (pathname.startsWith("/search") || pathname.startsWith("/people")) return "探す";
  if (pathname.startsWith("/notifications")) return "通知";
  if (pathname.startsWith("/garage") || pathname.startsWith("/profile") || pathname.startsWith("/v/")) return "ガレージ";
  if (pathname.startsWith("/journal") || pathname.startsWith("/records")) return "記録";
  if (pathname.startsWith("/professional/organizations")) return "事業者スペース";
  if (pathname.startsWith("/settings")) return "設定";
  return "MECHORI";
}

export function shouldShowRecordFab(pathname: string) {
  return !(
    pathname === "/garage" ||
    pathname === "/search" ||
    pathname.startsWith("/search/") ||
    pathname === "/journal/new" ||
    (pathname.startsWith("/journal/") && pathname.endsWith("/edit")) ||
    (pathname.startsWith("/garage/") && pathname.endsWith("/event/new")) ||
    pathname.startsWith("/records/") ||
    pathname === "/feedback" ||
    pathname.startsWith("/feedback/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/professional/organizations")
  );
}
