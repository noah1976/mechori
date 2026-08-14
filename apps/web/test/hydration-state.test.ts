import assert from "node:assert/strict";
import test from "node:test";
import {
  createKeyedSingleFlight,
  shouldLoadSocialData,
} from "../lib/hydration-state.ts";

test("social hydration requires an authenticated, ready alpha workspace", () => {
  assert.equal(shouldLoadSocialData({ isRemoteAlpha: true, signedIn: true, workspaceLoadState: "ready" }), true);
  assert.equal(shouldLoadSocialData({ isRemoteAlpha: true, signedIn: true, workspaceLoadState: "loading" }), false);
  assert.equal(shouldLoadSocialData({ isRemoteAlpha: true, signedIn: false, workspaceLoadState: "ready" }), false);
  assert.equal(shouldLoadSocialData({ isRemoteAlpha: false, signedIn: true, workspaceLoadState: "ready" }), false);
});

test("single-flight social hydration shares concurrent work and reuses a successful result", async () => {
  const coordinator = createKeyedSingleFlight();
  let resolveTask: (() => void) | undefined;
  let calls = 0;
  const task = () => {
    calls += 1;
    return new Promise<void>((resolve) => { resolveTask = resolve; });
  };
  const first = coordinator.run("profile-a", task);
  const second = coordinator.run("profile-a", task);
  assert.equal(first, second);
  assert.equal(calls, 1);
  resolveTask?.();
  await first;
  await coordinator.run("profile-a", task);
  assert.equal(calls, 1);
});

test("failed hydration can retry and reset clears a completed user", async () => {
  const coordinator = createKeyedSingleFlight();
  let calls = 0;
  await assert.rejects(() => coordinator.run("profile-a", async () => {
    calls += 1;
    throw new Error("temporary failure");
  }));
  await coordinator.run("profile-a", async () => { calls += 1; });
  coordinator.reset();
  await coordinator.run("profile-a", async () => { calls += 1; });
  assert.equal(calls, 3);
});
