// These helpers never modify an authentication or navigation URL. Only the
// analytics representation is reduced; capabilities still reach their consumers.
export function sanitizeAnalyticsPath(value: unknown): string {
  if (typeof value !== "string" || value.length > 2048) return "/unknown";
  let path: string;
  try {
    path = new URL(value, "https://mechori.invalid").pathname;
    for (let i = 0; i < 4; i++) {
      const decoded = decodeURIComponent(path);
      if (decoded === path) break;
      path = decoded;
    }
  } catch { return "/unknown"; }
  path = path.split(/[?#]/)[0] ?? "/unknown";
  if (/^\/p(?:\/|$)/i.test(path)) return "/p/[share]";
  if (/^\/v(?:\/|$)/i.test(path)) return "/v/[share]";
  if (/^\/profile\//.test(path)) return "/profile/[id]";
  if (/^\/journal\//.test(path) && path !== "/journal/new") return "/journal/[id]";
  if (/^\/records\//.test(path) && path !== "/records/new") return "/records/[id]";
  if (/^\/garage\//.test(path) && !["/garage/new", "/garage/history", "/garage/service-brief"].includes(path)) return "/garage/[vehicle]";
  if (/^\/(?:admin\/professional|professional\/organizations)\//.test(path)) return "/professional/organizations/[id]";
  const staticPaths = ["/", "/qa", "/home", "/feed", "/garage", "/garage/new", "/garage/history", "/garage/service-brief", "/search", "/people", "/auth", "/auth/start", "/auth/callback", "/auth/signed-out", "/join", "/invite", "/feedback", "/privacy", "/ai-policy", "/professional", "/professional/organizations", "/admin", "/admin/professional", "/notifications", "/connections", "/records", "/records/new", "/journal/new", "/settings/profile", "/settings/privacy", "/settings/alpha", "/settings/alpha/catalog", "/moderation", "/privacy-review", "/import", "/import/review-demo", "/reference-garage", "/help", "/terms"];
  return staticPaths.includes(path) ? path : "/unknown";
}

// Self-contained: also serialized into the pre-hydration GTM bootstrap below.
export function analyticsUrlHasCapability(value: string, nesting = 0): boolean {
  if (value.length > 4096 || nesting > 4) return true;
  let decoded = value;
  try {
    for (let i = 0; i < 4; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    if (decoded.includes("%")) return true;
    const url = new URL(decoded, "https://mechori.invalid");
    // GTM can read the full location independently of our custom event payload.
    // On the public QA entry allow only the four coarse source values.
    if (/^\/qa\/?$/i.test(url.pathname) && (url.hash || [...url.searchParams].some(([key, value]) =>
      key !== "src" || !["x", "facebook", "direct", "unknown"].includes(value)))) return true;
    if (/^\/(?:p|v|auth|join|invite)(?:\/|$)/i.test(url.pathname)
      || /[?&#](?:invite|invite_token|token|access_token|refresh_token|id_token|code|state)=/i.test(decoded)) return true;
    // A record/vehicle/profile ID is not a capability because of its length.
    // Only inspect a continuation URL when it actually contains secret context.
    for (const [key, target] of url.searchParams) {
      if (key.toLowerCase() === "returnto" && analyticsUrlHasCapability(target, nesting + 1)) return true;
    }
    return /^#\/(?:p|v|auth|join|invite)(?:\/|$)/i.test(url.hash);
  } catch { return true; }
}

export function safeGtmBootstrap(containerId: string): string {
  if (!/^GTM-[A-Z0-9]+$/.test(containerId)) return "";
  return `(function(w,d){
var sensitive=${analyticsUrlHasCapability.toString()};
if(sensitive(w.location.href)||(d.referrer&&sensitive(d.referrer)))return;
// Force capability navigation into a fresh document before any history-listener
// tag can see it. On that document this loader is disabled. Ordinary routing stays.
['pushState','replaceState'].forEach(function(method){
var original=w.history[method];
w.history[method]=function(state,unused,url){
if(url!=null&&sensitive(new URL(String(url),w.location.href).href)){
if(method==='replaceState')w.location.replace(String(url));else w.location.assign(String(url));
return;
}return original.apply(this,arguments);
};
});
w.dataLayer=w.dataLayer||[];w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName('script')[0],j=d.createElement('script');j.async=true;
j.src='https://www.googletagmanager.com/gtm.js?id='+${JSON.stringify(containerId)};f.parentNode.insertBefore(j,f);
})(window,document);`;
}
