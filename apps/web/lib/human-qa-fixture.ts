import type { PassportHistoryEntryProjection } from "./passport-share-projection";

// Auth-independent, hand-authored TEST DATA. Never populated from an alpha workspace.
export const QA_HISTORY: PassportHistoryEntryProjection[] = [
  {
    serviceDate: "2026-09-01", serviceDatePrecision: "day", summary: "TEST DATA：定期点検",
    items: [{ subject: "TEST DATA：ワイパー", observedCondition: "ゴムの状態を確認したという試験用記録", workPerformed: "試験用の交換記録", parts: [], result: "試験用の確認記録", followUpNote: "次回、状態を確認する" }],
  },
  {
    serviceDate: "2026-08-01", serviceDatePrecision: "day", summary: "TEST DATA：日常点検",
    items: [{ subject: "TEST DATA：灯火類", observedCondition: "試験用の点検記録", parts: [], result: "試験用の確認記録" }],
  },
  {
    serviceDate: "2026-07-01", serviceDatePrecision: "day", summary: "TEST DATA：記録の整理",
    items: [{ subject: "TEST DATA：履歴", workPerformed: "試験用の履歴整理", parts: [] }],
  },
  {
    serviceDate: "2026-06-01", serviceDatePrecision: "day", summary: "TEST DATA：以前の点検",
    items: [{ subject: "TEST DATA：点検", observedCondition: "一覧の展開を確かめる試験用記録", parts: [] }],
  },
];
