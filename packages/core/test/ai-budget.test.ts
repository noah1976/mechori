import assert from "node:assert/strict";
import test from "node:test";

import { decideAiExecution, estimateAiCostUsd } from "../src/index.ts";

const price = {
  inputUsdPerMillionTokens: 0.2,
  cachedInputUsdPerMillionTokens: 0.02,
  outputUsdPerMillionTokens: 1.25,
};

const estimate = {
  inputTokens: 4_000,
  cachedInputTokens: 1_000,
  maxOutputTokens: 500,
};

const policy = {
  enabled: true,
  monthlyHardLimitUsd: 5,
  perActorDailyHardLimitUsd: 0.1,
  perActorDailyRequestLimit: 3,
};

test("estimates uncached, cached, and maximum output cost separately", () => {
  assert.equal(estimateAiCostUsd(estimate, price), 0.001245);
});

test("uses a cached result without spending provider budget", () => {
  const decision = decideAiExecution({
    cacheAvailable: true,
    estimate,
    price,
    policy: { ...policy, enabled: false },
    usage: {
      monthlySpentUsd: 5,
      actorDailySpentUsd: 0.1,
      actorDailyRequestCount: 3,
    },
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.providerCallRequired, false);
  assert.equal(decision.reason, "cache_hit");
});

test("blocks a provider call before crossing the monthly hard limit", () => {
  const decision = decideAiExecution({
    cacheAvailable: false,
    estimate,
    price,
    policy,
    usage: {
      monthlySpentUsd: 4.999,
      actorDailySpentUsd: 0,
      actorDailyRequestCount: 0,
    },
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "monthly_budget_exceeded");
});

test("blocks repeated generation at the actor daily request limit", () => {
  const decision = decideAiExecution({
    cacheAvailable: false,
    estimate,
    price,
    policy,
    usage: {
      monthlySpentUsd: 0,
      actorDailySpentUsd: 0,
      actorDailyRequestCount: 3,
    },
  });

  assert.equal(decision.allowed, false);
  assert.equal(decision.reason, "actor_daily_request_limit_reached");
});

test("allows a bounded provider call when all gates have room", () => {
  const decision = decideAiExecution({
    cacheAvailable: false,
    estimate,
    price,
    policy,
    usage: {
      monthlySpentUsd: 1,
      actorDailySpentUsd: 0,
      actorDailyRequestCount: 0,
    },
  });

  assert.equal(decision.allowed, true);
  assert.equal(decision.providerCallRequired, true);
  assert.equal(decision.reason, "allowed");
});

test("rejects an invalid cached token estimate", () => {
  assert.throws(
    () =>
      estimateAiCostUsd(
        { inputTokens: 100, cachedInputTokens: 101, maxOutputTokens: 10 },
        price,
      ),
    /cached_input_exceeds_input/,
  );
});
