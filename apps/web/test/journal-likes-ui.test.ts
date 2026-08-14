import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const contextSource = readFileSync(
  new URL("../lib/app-context.tsx", import.meta.url),
  "utf8",
);
const cardSource = readFileSync(
  new URL("../components/journal-card.tsx", import.meta.url),
  "utf8",
);
const detailSource = readFileSync(
  new URL("../app/journal/[id]/page.tsx", import.meta.url),
  "utf8",
);
const migrationSource = readFileSync(
  new URL(
    "../../../supabase/migrations/202608030001_alpha_operations_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);

test("journal likes use an idempotent authenticated server operation", () => {
  assert.match(migrationSource, /primary key \(user_id, shared_journal_id\)/);
  assert.match(migrationSource, /on conflict do nothing/);
  assert.match(migrationSource, /where user_id = auth\.uid\(\) and shared_journal_id = p_share_id/);
  assert.match(migrationSource, /cannot_like_own_journal/);
});

test("like state is optimistic, rolls back on failure, and rejects concurrent requests", () => {
  assert.match(contextSource, /journalLikeRequests\.current\.has\(journalId\)/);
  assert.match(contextSource, /journalLikeRequests\.current\.add\(journalId\)/);
  assert.match(contextSource, /journalLikeRequests\.current\.delete\(journalId\)/);
  assert.match(contextSource, /next\.set\(journalId, previous\)/);
  assert.match(contextSource, /appreciationCount \+ \(nextLiked \? 1 : -1\)/);
});

test("feed and detail keep self-likes unavailable and do not navigate on a card like", () => {
  assert.match(cardSource, /const isOwnJournal/);
  assert.match(cardSource, /event\.preventDefault\(\)/);
  assert.match(cardSource, /event\.stopPropagation\(\)/);
  assert.match(detailSource, /const canReact = signedIn && !ownJournal && isRemoteAlpha/);
  assert.match(detailSource, /ownJournal && isRemoteAlpha/);
});
