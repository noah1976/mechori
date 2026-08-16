export function quickRecordTitle(note: string, locale: "ja" | "en"): string {
  const firstLine = note
    .trim()
    .split(/\r?\n/, 1)[0]
    ?.replace(/\s+/g, " ")
    .trim();

  if (firstLine) return firstLine.slice(0, 80);
  return locale === "ja" ? "記録" : "Record";
}
