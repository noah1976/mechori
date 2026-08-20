import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  garageHistoryBatchSize,
  nextGarageHistoryCount,
  visibleGarageHistory,
} from "../lib/garage-history.ts";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Garage exposes every history item in stable batches without duplicates", () => {
  const history = Array.from({ length: 29 }, (_, index) => `record-${index}`);
  const first = visibleGarageHistory(history, garageHistoryBatchSize);
  const secondCount = nextGarageHistoryCount(first.length, history.length);
  const second = visibleGarageHistory(history, secondCount);
  const final = visibleGarageHistory(
    history,
    nextGarageHistoryCount(second.length, history.length),
  );

  assert.deepEqual(first, history.slice(0, 12));
  assert.deepEqual(second, history.slice(0, 24));
  assert.deepEqual(final, history);
  assert.equal(new Set(final).size, history.length);
});

test("small and empty histories need no artificial extra batch", () => {
  assert.deepEqual(visibleGarageHistory([], garageHistoryBatchSize), []);
  assert.deepEqual(visibleGarageHistory(["a", "b"], garageHistoryBatchSize), ["a", "b"]);
  assert.equal(nextGarageHistoryCount(2, 2), 2);
});

test("Garage keeps an automatic continuation and an accessible explicit fallback", () => {
  const garage = read("../app/garage/page.tsx");
  assert.match(garage, /new IntersectionObserver/);
  assert.match(garage, /さらに過去の記録を見る/);
  assert.match(garage, /nextGarageHistoryCount/);
  assert.match(garage, /continuation=\{hasMore \? undefined : continuation\}/);
  assert.doesNotMatch(garage, /timeline\.slice\(0, 12\)/);
  assert.doesNotMatch(garage, /最近の12件を表示しています/);
});
