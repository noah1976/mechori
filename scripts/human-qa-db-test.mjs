// Disposable LOCAL Postgres only. Never pulls an image or accepts a remote DB URL.
// Run: node scripts/human-qa-db-test.mjs [an already cached official postgres tag]
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const image = process.argv[2] ?? "postgres:16";
if (!/^postgres:(?:15|16|17)(?:\.[0-9]+)?$/.test(image)) throw new Error("Use an existing official postgres:15/16/17 image only");
const socket = `${homedir()}/.docker/run/docker.sock`;
const prefix = existsSync(socket) ? ["-H", `unix://${socket}`] : [];
function docker(args, input = "") {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", [...prefix, ...args], { stdio: ["pipe", "pipe", "pipe"] });
    let output = "", error = "";
    child.stdout.on("data", (data) => { output += data; });
    child.stderr.on("data", (data) => { error += data; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(error.trim())));
    child.stdin.end(input);
  });
}
const fixture = `
create role anon; create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create table public.test_memberships (user_id uuid primary key, status text);
create table public.app_user_roles (user_id uuid, role_code text);
create function public.is_active_test_member(id uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.test_memberships where user_id=id and status='active') $$;
create function public.is_alpha_staff(id uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.app_user_roles where user_id=id and role_code in ('owner','alpha_admin','admin','moderator','support')) $$;
create function public.is_alpha_admin(id uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.app_user_roles where user_id=id and role_code in ('owner','alpha_admin','admin')) $$;
insert into public.test_memberships values ('00000000-0000-4000-8000-000000000001','active'), ('00000000-0000-4000-8000-000000000002','active');
insert into public.app_user_roles values ('00000000-0000-4000-8000-000000000001','admin');
`;
const context = JSON.stringify({ task: "history-reading-v1", step: 2, version: "qa-v0.1", build: "unknown", source: "x", device: "mobile" });
const submit = (id = randomUUID(), note = "", ctx = context) => `select public.submit_human_qa_feedback('${id}','${ctx}'::jsonb,'done','${note}');`;
let container;
try {
  await docker(["image", "inspect", image]);
  container = await docker(["run", "--pull=never", "--rm", "-d", "--network", "none", "--tmpfs", "/var/lib/postgresql/data", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", image]);
  let ready = false;
  for (let i = 0; i < 20; i++) {
    try { await docker(["exec", container, "pg_isready", "-U", "postgres"]); ready = true; break; } catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  if (!ready) throw new Error("Local postgres did not start");
  const sql = (query) => docker(["exec", "-i", container, "psql", "-X", "-qAt", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], query);
  const anon = (query) => sql(`set role anon; ${query}`);
  const admin = (query) => sql(`set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'; ${query}`);
  await sql(fixture + readFileSync(new URL("../supabase/migrations/20260928112618_human_qa_feedback.sql", import.meta.url), "utf8"));
  assert.equal(await anon(submit()), "closed");
  for (const role of ["anon", "authenticated"]) {
    for (const operation of ["SELECT", "INSERT", "UPDATE", "DELETE"]) assert.equal(await sql(`select has_table_privilege('${role}','public.human_qa_feedback','${operation}');`), "f");
  }
  assert.equal(await sql("select bool_and(relrowsecurity) from pg_class where oid in ('public.human_qa_feedback'::regclass,'public.human_qa_reception'::regclass);"), "t");
  await assert.rejects(anon("select * from public.human_qa_feedback;"), /permission denied/);
  await assert.rejects(anon("select public.list_human_qa_feedback();"), /permission denied/);
  await assert.rejects(sql("set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002'; select public.list_human_qa_feedback();"), /staff_required/);
  assert.equal(await admin("select public.set_human_qa_reception(true);"), "t");
  for (const [note, ctx] of [["person@example.com", context], ["ＡＢＣ＠ｅｘａｍｐｌｅ．ｃｏｍ", context], ["", JSON.stringify({ ...JSON.parse(context), userId: "private" })], ["", JSON.stringify({ ...JSON.parse(context), step: 4 })], ["", JSON.stringify({ ...JSON.parse(context), source: "hacked" })]]) await assert.rejects(anon(submit(randomUUID(), note, ctx)), /invalid_qa/);
  const repeatedId = randomUUID();
  const duplicates = await Promise.all(Array.from({ length: 20 }, () => anon(submit(repeatedId))));
  assert.equal(duplicates.filter((value) => value === "accepted").length, 1);
  assert.equal(duplicates.filter((value) => value === "duplicate").length, 19);
  assert.equal(await sql("select count(*) from public.human_qa_feedback;"), "1");
  await sql("delete from public.human_qa_feedback;");
  const concurrent = await Promise.all(Array.from({ length: 20 }, () => anon(submit())));
  assert.equal(concurrent.filter((value) => value === "accepted").length, 10);
  assert.equal(concurrent.filter((value) => value === "rate_limited").length, 10);
  await sql("update public.human_qa_feedback set created_at=now()-interval '1 hour'; insert into public.human_qa_feedback select gen_random_uuid(),task,step,version,build,source,device,result,note,created_at from public.human_qa_feedback cross join generate_series(1,9);");
  assert.equal(await anon(submit()), "rate_limited"); // 100 / rolling 24h.
  assert.equal(await admin("select count(*) from public.list_human_qa_feedback();"), "100");
  await sql("update public.human_qa_feedback set created_at=now()-interval '29 days 12 hours';");
  assert.equal(await admin("select public.purge_human_qa_feedback();"), "100");
  assert.equal(await sql("select count(*) from public.human_qa_feedback;"), "0");
  await admin("select public.set_human_qa_reception(false);");
  assert.equal(await anon(submit()), "closed");
  console.log("PASS: actual PostgreSQL migration, RLS/grants, staff boundary, malformed data, concurrent dedup/quota, 24h quota, purge and kill switch");
} finally { if (container) await docker(["stop", container]); }
