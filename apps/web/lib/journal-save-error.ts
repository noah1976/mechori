export type JournalSaveErrorCode =
  | "authentication_required"
  | "journal_not_found"
  | "journal_permission_denied"
  | "journal_invalid"
  | "persistence_failed"
  | "alpha_shared_image_sync_failed"
  | "alpha_shared_journal_sync_failed"
  | "unknown";

export function journalSaveErrorCode(error: unknown): JournalSaveErrorCode {
  const value = error instanceof Error ? error.message : "";
  if (value === "authentication_required") return "authentication_required";
  if (value === "journal_not_found") return "journal_not_found";
  if (
    value === "journal_owner_required" ||
    value === "journal_vehicle_owner_required"
  ) {
    return "journal_permission_denied";
  }
  if (value === "journal_invalid") return "journal_invalid";
  if (value === "persistence_failed" || value === "alpha_workspace_save_failed") {
    return "persistence_failed";
  }
  if (
    value === "media_storage_key_required" ||
    value === "shared_image_not_found" ||
    value === "invalid_shared_image" ||
    value === "shared_image_prepare_failed" ||
    value === "alpha_shared_image_upload_failed" ||
    value === "alpha_shared_image_sync_failed"
  ) {
    return "alpha_shared_image_sync_failed";
  }
  if (
    value === "alpha_journal_sharing_unavailable" ||
    value === "alpha_shared_journal_publish_failed" ||
    value === "alpha_shared_journal_withdraw_failed" ||
    value === "alpha_shared_journal_sync_failed"
  ) {
    return "alpha_shared_journal_sync_failed";
  }
  return "unknown";
}

export function alphaJournalSyncError(error: unknown): Error {
  const code = journalSaveErrorCode(error);
  if (code === "authentication_required") return new Error(code);
  if (code === "alpha_shared_image_sync_failed") return new Error(code);
  return new Error("alpha_shared_journal_sync_failed");
}

export function journalSaveErrorMessage(error: unknown, ja: boolean): string {
  switch (journalSaveErrorCode(error)) {
    case "authentication_required":
      return ja
        ? "ログインの有効期限が切れました。入力内容はこの画面に残っています。もう一度ログインしてから保存してください。"
        : "Your session expired. Your changes remain on this screen. Sign in again before saving.";
    case "journal_not_found":
      return ja
        ? "編集元の記録が見つかりません。入力内容はこの画面に残っています。再読み込みして記録を確認してください。"
        : "The original record could not be found. Your changes remain on this screen. Reload and check the record.";
    case "journal_permission_denied":
      return ja
        ? "この記録を変更する権限を確認できませんでした。入力内容はこの画面に残っています。"
        : "Permission to change this record could not be confirmed. Your changes remain on this screen.";
    case "journal_invalid":
      return ja
        ? "入力内容を保存できませんでした。タイトル、時期、本文、写真説明を確認してください。"
        : "The entered content could not be saved. Check the title, period, text, and photo descriptions.";
    case "persistence_failed":
      return ja
        ? "記録本体をMECHORIへ保存できませんでした。入力内容はこの画面に残っています。通信状態を確認して、もう一度お試しください。"
        : "The record itself could not be saved to MECHORI. Your changes remain on this screen. Check your connection and try again.";
    case "alpha_shared_image_sync_failed":
      return ja
        ? "写真の共有版を更新できませんでした。既存の記録と写真は失われていません。入力内容を保ったまま、もう一度お試しください。"
        : "The shared photo copy could not be updated. Your existing record and photo were not lost. Try again with your changes still here.";
    case "alpha_shared_journal_sync_failed":
      return ja
        ? "α参加者向けの公開内容を更新できませんでした。既存の記録は失われていません。時間をおいて、もう一度お試しください。"
        : "The alpha-visible copy could not be updated. Your existing record was not lost. Please try again shortly.";
    default:
      return ja
        ? "保存できませんでした。入力内容はこの画面に残っています。もう一度試しても解決しない場合は、運営者へお知らせください。"
        : "This record could not be saved. Your changes remain on this screen. If retrying does not help, contact the project owner.";
  }
}
