import assert from "node:assert/strict";
import test from "node:test";
import {
  clearAvatarCache,
  getAvatarObjectUrl,
  invalidateAvatarCache,
} from "../lib/avatar-cache.ts";

const originalCreateObjectUrl = URL.createObjectURL;
const originalRevokeObjectUrl = URL.revokeObjectURL;

test.beforeEach(() => {
  clearAvatarCache();
});

test.after(() => {
  URL.createObjectURL = originalCreateObjectUrl;
  URL.revokeObjectURL = originalRevokeObjectUrl;
  clearAvatarCache();
});

test("reuses a cached avatar and shares concurrent downloads", async () => {
  let calls = 0;
  let resolveDownload: ((blob: Blob) => void) | undefined;
  let urlNumber = 0;
  URL.createObjectURL = () => `blob:avatar-${++urlNumber}`;
  URL.revokeObjectURL = () => undefined;
  const download = () => {
    calls += 1;
    return new Promise<Blob>((resolve) => { resolveDownload = resolve; });
  };

  const first = getAvatarObjectUrl("user-a/avatar.webp", download);
  const second = getAvatarObjectUrl("user-a/avatar.webp", download);
  assert.equal(calls, 1);
  assert.equal(first, second);
  resolveDownload?.(new Blob(["avatar"]));
  assert.equal(await first, "blob:avatar-1");
  assert.equal(await getAvatarObjectUrl("user-a/avatar.webp", download), "blob:avatar-1");
  assert.equal(calls, 1);
});

test("keeps different paths independent", async () => {
  let calls = 0;
  URL.createObjectURL = () => `blob:avatar-${++calls}`;
  URL.revokeObjectURL = () => undefined;
  const download = () => Promise.resolve(new Blob(["avatar"]));
  const first = await getAvatarObjectUrl("user-a/avatar.webp", download);
  const second = await getAvatarObjectUrl("user-b/avatar.webp", download);
  assert.notEqual(first, second);
  assert.equal(calls, 2);
});

test("invalidating an overwritten path revokes the old URL and downloads the new avatar", async () => {
  let calls = 0;
  const revoked: string[] = [];
  URL.createObjectURL = () => `blob:avatar-${++calls}`;
  URL.revokeObjectURL = (url) => revoked.push(url);
  const download = () => Promise.resolve(new Blob([String(calls)]));
  const oldUrl = await getAvatarObjectUrl("user-a/avatar.webp", download);
  invalidateAvatarCache("user-a/avatar.webp");
  const newUrl = await getAvatarObjectUrl("user-a/avatar.webp", download);
  assert.equal(oldUrl, "blob:avatar-1");
  assert.equal(newUrl, "blob:avatar-2");
  assert.deepEqual(revoked, ["blob:avatar-1"]);
});

test("download failures are not cached and can be retried", async () => {
  let calls = 0;
  URL.createObjectURL = () => "blob:avatar";
  URL.revokeObjectURL = () => undefined;
  await assert.rejects(() => getAvatarObjectUrl("user-a/avatar.webp", async () => {
    calls += 1;
    throw new Error("temporary");
  }));
  await getAvatarObjectUrl("user-a/avatar.webp", async () => {
    calls += 1;
    return new Blob(["avatar"]);
  });
  assert.equal(calls, 2);
});

test("clear prevents an in-flight private avatar from returning after logout", async () => {
  let resolveDownload: ((blob: Blob) => void) | undefined;
  const revoked: string[] = [];
  URL.createObjectURL = () => "blob:stale-avatar";
  URL.revokeObjectURL = (url) => revoked.push(url);
  const request = getAvatarObjectUrl("user-a/avatar.webp", () => new Promise<Blob>((resolve) => {
    resolveDownload = resolve;
  }));
  clearAvatarCache();
  resolveDownload?.(new Blob(["avatar"]));
  await assert.rejects(request, /avatar_cache_stale/);
  assert.deepEqual(revoked, ["blob:stale-avatar"]);
});
