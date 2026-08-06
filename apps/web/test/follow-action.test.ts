import assert from "node:assert/strict";
import test from "node:test";
import {
  AlphaUserFollowError,
  createFollowActionController,
  followActionKey,
  type FollowActionError,
} from "../lib/follow-action.ts";

interface TestData {
  followed: Set<string>;
}

function createTestController(options: {
  syncRemote?: (
    targetType: "profile" | "vehicle",
    targetId: string,
    following: boolean,
  ) => Promise<void>;
} = {}) {
  let data: TestData = { followed: new Set() };
  const failures: FollowActionError[] = [];
  const pending = new Set<string>();
  const controller = createFollowActionController<TestData>({
    isAuthenticated: () => true,
    getData: () => data,
    isFollowing: (current, targetType, targetId) =>
      current.followed.has(followActionKey(targetType, targetId)),
    syncRemote: options.syncRemote ?? (async () => undefined),
    persistToggle: async (targetType, targetId, following) => {
      const next = new Set(data.followed);
      const key = followActionKey(targetType, targetId);
      if (following) next.add(key);
      else next.delete(key);
      data = { followed: next };
    },
    onFailure: (error) => failures.push(error),
    onPendingChange: (key, isPending) => {
      if (isPending) pending.add(key);
      else pending.delete(key);
    },
  });
  return { controller, getData: () => data, failures, pending };
}

test("returns a typed success result and persists a follow", async () => {
  const { controller, getData } = createTestController();

  const result = await controller.toggleFollow("profile", "profile-1");

  assert.deepEqual(result, { ok: true, isFollowing: true });
  assert.equal(getData().followed.has("profile:profile-1"), true);
});

test("returns a safe failure and leaves state retryable", async () => {
  let fail = true;
  const { controller, getData, failures } = createTestController({
    syncRemote: async () => {
      if (fail) {
        fail = false;
        throw new Error("network fetch failed");
      }
    },
  });

  const failed = await controller.toggleFollow("vehicle", "vehicle-1");
  assert.deepEqual(failed, { ok: false, error: "network_error" });
  assert.equal(getData().followed.size, 0);
  assert.deepEqual(failures, ["network_error"]);

  const retried = await controller.toggleFollow("vehicle", "vehicle-1");
  assert.deepEqual(retried, { ok: true, isFollowing: true });
  assert.equal(getData().followed.has("vehicle:vehicle-1"), true);
});

test("deduplicates an in-flight action for the same target", async () => {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let remoteCalls = 0;
  const { controller, pending } = createTestController({
    syncRemote: async () => {
      remoteCalls += 1;
      await gate;
    },
  });

  const first = controller.toggleFollow("profile", "same-target");
  const second = controller.toggleFollow("profile", "same-target");
  assert.strictEqual(first, second);
  assert.equal(pending.has("profile:same-target"), true);
  release();

  await Promise.all([first, second]);
  assert.equal(remoteCalls, 1);
  assert.equal(pending.size, 0);
});

test("allows different target types with the same id to run concurrently", async () => {
  const gates = new Map<string, () => void>();
  const { controller } = createTestController({
    syncRemote: async (targetType, targetId) => {
      await new Promise<void>((resolve) => {
        gates.set(followActionKey(targetType, targetId), resolve);
      });
    },
  });

  const profile = controller.toggleFollow("profile", "shared-id");
  const vehicle = controller.toggleFollow("vehicle", "shared-id");
  assert.notStrictEqual(profile, vehicle);
  assert.equal(gates.size, 2);

  gates.get("profile:shared-id")?.();
  gates.get("vehicle:shared-id")?.();
  assert.deepEqual(await Promise.all([profile, vehicle]), [
    { ok: true, isFollowing: true },
    { ok: true, isFollowing: true },
  ]);
});

test("maps authorization failures without exposing the internal error", async () => {
  const { controller } = createTestController({
    syncRemote: async () => {
      throw new AlphaUserFollowError("permission_denied");
    },
  });

  const result = await controller.toggleFollow("profile", "private-profile");

  assert.deepEqual(result, { ok: false, error: "permission_denied" });
  assert.deepEqual(Object.keys(result), ["ok", "error"]);
});
