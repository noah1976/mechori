#!/usr/bin/env node

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { AlphaMailError, createMailPlan, deliverMail, parseCliArgs } from "./lib.mjs";

const HELP = `MECHORI temporary alpha mail tool

Usage:
  npm run alpha:mail -- --subject <text> --body-file <path> [--test-to <email>] [--send]

Options:
  --subject <text>    Subject sent verbatim
  --body-file <path> UTF-8 plain-text body sent verbatim (recommended)
  --body <text>      Inline plain-text body
  --test-to <email>  Send only to one test address, never to the allowlist
  --send             Perform delivery; omitted means DRY RUN
  --help, -h         Show this help
`;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const localEnvPath = path.join(repositoryRoot, ".env.alpha-mail");

function loadLocalEnvironment() {
  if (!existsSync(localEnvPath)) {
    return;
  }

  try {
    process.loadEnvFile(localEnvPath);
  } catch {
    throw new AlphaMailError(".env.alpha-mail could not be loaded.");
  }
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  loadLocalEnvironment();
  const plan = await createMailPlan({ args, env: process.env, readFile });
  const result = await deliverMail(plan);

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  if (error instanceof AlphaMailError) {
    console.error(`Alpha mail stopped: ${error.message}`);
  } else {
    console.error("Alpha mail stopped because of an unexpected local error.");
  }
  process.exitCode = 1;
});
