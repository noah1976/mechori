import assert from "node:assert/strict";
import test from "node:test";

import {
  AlphaMailError,
  bodyToHtml,
  createMailPlan,
  deliverMail,
  normalizeRecipients,
  parseCliArgs,
} from "./lib.mjs";

const BASE_ENV = {
  MECHORI_ALPHA_MAIL_FROM: "MECHORI <alpha@mechori.com>",
  MECHORI_ALPHA_MAIL_TO: "one@example.com,two@example.com",
  MECHORI_ALPHA_MAIL_REPLY_TO: "founder@example.com",
  RESEND_API_KEY: "secret-test-key",
};

const BASE_ARGS = {
  body: "指定本文\nhttps://mechori.com/",
  bodyFile: undefined,
  help: false,
  send: false,
  subject: "指定件名",
  testTo: undefined,
};

const noFileRead = async () => {
  throw new Error("unexpected read");
};

async function makePlan({ args = BASE_ARGS, env = BASE_ENV, readFile = noFileRead } = {}) {
  return createMailPlan({ args, env, readFile });
}

test("dry-run performs zero API calls", async () => {
  const plan = await makePlan();
  let calls = 0;
  const result = await deliverMail(plan, {
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200 };
    },
    logger: () => {},
  });

  assert.equal(calls, 0);
  assert.equal(result.mode, "dry-run");
});

test("--send is required before an API call is made", async () => {
  const args = parseCliArgs(["--subject", "指定件名", "--body", "指定本文", "--send"]);
  const plan = await makePlan({ args });
  let calls = 0;

  await deliverMail(plan, {
    fetchImpl: async () => {
      calls += 1;
      return { ok: true, status: 200 };
    },
    logger: () => {},
  });

  assert.equal(calls, 2);
});

test("recipients are deduplicated case-insensitively", () => {
  assert.deepEqual(
    normalizeRecipients("One@example.com, two@example.com,one@EXAMPLE.com"),
    ["One@example.com", "two@example.com"],
  );
});

test("an invalid recipient stops the plan", async () => {
  await assert.rejects(
    makePlan({ env: { ...BASE_ENV, MECHORI_ALPHA_MAIL_TO: "valid@example.com,not-an-email" } }),
    AlphaMailError,
  );
});

test("an invalid recipient cannot inject a new log line", async () => {
  await assert.rejects(
    makePlan({ env: { ...BASE_ENV, MECHORI_ALPHA_MAIL_TO: "valid@example.com\nforged" } }),
    (error) => {
      assert.equal(error.message, "Invalid recipient: [invalid address]");
      return true;
    },
  );
});

test("an empty recipient list stops the plan", async () => {
  await assert.rejects(
    makePlan({ env: { ...BASE_ENV, MECHORI_ALPHA_MAIL_TO: "" } }),
    /No recipients are configured/,
  );
});

test("a live send requires an API key", async () => {
  await assert.rejects(
    makePlan({
      args: { ...BASE_ARGS, send: true },
      env: { ...BASE_ENV, RESEND_API_KEY: "" },
    }),
    /RESEND_API_KEY is required/,
  );
});

test("a missing sender stops dry-run and live modes", async () => {
  await assert.rejects(
    makePlan({ env: { ...BASE_ENV, MECHORI_ALPHA_MAIL_FROM: "" } }),
    /MECHORI_ALPHA_MAIL_FROM is missing or invalid/,
  );
  await assert.rejects(
    makePlan({
      args: { ...BASE_ARGS, send: true },
      env: { ...BASE_ENV, MECHORI_ALPHA_MAIL_FROM: "" },
    }),
    /MECHORI_ALPHA_MAIL_FROM is missing or invalid/,
  );
});

test("a missing subject stops the plan", async () => {
  await assert.rejects(makePlan({ args: { ...BASE_ARGS, subject: "" } }), /Subject is missing/);
});

test("a missing body stops the plan", async () => {
  await assert.rejects(
    makePlan({ args: { ...BASE_ARGS, body: undefined } }),
    /Body is missing or empty/,
  );
});

test("each recipient is sent in a separate request with verbatim content", async () => {
  const plan = await makePlan({ args: { ...BASE_ARGS, send: true } });
  const requests = [];

  const result = await deliverMail(plan, {
    fetchImpl: async (_url, request) => {
      requests.push(JSON.parse(request.body));
      return { ok: true, status: 200 };
    },
    logger: () => {},
  });

  assert.equal(result.success, 2);
  assert.deepEqual(requests.map((request) => request.to), [["one@example.com"], ["two@example.com"]]);
  assert.equal(requests[0].subject, BASE_ARGS.subject);
  assert.equal(requests[0].text, BASE_ARGS.body);
});

test("partial API failure is reported and remaining recipients continue", async () => {
  const plan = await makePlan({ args: { ...BASE_ARGS, send: true } });
  const responses = [
    { ok: false, status: 429 },
    { ok: true, status: 200 },
  ];

  const result = await deliverMail(plan, {
    fetchImpl: async () => responses.shift(),
    logger: () => {},
  });

  assert.equal(result.failed, 1);
  assert.equal(result.success, 1);
  assert.equal(responses.length, 0);
});

test("--test-to excludes the tester allowlist", async () => {
  const plan = await makePlan({
    args: { ...BASE_ARGS, send: true, testTo: "founder@example.com" },
  });
  const sentTo = [];

  await deliverMail(plan, {
    fetchImpl: async (_url, request) => {
      sentTo.push(JSON.parse(request.body).to);
      return { ok: true, status: 200 };
    },
    logger: () => {},
  });

  assert.deepEqual(sentTo, [["founder@example.com"]]);
});

test("HTML rendering escapes content without changing plain text", async () => {
  const body = "<script>alert(\"x\")</script>\nTom & 'friends'";
  const plan = await makePlan({ args: { ...BASE_ARGS, body } });

  assert.equal(plan.body, body);
  assert.equal(
    bodyToHtml(body),
    "<div style=\"white-space: pre-wrap\">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;\nTom &amp; &#39;friends&#39;</div>",
  );
});

test("API secrets are never written to logs", async () => {
  const plan = await makePlan({ args: { ...BASE_ARGS, send: true } });
  const logs = [];

  await deliverMail(plan, {
    fetchImpl: async () => {
      throw new Error(`request failed with ${BASE_ENV.RESEND_API_KEY}`);
    },
    logger: (message) => logs.push(message),
  });

  assert.equal(logs.join("\n").includes(BASE_ENV.RESEND_API_KEY), false);
  assert.equal(logs.join("\n").includes("one@example.com"), false);
  assert.match(logs.join("\n"), /o\*\*\*@example\.com/);
});

test("body-file content is read and preserved verbatim", async () => {
  const body = "そのままの本文。\n\n末尾も維持。\n";
  const plan = await makePlan({
    args: { ...BASE_ARGS, body: undefined, bodyFile: "tmp/mail.txt" },
    readFile: async (path, encoding) => {
      assert.equal(path, "tmp/mail.txt");
      assert.equal(encoding, "utf8");
      return body;
    },
  });

  assert.equal(plan.body, body);
});
