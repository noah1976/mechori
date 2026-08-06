import type { FollowTargetType } from "@mechori/core";

export type FollowActionError =
  | "not_authenticated"
  | "permission_denied"
  | "network_error"
  | "unknown";

export type FollowActionResult =
  | { ok: true; isFollowing: boolean }
  | { ok: false; error: FollowActionError };

export class AlphaUserFollowError extends Error {
  readonly code: Exclude<FollowActionError, "not_authenticated">;

  constructor(code: Exclude<FollowActionError, "not_authenticated">) {
    super("alpha_user_follow_update_failed");
    this.name = "AlphaUserFollowError";
    this.code = code;
  }
}

export function followActionKey(targetType: FollowTargetType, targetId: string): string {
  return `${targetType}:${targetId}`;
}

export function classifyFollowActionError(error: unknown): FollowActionError {
  if (error instanceof AlphaUserFollowError) return error.code;
  if (error instanceof Error && error.message === "authentication_required") {
    return "not_authenticated";
  }

  const candidate = error as { code?: unknown; status?: unknown; message?: unknown };
  const code = typeof candidate?.code === "string" ? candidate.code.toLowerCase() : "";
  const message = typeof candidate?.message === "string" ? candidate.message.toLowerCase() : "";
  const status = typeof candidate?.status === "number" ? candidate.status : null;

  if (
    status === 401 ||
    status === 403 ||
    code === "42501" ||
    code === "pgrst301" ||
    code.includes("permission") ||
    code.includes("unauthor") ||
    message.includes("permission") ||
    message.includes("unauthor")
  ) {
    return "permission_denied";
  }

  if (
    code.includes("network") ||
    code.includes("fetch") ||
    code.includes("timeout") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    return "network_error";
  }

  return "unknown";
}

export interface FollowActionOperations<TData> {
  isAuthenticated(): boolean;
  getData(): TData;
  isFollowing(data: TData, targetType: FollowTargetType, targetId: string): boolean;
  syncRemote(
    targetType: FollowTargetType,
    targetId: string,
    following: boolean,
  ): Promise<void>;
  persistToggle(
    targetType: FollowTargetType,
    targetId: string,
    following: boolean,
  ): Promise<void>;
  onSuccess?(targetType: FollowTargetType, following: boolean): void;
  onFailure?(error: FollowActionError): void;
  onPendingChange?(key: string, pending: boolean): void;
}

export interface FollowActionController {
  toggleFollow(
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<FollowActionResult>;
}

export function createFollowActionController<TData>(
  operations: FollowActionOperations<TData>,
): FollowActionController {
  const inFlight = new Map<string, Promise<FollowActionResult>>();

  function toggleFollow(
    targetType: FollowTargetType,
    targetId: string,
  ): Promise<FollowActionResult> {
    if (!operations.isAuthenticated()) {
      return Promise.resolve({ ok: false, error: "not_authenticated" });
    }

    const key = followActionKey(targetType, targetId);
    const existing = inFlight.get(key);
    if (existing) return existing;

    const following = !operations.isFollowing(operations.getData(), targetType, targetId);
    operations.onPendingChange?.(key, true);

    const request = (async (): Promise<FollowActionResult> => {
      try {
        await operations.syncRemote(targetType, targetId, following);
        await operations.persistToggle(targetType, targetId, following);
        operations.onSuccess?.(targetType, following);
        return { ok: true, isFollowing: following };
      } catch (error) {
        const result = classifyFollowActionError(error);
        operations.onFailure?.(result);
        return { ok: false, error: result };
      } finally {
        inFlight.delete(key);
        operations.onPendingChange?.(key, false);
      }
    })();

    inFlight.set(key, request);
    return request;
  }

  return { toggleFollow };
}
