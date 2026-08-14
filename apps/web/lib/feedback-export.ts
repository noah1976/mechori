export type FeedbackExportKind = "liked" | "confusing" | "broken" | "missing" | "other";
export type FeedbackExportStatus = "new" | "reviewing" | "planned" | "resolved" | "closed";

export interface FeedbackExportItem {
  id: string;
  displayName: string;
  kind: FeedbackExportKind;
  content: string;
  pagePath: string;
  appBuild: string;
  status: FeedbackExportStatus;
  adminNote: string;
  createdAt: string;
}

export interface FeedbackExportFilter {
  query: string;
  kind: FeedbackExportKind | "all";
  status: FeedbackExportStatus | "all";
  from: string;
  to: string;
}

const kindLabels: Record<FeedbackExportKind, string> = {
  liked: "良かった",
  confusing: "迷った",
  broken: "動かなかった",
  missing: "欲しい",
  other: "その他",
};

const statusLabels: Record<FeedbackExportStatus, string> = {
  new: "未確認",
  reviewing: "確認済み",
  planned: "対応中",
  resolved: "完了",
  closed: "保留",
};

function dateKey(value: string): string {
  return value.slice(0, 10);
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function sortByCreatedAt(items: FeedbackExportItem[]): FeedbackExportItem[] {
  return [...items].sort((left, right) => {
    const byDate = left.createdAt.localeCompare(right.createdAt);
    return byDate || left.id.localeCompare(right.id);
  });
}

export function filterAdminFeedback(
  items: FeedbackExportItem[],
  filter: FeedbackExportFilter,
): FeedbackExportItem[] {
  const query = normalized(filter.query);
  return sortByCreatedAt(items.filter((item) => {
    const searchable = normalized([
      item.displayName,
      item.kind,
      item.content,
      item.pagePath,
      item.adminNote,
    ].join(" "));
    const itemDate = dateKey(item.createdAt);
    return (!query || searchable.includes(query))
      && (filter.kind === "all" || item.kind === filter.kind)
      && (filter.status === "all" || item.status === filter.status)
      && (!filter.from || itemDate >= filter.from)
      && (!filter.to || itemDate <= filter.to);
  }));
}

function line(value: string): string {
  return value.replaceAll("\r\n", "\n").replaceAll("\r", "\n").trim();
}

export function buildFeedbackReviewMarkdown(
  items: FeedbackExportItem[],
  filter?: FeedbackExportFilter,
): string {
  const sorted = sortByCreatedAt(items);
  const filterSummary = filter
    ? [
        filter.query.trim() ? `検索=${filter.query.trim()}` : "",
        filter.kind !== "all" ? `種別=${kindLabels[filter.kind]}` : "",
        filter.status !== "all" ? `状態=${statusLabels[filter.status]}` : "",
        filter.from ? `開始日=${filter.from}` : "",
        filter.to ? `終了日=${filter.to}` : "",
      ].filter(Boolean).join(" / ") || "全件"
    : "全件";
  const sections = sorted.map((item) => {
    const fields = [
      `- Date: ${item.createdAt}`,
      `- Type: ${kindLabels[item.kind]} (${item.kind})`,
      `- Status: ${statusLabels[item.status]} (${item.status})`,
      item.displayName.trim() ? `- User: ${line(item.displayName)}` : "",
      item.pagePath.trim() ? `- Screen: ${line(item.pagePath)}` : "",
      item.appBuild.trim() ? `- App build: ${line(item.appBuild)}` : "",
    ].filter(Boolean);
    const memo = item.adminNote.trim()
      ? `\n### Admin memo\n\n${line(item.adminNote)}\n`
      : "";
    return `## ${line(item.id)}\n\n${fields.join("\n")}\n\n### Feedback\n\n${line(item.content)}\n${memo}`;
  });

  return [
    "# MECHORI User Feedback Review",
    "",
    "以下はMECHORIユーザーから届いたフィードバックです。",
    "Feedbackは実装要求ではなく、ユーザー体験を判断するための観測データです。すべてを採用しないでください。最終的な採否はProduct Ownerが判断します。",
    "",
    "## GPT review instruction",
    "",
    "1. 意味が同じFeedbackを重複整理する。",
    "2. Bug / UX・分かりにくさ / Request / Positive / Otherに分類する。",
    "3. 重要度をP0 / P1 / P2 / P3で評価する。",
    "4. 今すぐ修正するものと、観察を続けるものを分ける。",
    "5. MECHORIの目的・安全性・コスト・利用頻度・既存仕様との整合性を確認し、矛盾する要望は指摘する。",
    "6. 各Feedbackを採用候補・要検討・保留・見送り候補へ理由付きで整理する。",
    "7. 複数Feedbackに共通する根本原因をまとめ、実装候補はCodexへ渡せる単位へグルーピングする。",
    "8. 追加調査や人間QAが必要なものを分離し、Feedbackだけで判断できないことを推測で断定しない。",
    "",
    "## Export scope",
    "",
    `- Count: ${sorted.length}`,
    "- Sort: submitted datetime ascending; ID ascending for ties",
    `- Filters: ${filterSummary}`,
    "",
    "---",
    "",
    ...sections.flatMap((section) => [section, "---", ""]),
  ].join("\n");
}

export function createFeedbackExportFilename(date = new Date()): string {
  return `mechori-feedback-${date.toISOString().slice(0, 10)}.md`;
}
