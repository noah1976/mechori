// Disposable LOCAL Postgres only. Never pulls an image or accepts a remote DB URL.
// Run: node scripts/human-qa-db-test.mjs [an already cached official postgres tag]
// --core-only is diagnostic: it never reports full migration/Cron validation PASS.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";

const coreOnly = process.argv.includes("--core-only");
const image = process.argv.slice(2).find((value) => value !== "--core-only") ?? "postgres:16";
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
insert into public.test_memberships values ('00000000-0000-4000-8000-000000000001','active'), ('00000000-0000-4000-8000-000000000002','active'), ('00000000-0000-4000-8000-000000000003','active');
insert into public.app_user_roles values ('00000000-0000-4000-8000-000000000001','admin'), ('00000000-0000-4000-8000-000000000003','moderator');
`;
const context = JSON.stringify({ task: "history-reading-v1", step: 2, version: "qa-v0.1", build: "unknown", source: "x", device: "mobile" });
const submit = (id = randomUUID(), note = "", ctx = context) => `select public.submit_human_qa_feedback('${id}','${ctx}'::jsonb,'done','${note}');`;
let container;
try {
  await docker(["image", "inspect", image]);
  if (!coreOnly) {
    try {
      await docker(["run", "--pull=never", "--rm", "--network", "none", "--entrypoint", "sh", image, "-c", 'test -f "$(pg_config --sharedir)/extension/pg_cron.control"']);
    } catch { throw new Error("BLOCKED: cached image lacks pg_cron; no pull/install performed. --core-only can validate DB functions, but is not a full migration/Cron PASS."); }
  }
  container = await docker(["run", "--pull=never", "--rm", "-d", "--network", "none", "--tmpfs", "/var/lib/postgresql/data", "-e", "POSTGRES_HOST_AUTH_METHOD=trust", image,
    ...(coreOnly ? [] : ["postgres", "-c", "shared_preload_libraries=pg_cron", "-c", "cron.database_name=postgres"])]);
  let ready = false;
  for (let i = 0; i < 20; i++) {
    try { await docker(["exec", container, "pg_isready", "-U", "postgres"]); ready = true; break; } catch { await new Promise((resolve) => setTimeout(resolve, 500)); }
  }
  if (!ready) throw new Error("Local postgres did not start");
  const sql = (query) => docker(["exec", "-i", container, "psql", "-X", "-qAt", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], query);
  const anon = (query) => sql(`set role anon; ${query}`);
  const admin = (query) => sql(`set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001'; ${query}`);
  const migration = readFileSync(new URL("../supabase/migrations/20260928112618_human_qa_feedback.sql", import.meta.url), "utf8");
  const appliedSql = coreOnly ? migration.replace(/-- BEGIN HUMAN QA CRON SCHEDULING[\s\S]*?-- END HUMAN QA CRON SCHEDULING/, "-- Cron integration deliberately excluded from diagnostic run") : migration;
  await sql(fixture + appliedSql);
  if (!coreOnly) {
    assert.equal(await sql("select count(*) from cron.job where jobname='mechori-human-qa-retention' and schedule='17 * * * *' and active and command='select mechori_qa_internal.purge_expired_feedback();';"), "1");
    // Keep scheduled cleanup from racing the explicit recovery boundary checks.
    await sql("update cron.job set active=false where jobname='mechori-human-qa-retention';");
  }
  assert.equal(await anon(submit()), "closed");
  for (const role of ["anon", "authenticated"]) {
    for (const operation of ["SELECT", "INSERT", "UPDATE", "DELETE"]) assert.equal(await sql(`select has_table_privilege('${role}','public.human_qa_feedback','${operation}');`), "f");
    assert.equal(await sql(`select has_schema_privilege('${role}','mechori_qa_internal','USAGE');`), "f");
    assert.equal(await sql(`select has_function_privilege('${role}','mechori_qa_internal.purge_expired_feedback()','EXECUTE');`), "f");
    await assert.rejects(sql(`set role ${role}; delete from public.human_qa_feedback;`), /permission denied/);
    await assert.rejects(sql(`set role ${role}; select mechori_qa_internal.purge_expired_feedback();`), /permission denied/);
  }
  assert.equal(await sql("select bool_and(relrowsecurity) from pg_class where oid in ('public.human_qa_feedback'::regclass,'public.human_qa_reception'::regclass);"), "t");
  await assert.rejects(anon("select * from public.human_qa_feedback;"), /permission denied/);
  await assert.rejects(anon("select public.list_human_qa_feedback();"), /permission denied/);
  await assert.rejects(sql("set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002'; select public.list_human_qa_feedback();"), /staff_required/);
  await assert.rejects(sql("set role authenticated; select public.purge_human_qa_feedback();"), /admin_required/);
  const staff = (query) => sql(`set role authenticated; set request.jwt.claim.sub='00000000-0000-4000-8000-000000000003'; ${query}`);
  assert.equal(await staff("select count(*) from public.list_human_qa_feedback();"), "0");
  await assert.rejects(staff("select public.set_human_qa_reception(true);"), /admin_required/);
  await assert.rejects(staff("select public.purge_human_qa_feedback();"), /admin_required/);
  await sql(`create table public.retention_sentinel (value text); insert into public.retention_sentinel values ('unrelated');
    insert into public.human_qa_feedback values ('${randomUUID()}','history-reading-v1',2,'qa-v0.1','unknown','x','mobile','done','',now()-interval '35 days'), ('${randomUUID()}','history-reading-v1',2,'qa-v0.1','unknown','x','mobile','done','',now()-interval '30 days'), ('${randomUUID()}','history-reading-v1',2,'qa-v0.1','unknown','x','mobile','done','',now()-interval '28 days');`);
  assert.equal(await staff("select count(*) from public.list_human_qa_feedback();"), "1");
  assert.equal(await admin("select public.set_human_qa_reception(false);"), "f");
  assert.equal(await anon(submit()), "closed");
  assert.equal(await sql("select count(*) from public.human_qa_feedback;"), "3"); // Closed submit adds no cleanup authority.
  await assert.rejects(staff("select public.set_human_qa_reception(true);"), /admin_required/);
  assert.equal(await sql("select count(*) from public.human_qa_feedback;"), "3");
  assert.equal(await admin("select public.set_human_qa_reception(true);"), "t");
  assert.equal(await sql("select count(*) from public.human_qa_feedback;"), "1"); // Expired rows removed before reopening.
  assert.equal(await sql("select count(*) from public.retention_sentinel;"), "1");
  await sql("delete from public.human_qa_feedback;");
  for (const [note, ctx] of [["person@example.com", context], ["ＡＢＣ＠ｅｘａｍｐｌｅ．ｃｏｍ", context], ["", JSON.stringify({ ...JSON.parse(context), userId: "private" })], ["", JSON.stringify({ ...JSON.parse(context), step: 4 })], ["", JSON.stringify({ ...JSON.parse(context), source: "hacked" })]]) await assert.rejects(anon(submit(randomUUID(), note, ctx)), /invalid_qa/);
  await sql(`insert into public.human_qa_feedback values ('${randomUUID()}','history-reading-v1',2,'qa-v0.1','unknown','x','mobile','done','',now()-interval '35 days');`);
  assert.equal(await anon(submit()), "accepted");
  assert.equal(await sql("select count(*) from public.human_qa_feedback;"), "1"); // Existing enabled-submit cleanup at 30 days.
  assert.equal(await sql("select count(*) from public.retention_sentinel;"), "1");
  await sql("delete from public.human_qa_feedback;");
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
  // Internal retention still deletes expired QA rows with reception disabled,
  // leaves fresh QA rows and unrelated data alone, and shares the same lock.
  await sql(`insert into public.human_qa_feedback values ('${randomUUID()}','history-reading-v1',2,'qa-v0.1','unknown','x','mobile','done','',now()-interval '29 days 1 minute'), ('${randomUUID()}','history-reading-v1',2,'qa-v0.1','unknown','x','mobile','done','',now()-interval '28 days 23 hours');`);
  assert.equal(await sql("select mechori_qa_internal.purge_expired_feedback();"), "1");
  assert.equal(await sql("select count(*) from public.human_qa_feedback;"), "1");
  assert.equal(await sql("select count(*) from public.retention_sentinel;"), "1");
  const heldLock = sql("begin; select pg_advisory_xact_lock(313101); select pg_sleep(1); commit;");
  let observedLock = false;
  for (let i = 0; i < 20; i++) {
    if (await sql("select exists(select 1 from pg_locks where locktype='advisory' and objid=313101 and granted);") === "t") { observedLock = true; break; }
  }
  assert.equal(observedLock, true);
  let purgeFinished = false;
  const waitingPurge = sql("select mechori_qa_internal.purge_expired_feedback();").then((value) => { purgeFinished = true; return value; });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(purgeFinished, false);
  await heldLock;
  assert.equal(await waitingPurge, "0");
  if (coreOnly) {
    console.log("CORE DB CHECKS PASS; FULL MIGRATION / CRON EXECUTION BLOCKED (diagnostic --core-only). Not merge-ready.");
    process.exitCode = 2;
  } else {
    await sql("update public.human_qa_feedback set created_at=now()-interval '30 days'; select cron.schedule('mechori-human-qa-retention','1 second','select mechori_qa_internal.purge_expired_feedback();'); update cron.job set active=true where jobname='mechori-human-qa-retention';");
    let ran = false;
    for (let i = 0; i < 20; i++) {
      if (await sql("select exists(select 1 from cron.job_run_details r join cron.job j using(jobid) where j.jobname='mechori-human-qa-retention' and r.status='succeeded');") === "t") { ran = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.equal(ran, true, "actual Cron worker must execute; registration alone is insufficient");
    assert.equal(await sql("select count(*) from public.human_qa_feedback;"), "0");
    assert.equal(await sql("select count(*) from public.retention_sentinel;"), "1");
    console.log("PASS: actual full PostgreSQL migration, RLS/grants, staff/admin boundaries, concurrent dedup/quota, purge/retention lock, reception closed and Cron execution");
  }
} finally { if (container) await docker(["stop", container]); }
