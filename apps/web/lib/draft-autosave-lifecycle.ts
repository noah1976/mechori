export interface DraftAutosaveLifecycle {
  schedule(callback: () => void, delayMs: number): void;
  cancelPending(): void;
  beginSubmission(): void;
  completeSuccess(clearDraft: () => void): void;
  completeFailure(persistDraft: () => boolean): boolean;
  resume(): void;
  dispose(): void;
}

export function createDraftAutosaveLifecycle<TTimer>(
  scheduleTimer: (callback: () => void, delayMs: number) => TTimer,
  cancelTimer: (timer: TTimer) => void,
): DraftAutosaveLifecycle {
  let pendingTimer: TTimer | undefined;
  let generation = 0;
  let suspended = false;

  function cancelPending() {
    generation += 1;
    if (pendingTimer !== undefined) {
      cancelTimer(pendingTimer);
      pendingTimer = undefined;
    }
  }

  return {
    schedule(callback, delayMs) {
      cancelPending();
      if (suspended) return;

      const scheduledGeneration = generation;
      pendingTimer = scheduleTimer(() => {
        pendingTimer = undefined;
        if (suspended || scheduledGeneration !== generation) return;
        callback();
      }, delayMs);
    },
    cancelPending,
    beginSubmission() {
      suspended = true;
      cancelPending();
    },
    completeSuccess(clearDraft) {
      suspended = true;
      cancelPending();
      clearDraft();
    },
    completeFailure(persistDraft) {
      cancelPending();
      const persisted = persistDraft();
      suspended = false;
      return persisted;
    },
    resume() {
      suspended = false;
    },
    dispose() {
      suspended = true;
      cancelPending();
    },
  };
}
