export const MECHORI_URL = "https://mechori.com/";
export const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const SENDER_PATTERN = /^(?:[^\r\n<>]+\s*)?<([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)>$|^([^\s@<>]+@[^\s@<>]+\.[^\s@<>]+)$/;
const AUTH_USERS_PAGE_SIZE = 1000;
const MAX_AUTH_USER_PAGES = 20;

export class AlphaMailError extends Error {
  constructor(message) {
    super(message);
    this.name = "AlphaMailError";
  }
}

function requireArgumentValue(argv, index, flag) {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--")) {
    throw new AlphaMailError(`${flag} requires a value.`);
  }
  return value;
}

export function parseCliArgs(argv) {
  const result = {
    subject: undefined,
    body: undefined,
    bodyFile: undefined,
    testTo: undefined,
    send: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];

    if (flag === "--send") {
      result.send = true;
      continue;
    }
    if (flag === "--help" || flag === "-h") {
      result.help = true;
      continue;
    }
    if (flag === "--subject") {
      result.subject = requireArgumentValue(argv, index, flag);
      index += 1;
      continue;
    }
    if (flag === "--body") {
      result.body = requireArgumentValue(argv, index, flag);
      index += 1;
      continue;
    }
    if (flag === "--body-file") {
      result.bodyFile = requireArgumentValue(argv, index, flag);
      index += 1;
      continue;
    }
    if (flag === "--test-to") {
      result.testTo = requireArgumentValue(argv, index, flag);
      index += 1;
      continue;
    }

    throw new AlphaMailError(`Unknown option: ${flag}`);
  }

  if (result.body !== undefined && result.bodyFile !== undefined) {
    throw new AlphaMailError("Use either --body or --body-file, not both.");
  }

  return result;
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value) && !/[\r\n,]/.test(value);
}

export function normalizeRecipients(value) {
  const rawRecipients = String(value ?? "")
    .split(",")
    .map((recipient) => recipient.trim())
    .filter(Boolean);

  if (rawRecipients.length === 0) {
    throw new AlphaMailError("No recipients are configured.");
  }

  const invalid = rawRecipients.find((recipient) => !isValidEmail(recipient));
  if (invalid) {
    throw new AlphaMailError(`Invalid recipient: ${redactEmail(invalid)}`);
  }

  const seen = new Set();
  return rawRecipients.filter((recipient) => {
    const key = recipient.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function validateSender(value) {
  const sender = String(value ?? "").trim();
  const match = sender.match(SENDER_PATTERN);
  if (!match || /[\r\n]/.test(sender)) {
    throw new AlphaMailError("MECHORI_ALPHA_MAIL_FROM is missing or invalid.");
  }
  return sender;
}

export function redactEmail(value) {
  const address = String(value);
  if (!EMAIL_PATTERN.test(address) || /[\r\n,]/.test(address)) {
    return "[invalid address]";
  }
  const [localPart, domain] = address.split("@");
  return `${localPart.slice(0, 1)}***@${domain}`;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function bodyToHtml(body) {
  return `<div style="white-space: pre-wrap">${escapeHtml(body)}</div>`;
}

function supabaseHeaders(secretKey) {
  const headers = {
    Accept: "application/json",
    apikey: secretKey,
  };

  if (!secretKey.startsWith("sb_secret_")) {
    headers.Authorization = `Bearer ${secretKey}`;
  }

  return headers;
}

function googleIdentityEmail(user) {
  const providers = new Set([
    user?.app_metadata?.provider,
    ...(Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : []),
    ...(Array.isArray(user?.identities)
      ? user.identities.map((identity) => identity?.provider)
      : []),
  ]);

  if (!providers.has("google") || !isValidEmail(user?.email ?? "")) {
    return undefined;
  }

  return user.email;
}

async function fetchSupabaseJson(fetchImpl, url, headers, label) {
  let response;
  try {
    response = await fetchImpl(url, { headers });
  } catch {
    throw new AlphaMailError(`${label} could not be reached.`);
  }

  if (!response.ok) {
    throw new AlphaMailError(`${label} failed (HTTP ${response.status}).`);
  }

  try {
    return await response.json();
  } catch {
    throw new AlphaMailError(`${label} returned an invalid response.`);
  }
}

export async function resolveAlphaTesterRecipients({ env, fetchImpl = globalThis.fetch }) {
  const supabaseUrl = env.SUPABASE_URL?.trim().replace(/\/$/, "");
  if (!supabaseUrl || !/^https?:\/\/[^\s]+$/.test(supabaseUrl)) {
    throw new AlphaMailError("SUPABASE_URL is missing or invalid.");
  }

  const secretKey = env.SUPABASE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new AlphaMailError("SUPABASE_SECRET_KEY is required to resolve alpha tester emails.");
  }

  const headers = supabaseHeaders(secretKey);
  const membershipUrl = new URL("/rest/v1/test_memberships", supabaseUrl);
  membershipUrl.searchParams.set("select", "user_id");
  membershipUrl.searchParams.set("phase", "eq.alpha");
  membershipUrl.searchParams.set("status", "eq.active");
  membershipUrl.searchParams.set("order", "joined_at.asc");

  const ownerUrl = new URL("/rest/v1/app_user_roles", supabaseUrl);
  ownerUrl.searchParams.set("select", "user_id");
  ownerUrl.searchParams.set("role_code", "eq.owner");

  const [memberships, ownerRoles] = await Promise.all([
    fetchSupabaseJson(fetchImpl, membershipUrl, headers, "Alpha membership lookup"),
    fetchSupabaseJson(fetchImpl, ownerUrl, headers, "Owner role lookup"),
  ]);

  if (!Array.isArray(memberships) || !Array.isArray(ownerRoles)) {
    throw new AlphaMailError("Supabase membership data has an unexpected shape.");
  }

  const users = [];
  for (let page = 1; page <= MAX_AUTH_USER_PAGES; page += 1) {
    const usersUrl = new URL("/auth/v1/admin/users", supabaseUrl);
    usersUrl.searchParams.set("page", String(page));
    usersUrl.searchParams.set("per_page", String(AUTH_USERS_PAGE_SIZE));
    const result = await fetchSupabaseJson(fetchImpl, usersUrl, headers, "Auth user lookup");

    if (!Array.isArray(result?.users)) {
      throw new AlphaMailError("Supabase Auth user data has an unexpected shape.");
    }
    users.push(...result.users);

    if (result.users.length < AUTH_USERS_PAGE_SIZE) {
      break;
    }
    if (page === MAX_AUTH_USER_PAGES) {
      throw new AlphaMailError("Auth user lookup exceeded its safety page limit.");
    }
  }

  const ownerIds = new Set(ownerRoles.map((role) => role.user_id));
  const usersById = new Map(users.map((user) => [user.id, user]));
  const recipients = [];
  let unresolved = 0;

  for (const membership of memberships) {
    if (ownerIds.has(membership.user_id)) {
      continue;
    }

    const email = googleIdentityEmail(usersById.get(membership.user_id));
    if (!email) {
      unresolved += 1;
      continue;
    }
    recipients.push(email);
  }

  if (unresolved > 0) {
    throw new AlphaMailError(
      `${unresolved} active alpha member(s) have no resolvable Google login email.`,
    );
  }

  return normalizeRecipients(recipients.join(","));
}

export async function createMailPlan({
  args,
  env,
  readFile,
  recipientResolver = resolveAlphaTesterRecipients,
}) {
  const subject = args.subject ?? "";
  if (subject.trim().length === 0 || /[\r\n]/.test(subject)) {
    throw new AlphaMailError("Subject is missing or contains a line break.");
  }

  let body = args.body;
  if (args.bodyFile !== undefined) {
    try {
      body = await readFile(args.bodyFile, "utf8");
    } catch {
      throw new AlphaMailError("Body file could not be read.");
    }
  }
  if (body === undefined || body.trim().length === 0) {
    throw new AlphaMailError("Body is missing or empty.");
  }

  const from = validateSender(env.MECHORI_ALPHA_MAIL_FROM);
  const apiKey = env.RESEND_API_KEY?.trim();
  if (args.send && !apiKey) {
    throw new AlphaMailError("RESEND_API_KEY is required when --send is used.");
  }

  const testTo = args.testTo?.trim();
  const recipients = testTo
    ? normalizeRecipients(testTo)
    : normalizeRecipients((await recipientResolver({ env })).join(","));

  if (testTo && recipients.length !== 1) {
    throw new AlphaMailError("--test-to accepts exactly one address.");
  }

  const replyTo = env.MECHORI_ALPHA_MAIL_REPLY_TO?.trim();
  if (replyTo && !isValidEmail(replyTo)) {
    throw new AlphaMailError("MECHORI_ALPHA_MAIL_REPLY_TO is invalid.");
  }

  return {
    apiKey,
    body,
    from,
    html: bodyToHtml(body),
    mode: args.send ? (testTo ? "TEST SEND" : "LIVE SEND") : "DRY RUN",
    recipients,
    replyTo: replyTo || undefined,
    send: args.send,
    subject,
    testOnly: Boolean(testTo),
  };
}

export function formatPreview(plan) {
  const lines = [
    "--------------------------------------------------",
    "ALPHA MAIL PREVIEW",
    "",
    "From:",
    plan.from,
  ];

  if (plan.replyTo) {
    lines.push("", "Reply-To:", plan.replyTo);
  }

  lines.push(
    "",
    "Recipients:",
    `${plan.recipients.length} tester${plan.recipients.length === 1 ? "" : "s"}`,
    ...plan.recipients.map(redactEmail),
    "",
    "Subject:",
    plan.subject,
    "",
    "Body:",
    plan.body,
    "",
    "MECHORI URL:",
    MECHORI_URL,
    "",
    "MODE:",
    plan.mode,
    "--------------------------------------------------",
  );

  return lines.join("\n");
}

export async function deliverMail(plan, { fetchImpl = globalThis.fetch, logger = console.log } = {}) {
  logger(formatPreview(plan));

  if (!plan.send) {
    return {
      failed: 0,
      mode: "dry-run",
      recipientCount: plan.recipients.length,
      success: 0,
    };
  }

  let success = 0;
  let failed = 0;

  for (const recipient of plan.recipients) {
    const payload = {
      from: plan.from,
      to: [recipient],
      subject: plan.subject,
      text: plan.body,
      html: plan.html,
    };
    if (plan.replyTo) {
      payload.reply_to = plan.replyTo;
    }

    try {
      const response = await fetchImpl(RESEND_EMAILS_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${plan.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        success += 1;
        logger(`SUCCESS ${redactEmail(recipient)}`);
      } else {
        failed += 1;
        logger(`FAILED ${redactEmail(recipient)} (HTTP ${response.status})`);
      }
    } catch {
      failed += 1;
      logger(`FAILED ${redactEmail(recipient)} (network request failed)`);
    }
  }

  logger(`送信成功: ${success}件`);
  logger(`送信失敗: ${failed}件`);
  logger(`件名: 「${plan.subject}」`);

  return {
    failed,
    mode: plan.testOnly ? "test-send" : "live-send",
    recipientCount: plan.recipients.length,
    success,
  };
}
