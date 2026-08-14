export type PublicVehicleShareErrorKind =
  | "temporary"
  | "permission"
  | "public_content_required"
  | "setup_required"
  | "unknown";

type ErrorDetails = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

export function classifyPublicVehicleShareError(value: unknown): PublicVehicleShareErrorKind {
  const error = publicVehicleShareErrorText(value).toLowerCase();

  if (
    error.includes("prepared_vehicle_photo_required") ||
    error.includes("public_vehicle_share_public_content_required")
  ) {
    return "public_content_required";
  }
  if (
    error.includes("authentication_required") ||
    error.includes("public_vehicle_share_permission") ||
    error.includes("permission denied") ||
    error.includes("42501") ||
    error.includes("jwt expired") ||
    error.includes("invalid jwt")
  ) {
    return "permission";
  }
  if (
    error.includes("public_vehicle_share_setup_required") ||
    error.includes("42p01") ||
    error.includes("pgrst202") ||
    error.includes("pgrst205") ||
    (error.includes("schema cache") &&
      (error.includes("alpha_public_vehicle_shares") || error.includes("get_my_vehicle_share")))
  ) {
    return "setup_required";
  }
  if (
    error.includes("public_vehicle_share_temporary") ||
    error.includes("failed to fetch") ||
    error.includes("networkerror") ||
    error.includes("network request failed") ||
    error.includes("timeout") ||
    error.includes("aborted")
  ) {
    return "temporary";
  }

  return "unknown";
}

export function publicVehicleShareErrorMessage(
  kind: PublicVehicleShareErrorKind,
  ja: boolean,
): string {
  switch (kind) {
    case "temporary":
      return ja
        ? "通信が安定しませんでした。接続を確認して、もう一度お試しください。"
        : "The connection was interrupted. Check your connection and try again.";
    case "permission":
      return ja
        ? "共有ページを更新する権限を確認できませんでした。いったん再ログインして、もう一度お試しください。"
        : "We could not confirm permission to update this page. Sign in again, then retry.";
    case "public_content_required":
      return ja
        ? "共有できるメイン写真が必要です。愛車編集で写真を保存してから、もう一度お試しください。"
        : "A shareable main photo is required. Save one in vehicle editing, then try again.";
    case "setup_required":
      return ja
        ? "共有機能は現在準備中です。愛車の非公開データは変更されていません。しばらくしてからお試しください。"
        : "Sharing is currently being prepared. Your private vehicle data was not changed. Please try again later.";
    default:
      return ja
        ? "共有ページを更新できませんでした。もう一度試しても解決しない場合は、フィードバックからお知らせください。"
        : "The share page could not be updated. If retrying does not help, send us feedback.";
  }
}

function publicVehicleShareErrorText(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (!value || typeof value !== "object") return String(value);

  const error = value as ErrorDetails;
  return [error.code, error.message, error.details, error.hint]
    .filter((part): part is string => typeof part === "string")
    .join(" ");
}
