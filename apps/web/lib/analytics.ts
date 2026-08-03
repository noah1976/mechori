export type MechoriAnalyticsEvent =
  | "content_policy_accepted"
  | "feedback_submitted"
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
  window.dataLayer.push({ event, ...properties });
}
