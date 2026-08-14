export interface JournalPrompt {
  id: string;
  label: string;
  hint: string[];
}

export const journalPrompts: JournalPrompt[] = [
  {
    id: "why-this-car",
    label: "このクルマを選んだ理由",
    hint: ["いつ、どこで知りましたか？", "何に惹かれましたか？", "初めて乗ったとき、どう感じましたか？"],
  },
  {
    id: "memorable-event",
    label: "一番印象に残っている出来事",
    hint: ["いつ頃のことですか？", "どこで、何がありましたか？", "そのとき、どう感じましたか？"],
  },
  {
    id: "breakdown-or-repair",
    label: "困った故障や修理",
    hint: ["いつ頃のことですか？", "どんな症状でしたか？", "どう対応しましたか？", "その後どうなりましたか？"],
  },
  {
    id: "recent-part",
    label: "最近交換した部品",
    hint: ["いつ、何を交換しましたか？", "交換した理由は何ですか？", "交換後の変化はありましたか？"],
  },
  {
    id: "today-drive",
    label: "今日乗って感じたこと",
    hint: ["どこへ走りに行きましたか？", "今日のクルマの調子はどうでしたか？", "印象に残った場面はありますか？"],
  },
];

export function findJournalPrompt(id: string | null | undefined): JournalPrompt | undefined {
  return journalPrompts.find((prompt) => prompt.id === id);
}
