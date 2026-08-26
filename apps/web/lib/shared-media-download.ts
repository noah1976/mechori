export interface SharedMediaDownloadResponse {
  data: Blob | null;
  error: unknown | null;
}

export type SharedMediaDownloadFailureKind = "storage_response" | "transport";

export type SharedMediaDownloadResult =
  | { blob: Blob; error: null; attempts: number; failureKind: null }
  | {
      blob: null;
      error: unknown;
      attempts: number;
      failureKind: SharedMediaDownloadFailureKind;
    };

/**
 * Storage reports expected request failures as `{ data: null, error }`, while
 * browser transport failures reject. Both are retryable without changing the
 * authenticated Storage contract.
 */
export async function downloadSharedMediaWithRetry(input: {
  attempts: number;
  download: () => Promise<SharedMediaDownloadResponse>;
  wait: () => Promise<void>;
}): Promise<SharedMediaDownloadResult> {
  let lastError: unknown = { code: "empty_storage_response" };
  let failureKind: SharedMediaDownloadFailureKind = "storage_response";

  for (let attempt = 1; attempt <= input.attempts; attempt += 1) {
    try {
      const result = await input.download();
      if (!result.error && result.data) {
        return { blob: result.data, error: null, attempts: attempt, failureKind: null };
      }
      lastError = result.error ?? lastError;
      failureKind = "storage_response";
    } catch (error) {
      lastError = error;
      failureKind = "transport";
    }

    if (attempt < input.attempts) {
      try {
        await input.wait();
      } catch (error) {
        return { blob: null, error, attempts: attempt, failureKind: "transport" };
      }
    }
  }

  return { blob: null, error: lastError, attempts: input.attempts, failureKind };
}
