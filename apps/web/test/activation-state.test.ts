import assert from "node:assert/strict";
import test from "node:test";
import {
  activationChecklistHref,
  activationOnboardingSteps,
  beginFirstProfileSetup,
  completeActivationOnboarding,
  completeFirstProfileSetup,
  deferDefaultNameRescue,
  dismissActivationChecklist,
  firstProfileSetupIntent,
  firstProfileSetupIntentFromAuthResult,
  hasDeferredDefaultNameRescue,
  hasCompletedActivationOnboarding,
  hasDismissedActivationChecklist,
  needsProfileDisplayNameSetup,
  resolveActivationProgress,
  type ActivationStorage,
} from "../lib/activation-state.ts";

class MemoryStorage implements ActivationStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

test("activation onboarding is a short three-step flow", () => {
  assert.deepEqual(activationOnboardingSteps.map((step) => step.title), [
    "愛車の履歴を育てる",
    "人とクルマでつながる",
    "あなたの経験が、誰かの助けになる",
  ]);
});

test("onboarding completion and checklist dismissal stay scoped to one user", () => {
  const storage = new MemoryStorage();
  assert.equal(hasCompletedActivationOnboarding("owner-a", storage), false);
  assert.equal(completeActivationOnboarding("owner-a", storage), true);
  assert.equal(hasCompletedActivationOnboarding("owner-a", storage), true);
  assert.equal(hasCompletedActivationOnboarding("owner-b", storage), false);
  assert.equal(dismissActivationChecklist("owner-a", storage), true);
  assert.equal(hasDismissedActivationChecklist("owner-a", storage), true);
  assert.equal(hasDismissedActivationChecklist("owner-b", storage), false);
});

test("unavailable browser storage never blocks onboarding or checklist use", () => {
  const unavailable: ActivationStorage = {
    getItem() {
      throw new Error("storage_unavailable");
    },
    setItem() {
      throw new Error("storage_unavailable");
    },
  };
  assert.equal(hasCompletedActivationOnboarding("owner-a", unavailable), false);
  assert.equal(completeActivationOnboarding("owner-a", unavailable), false);
  assert.equal(hasDismissedActivationChecklist("owner-a", unavailable), false);
  assert.equal(dismissActivationChecklist("owner-a", unavailable), false);
});

test("first profile setup intent and default-name rescue stay scoped to one session user", () => {
  const storage = new MemoryStorage();
  assert.equal(firstProfileSetupIntent("owner-a", storage), undefined);
  assert.equal(beginFirstProfileSetup("owner-a", "invite", storage), true);
  assert.equal(firstProfileSetupIntent("owner-a", storage), "invite");
  assert.equal(firstProfileSetupIntent("owner-b", storage), undefined);
  assert.equal(completeFirstProfileSetup("owner-a", storage), true);
  assert.equal(firstProfileSetupIntent("owner-a", storage), undefined);
  assert.equal(hasDeferredDefaultNameRescue("owner-a", storage), false);
  assert.equal(deferDefaultNameRescue("owner-a", storage), true);
  assert.equal(hasDeferredDefaultNameRescue("owner-a", storage), true);
  assert.equal(hasDeferredDefaultNameRescue("owner-b", storage), false);
});

test("only known system defaults or blank values need a display name", () => {
  assert.equal(needsProfileDisplayNameSetup("MECHORI User"), true);
  assert.equal(needsProfileDisplayNameSetup("  "), true);
  assert.equal(needsProfileDisplayNameSetup("Tomoya"), false);
  assert.equal(firstProfileSetupIntentFromAuthResult("sign_up", true), "invite");
  assert.equal(firstProfileSetupIntentFromAuthResult("sign_up", false), "signup");
  assert.equal(firstProfileSetupIntentFromAuthResult("login", true), undefined);
});

test("workspace and social loading never become incomplete checklist items", () => {
  assert.deepEqual(resolveActivationProgress({
    workspaceReady: false,
    socialLoading: false,
    vehicleCount: 0,
    recordCount: 0,
    followCount: 0,
  }), {
    vehicle: "loading",
    record: "loading",
    connection: "loading",
    complete: false,
  });
  assert.equal(resolveActivationProgress({
    workspaceReady: true,
    socialLoading: true,
    vehicleCount: 1,
    recordCount: 1,
    followCount: 0,
  }).connection, "loading");
});

test("existing vehicle, record, and follows complete activation from actual state", () => {
  assert.deepEqual(resolveActivationProgress({
    workspaceReady: true,
    socialLoading: false,
    vehicleCount: 1,
    recordCount: 2,
    followCount: 1,
  }), {
    vehicle: "complete",
    record: "complete",
    connection: "complete",
    complete: true,
  });
});

test("activation actions reuse the existing Garage, record, and discovery routes", () => {
  assert.equal(activationChecklistHref("vehicle"), "/garage/new");
  assert.equal(activationChecklistHref("record", "vehicle id"), "/garage/vehicle%20id/event/new");
  assert.equal(activationChecklistHref("record"), "/garage/new");
  assert.equal(activationChecklistHref("connection"), "/people");
});
