export interface AiTokenPrice {
  inputUsdPerMillionTokens: number;
  cachedInputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
}

export interface AiUsageEstimate {
  inputTokens: number;
  cachedInputTokens: number;
  maxOutputTokens: number;
}

export interface AiBudgetPolicy {
  enabled: boolean;
  monthlyHardLimitUsd: number;
  perActorDailyHardLimitUsd: number;
  perActorDailyRequestLimit: number;
}

export interface AiBudgetUsage {
  monthlySpentUsd: number;
  actorDailySpentUsd: number;
  actorDailyRequestCount: number;
}

export type AiExecutionReason =
  | "cache_hit"
  | "allowed"
  | "disabled"
  | "monthly_budget_exceeded"
  | "actor_daily_budget_exceeded"
  | "actor_daily_request_limit_reached";

export interface AiExecutionDecision {
  allowed: boolean;
  providerCallRequired: boolean;
  reason: AiExecutionReason;
  estimatedCostUsd: number;
  projectedMonthlySpendUsd: number;
  projectedActorDailySpendUsd: number;
}

function assertNonNegativeFinite(value: number, name: string): void {
  if (!Number.isFinite(value) || value < 0) throw new Error(`invalid_${name}`);
}

function assertTokenCount(value: number, name: string): void {
  assertNonNegativeFinite(value, name);
  if (!Number.isInteger(value)) throw new Error(`invalid_${name}`);
}

function validateEstimate(estimate: AiUsageEstimate): void {
  assertTokenCount(estimate.inputTokens, "input_tokens");
  assertTokenCount(estimate.cachedInputTokens, "cached_input_tokens");
  assertTokenCount(estimate.maxOutputTokens, "max_output_tokens");
  if (estimate.cachedInputTokens > estimate.inputTokens) {
    throw new Error("cached_input_exceeds_input");
  }
}

function validatePrice(price: AiTokenPrice): void {
  assertNonNegativeFinite(price.inputUsdPerMillionTokens, "input_price");
  assertNonNegativeFinite(price.cachedInputUsdPerMillionTokens, "cached_input_price");
  assertNonNegativeFinite(price.outputUsdPerMillionTokens, "output_price");
}

function validateBudget(policy: AiBudgetPolicy, usage: AiBudgetUsage): void {
  assertNonNegativeFinite(policy.monthlyHardLimitUsd, "monthly_hard_limit");
  assertNonNegativeFinite(policy.perActorDailyHardLimitUsd, "actor_daily_hard_limit");
  assertTokenCount(policy.perActorDailyRequestLimit, "actor_daily_request_limit");
  assertNonNegativeFinite(usage.monthlySpentUsd, "monthly_spend");
  assertNonNegativeFinite(usage.actorDailySpentUsd, "actor_daily_spend");
  assertTokenCount(usage.actorDailyRequestCount, "actor_daily_request_count");
}

export function estimateAiCostUsd(
  estimate: AiUsageEstimate,
  price: AiTokenPrice,
): number {
  validateEstimate(estimate);
  validatePrice(price);

  const uncachedInputTokens = estimate.inputTokens - estimate.cachedInputTokens;
  return (
    uncachedInputTokens * price.inputUsdPerMillionTokens +
    estimate.cachedInputTokens * price.cachedInputUsdPerMillionTokens +
    estimate.maxOutputTokens * price.outputUsdPerMillionTokens
  ) / 1_000_000;
}

export function decideAiExecution(input: {
  cacheAvailable: boolean;
  estimate: AiUsageEstimate;
  price: AiTokenPrice;
  policy: AiBudgetPolicy;
  usage: AiBudgetUsage;
}): AiExecutionDecision {
  const estimatedCostUsd = estimateAiCostUsd(input.estimate, input.price);
  validateBudget(input.policy, input.usage);

  const projectedMonthlySpendUsd = input.usage.monthlySpentUsd + estimatedCostUsd;
  const projectedActorDailySpendUsd = input.usage.actorDailySpentUsd + estimatedCostUsd;
  const base = {
    estimatedCostUsd,
    projectedMonthlySpendUsd,
    projectedActorDailySpendUsd,
  };

  if (input.cacheAvailable) {
    return {
      ...base,
      allowed: true,
      providerCallRequired: false,
      reason: "cache_hit",
    };
  }

  if (!input.policy.enabled) {
    return {
      ...base,
      allowed: false,
      providerCallRequired: false,
      reason: "disabled",
    };
  }

  if (input.usage.actorDailyRequestCount >= input.policy.perActorDailyRequestLimit) {
    return {
      ...base,
      allowed: false,
      providerCallRequired: false,
      reason: "actor_daily_request_limit_reached",
    };
  }

  if (projectedMonthlySpendUsd > input.policy.monthlyHardLimitUsd) {
    return {
      ...base,
      allowed: false,
      providerCallRequired: false,
      reason: "monthly_budget_exceeded",
    };
  }

  if (projectedActorDailySpendUsd > input.policy.perActorDailyHardLimitUsd) {
    return {
      ...base,
      allowed: false,
      providerCallRequired: false,
      reason: "actor_daily_budget_exceeded",
    };
  }

  return {
    ...base,
    allowed: true,
    providerCallRequired: true,
    reason: "allowed",
  };
}
