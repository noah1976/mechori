export function hasDistinctJournalTitle(title: string, body: string) {
  const normalizedTitle = title.replace(/\s+/g, " ").trim();
  const normalizedBody = body.replace(/\s+/g, " ").trim();

  return Boolean(normalizedTitle) && normalizedTitle !== normalizedBody;
}
