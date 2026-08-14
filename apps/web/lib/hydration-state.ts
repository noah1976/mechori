export type WorkspaceLoadState = "loading" | "ready" | "error";

export function isWorkspaceReady(state: WorkspaceLoadState): boolean {
  return state === "ready";
}

export function shouldLoadSocialData(input: {
  isRemoteAlpha: boolean;
  signedIn: boolean;
  workspaceLoadState: WorkspaceLoadState;
}): boolean {
  return input.isRemoteAlpha && input.signedIn && isWorkspaceReady(input.workspaceLoadState);
}

export function createKeyedSingleFlight() {
  let completedKey: string | null = null;
  let pending: { key: string; promise: Promise<void> } | null = null;
  let generation = 0;

  return {
    run(key: string, task: () => Promise<void>, force = false): Promise<void> {
      if (pending?.key === key) return pending.promise;
      if (!force && completedKey === key) return Promise.resolve();

      const taskGeneration = generation;
      const promise = task().then(
        () => {
          if (generation === taskGeneration) completedKey = key;
        },
        (error: unknown) => {
          if (completedKey === key) completedKey = null;
          throw error;
        },
      ).finally(() => {
        if (pending?.promise === promise) pending = null;
      });
      pending = { key, promise };
      return promise;
    },
    reset() {
      generation += 1;
      completedKey = null;
      pending = null;
    },
  };
}
