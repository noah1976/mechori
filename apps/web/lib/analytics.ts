export type MechoriAnalyticsEvent =
  | "content_policy_accepted"
  | "feedback_submitted"
  | "qa_entry_view"
  | "qa_started"
  | "qa_step_completed"
  | "qa_feedback_submitted"
  | "qa_completed"
  | "invite_completed"
  | "invite_opened"
  | "like_added"
  | "login"
  | "maintenance_saved"
  | "page_view"
  | "post_created"
  | "sign_up"
  | "user_followed"
  | "vehicle_followed"
  | "vehicle_created";

type SafeAnalyticsValue = string | number | boolean;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, SafeAnalyticsValue>>;
  }
}

export function pushAnalyticsEvent(
  event: MechoriAnalyticsEvent,
  properties: Record<string, SafeAnalyticsValue> = {},
): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  const safeProperties: Record<string, SafeAnalyticsValue> = {};
  // All URL-shaped custom properties share the same boundary. Full locations,
  // referrers, arbitrary payload keys and prose never belong to these events.
  for (const [key, value] of Object.entries(properties)) {
    if (key === "page_path") safeProperties[key] = sanitizeAnalyticsPath(value);
    else if (key === "task" && value === "history-reading-v1") safeProperties[key] = value;
    else if (key === "version" && value === "qa-v0.1") safeProperties[key] = value;
    else if (key === "source" && ["x", "facebook", "direct", "unknown"].includes(String(value))) safeProperties[key] = value;
    else if (key === "device_class" && ["mobile", "tablet", "desktop", "unknown"].includes(String(value))) safeProperties[key] = value;
    else if (key === "outcome" && ["done", "confusing", "blocked"].includes(String(value))) safeProperties[key] = value;
    else if (key === "step" && typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3) safeProperties[key] = value;
    else if (key === "media_count" && typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100) safeProperties[key] = value;
    else if (key === "policy_version" && typeof value === "string" && /^(?:alpha-public-content-v1|\d{4}-\d{2}-\d{2})$/.test(value)) safeProperties[key] = value;
    else if (["vehicle_category", "ownership_type", "resolution_status", "visibility", "feedback_kind"].includes(key) && typeof value === "string" && /^[a-z_]{1,24}$/.test(value)) safeProperties[key] = value;
  }
  window.dataLayer.push({ ...safeProperties, event });
}
import { sanitizeAnalyticsPath } from "./analytics-privacy.ts";
