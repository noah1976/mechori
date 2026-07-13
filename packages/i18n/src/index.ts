import type { Locale } from "@mechory/core";

const ja = {
  tagline: "直して、シェアして、また走ろう。",
  home: "ホーム",
  garage: "My Garage",
  records: "整備履歴",
  search: "ナレッジ検索",
  import: "取り込み",
  addRecord: "整備記録を追加",
  recentRecords: "最近の整備記録",
  vehicleOverview: "登録車両",
  private: "非公開",
  pending_review: "運営確認待ち",
  public: "公開",
  resolved: "解決済み",
  unresolved: "未解決",
  owner_confirmed: "オーナー確認済み",
  ai_draft: "AI整理・未確認",
  mechanic_confirmed: "メカニック確認済み",
  official_source: "公的資料",
  unconfirmed: "未確認",
  demo: "DEMO / サンプル",
  demoNotice: "表示内容は操作確認用のサンプルで、実在する整備情報ではありません。",
  resetDemo: "デモデータをリセット",
  noResults: "条件に一致する公開候補はありません。検索範囲を広げても、MECHORYは原因を生成しません。",
} as const;

const en: Record<keyof typeof ja, string> = {
  tagline: "Fix. Share. Drive on.",
  home: "Home",
  garage: "My Garage",
  records: "Maintenance history",
  search: "Knowledge search",
  import: "Import",
  addRecord: "Add maintenance record",
  recentRecords: "Recent records",
  vehicleOverview: "Registered vehicle",
  private: "Private",
  pending_review: "Pending review",
  public: "Public",
  resolved: "Resolved",
  unresolved: "Unresolved",
  owner_confirmed: "Owner confirmed",
  ai_draft: "AI-organized, unconfirmed",
  mechanic_confirmed: "Mechanic confirmed",
  official_source: "Official source",
  unconfirmed: "Unconfirmed",
  demo: "DEMO / SAMPLE",
  demoNotice: "All displayed content is sample data for interaction testing, not real maintenance information.",
  resetDemo: "Reset demo data",
  noResults: "No shared candidate matches these filters. MECHORY will not invent a cause when no record exists.",
};

export const dictionaries = { ja, en };
export type TranslationKey = keyof typeof ja;

export function translate(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale][key];
}
