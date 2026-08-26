import assert from "node:assert/strict";
import test from "node:test";
import { downloadSharedMediaWithRetry } from "../lib/shared-media-download.ts";

test("retries a rejected shared-media transport request before falling back", async () => {
  let requests = 0;
  let waits = 0;
  const expected = new Blob(["photo"], { type: "image/webp" });

  const result = await downloadSharedMediaWithRetry({
    attempts: 2,
    download: async () => {
      requests += 1;
      if (requests === 1) throw new TypeError("network failed");
      return { data: expected, error: null };
    },
    wait: async () => { waits += 1; },
  });

  assert.equal(result.blob, expected);
  assert.equal(result.failureKind, null);
  assert.equal(result.attempts, 2);
  assert.equal(requests, 2);
  assert.equal(waits, 1);
});

test("keeps returned Storage errors distinct from rejected transport failures", async () => {
  const result = await downloadSharedMediaWithRetry({
    attempts: 2,
    download: async () => ({ data: null, error: { status: 403, code: "access_denied" } }),
    wait: async () => undefined,
  });

  assert.equal(result.blob, null);
  assert.equal(result.failureKind, "storage_response");
  assert.deepEqual(result.error, { status: 403, code: "access_denied" });
  assert.equal(result.attempts, 2);
});
