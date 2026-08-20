export const garageHistoryBatchSize = 12;

export function visibleGarageHistory<T>(items: T[], visibleCount: number): T[] {
  return items.slice(0, Math.max(0, visibleCount));
}

export function nextGarageHistoryCount(
  visibleCount: number,
  totalCount: number,
  batchSize = garageHistoryBatchSize,
): number {
  return Math.min(totalCount, Math.max(0, visibleCount) + Math.max(1, batchSize));
}
