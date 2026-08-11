export type ActivationChecklistItemId = "vehicle" | "record" | "connection";
export type ActivationChecklistItemState = "complete" | "pending" | "loading";

export interface ActivationProgressInput {
  workspaceReady: boolean;
  socialLoading: boolean;
  vehicleCount: number;
  recordCount: number;
  followCount: number;
}

export interface ActivationProgress {
  vehicle: ActivationChecklistItemState;
  record: ActivationChecklistItemState;
  connection: ActivationChecklistItemState;
  complete: boolean;
}

export interface ActivationStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const onboardingPrefix = "mechori.prototype.activation-onboarding.v1.";
const checklistDismissedPrefix = "mechori.prototype.activation-checklist-dismissed.v1.";

export const activationOnboardingSteps = [
  {
    title: "愛車の履歴を育てる",
    body: "整備、故障、部品交換、ちょっとした思い出まで。愛車の記録として少しずつ積み重ねられます。",
  },
  {
    title: "人とクルマでつながる",
    body: "友人や気になるオーナーだけでなく、特定のクルマそのものもフォローできます。",
  },
  {
    title: "あなたの経験が、誰かの助けになる",
    body: "あなたが残した記録が、同じクルマや似た悩みを持つ誰かのヒントになります。",
  },
] as const;

export function activationOnboardingKey(profileId: string): string {
  return `${onboardingPrefix}${storageKeyPart(profileId)}`;
}

export function activationChecklistDismissedKey(profileId: string): string {
  return `${checklistDismissedPrefix}${storageKeyPart(profileId)}`;
}

export function hasCompletedActivationOnboarding(
  profileId: string,
  storage = browserStorage(),
): boolean {
  return readStoredFlag(storage, activationOnboardingKey(profileId));
}

export function completeActivationOnboarding(
  profileId: string,
  storage = browserStorage(),
): boolean {
  return writeStoredFlag(storage, activationOnboardingKey(profileId));
}

export function hasDismissedActivationChecklist(
  profileId: string,
  storage = browserStorage(),
): boolean {
  return readStoredFlag(storage, activationChecklistDismissedKey(profileId));
}

export function dismissActivationChecklist(
  profileId: string,
  storage = browserStorage(),
): boolean {
  return writeStoredFlag(storage, activationChecklistDismissedKey(profileId));
}

export function resolveActivationProgress(input: ActivationProgressInput): ActivationProgress {
  if (!input.workspaceReady) {
    return {
      vehicle: "loading",
      record: "loading",
      connection: "loading",
      complete: false,
    };
  }

  const vehicle = input.vehicleCount > 0 ? "complete" : "pending";
  const record = input.recordCount > 0 ? "complete" : "pending";
  const connection = input.followCount > 0
    ? "complete"
    : input.socialLoading
      ? "loading"
      : "pending";

  return {
    vehicle,
    record,
    connection,
    complete: vehicle === "complete" && record === "complete" && connection === "complete",
  };
}

export function activationChecklistHref(
  item: ActivationChecklistItemId,
  preferredVehicleId?: string,
): string {
  switch (item) {
    case "vehicle":
      return "/garage/new";
    case "record":
      return preferredVehicleId
        ? `/garage/${encodeURIComponent(preferredVehicleId)}/event/new`
        : "/garage/new";
    case "connection":
      return "/people";
  }
}

function browserStorage(): ActivationStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function readStoredFlag(storage: ActivationStorage | null, key: string): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(key) === "complete";
  } catch {
    return false;
  }
}

function writeStoredFlag(storage: ActivationStorage | null, key: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, "complete");
    return true;
  } catch {
    return false;
  }
}

function storageKeyPart(value: string): string {
  return encodeURIComponent(value).replace(/%/g, "_");
}
