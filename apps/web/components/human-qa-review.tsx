"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

interface QaReviewRow { task: string; step: number; version: string; build: string; source: string; device: string; result: string; note: string; created_at: string }

async function loadReview() {
  const client = createSupabaseBrowserClient();
  const [feedback, status] = await Promise.all([client.rpc("list_human_qa_feedback"), client.rpc("get_human_qa_reception")]);
  if (feedback.error || status.error) throw new Error("unavailable");
  return { rows: (feedback.data ?? []) as QaReviewRow[], reception: status.data === true };
}

export function HumanQaReview({ admin }: { admin: boolean }) {
  const [rows, setRows] = useState<QaReviewRow[]>([]);
  const [reception, setReception] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function refresh() {
    try {
      const data = await loadReview();
      setRows(data.rows);
      setReception(data.reception);
      setState("ready");
    } catch { setState("error"); }
  }
  useEffect(() => {
    let active = true;
    void loadReview().then((data) => {
      if (!active) return;
      setRows(data.rows); setReception(data.reception); setState("ready");
    }).catch(() => { if (active) setState("error"); });
    return () => { active = false; };
  }, []);
  async function operate(action: "toggle" | "purge") {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const client = createSupabaseBrowserClient();
      const result = action === "toggle" ? await client.rpc("set_human_qa_reception", { p_enabled: !reception }) : await client.rpc("purge_human_qa_feedback");
      if (result.error) throw new Error("failed");
      setMessage(action === "purge" ? "保持期限に達する前のフィードバックを削除しました。" : "DBの受付設定を更新しました。公開・募集の承認とは別です。");
      await refresh();
    } catch { setMessage("操作できませんでした。権限・DB適用状態を確認してください。"); }
    finally { setBusy(false); }
  }
  return <section className="admin-section">
    <header><div><span className="eyebrow">HUMAN QA · TEST DATA</span><h2>画面QAの結果</h2></div></header>
    <p>Technical / Usabilityの自己申告です。実利用・市場・売上の証拠ではありません。直近30日の最新100件を表示します。</p>
    {state === "loading" ? <p role="status">読み込み中…</p> : state === "error" ? <><p>QA結果を読み込めませんでした。新しいDB機能が未適用の場合も表示されます。</p><button type="button" className="secondary-action" onClick={() => void refresh()}>再読み込み</button></> : <>
      <p>DB受付：{reception ? "有効" : "停止中"}（API側の有効化も別途必要）</p>
      {admin && <div className="form-actions"><button type="button" className="secondary-action" disabled={busy} onClick={() => void operate("toggle")}>{reception ? "QA受付を停止" : "QA受付を有効化"}</button><button type="button" className="secondary-action" disabled={busy} onClick={() => void operate("purge")}>29日経過したQA結果を削除</button></div>}
      <p className="privacy-caption">受付停止中も、管理者が毎日削除を実行します。運用できない場合は公開を開始しません。</p>
      {rows.length === 0 ? <p>フィードバックはありません。</p> : <div className="admin-feedback-list">{rows.map((row, index) => <article key={`${row.created_at}-${index}`} className="admin-feedback-item"><p>{new Date(row.created_at).toLocaleString("ja-JP")} · {row.result === "done" ? "できた" : row.result === "confusing" ? "少し迷った" : "できなかった"}</p><p>{row.task} · 操作{row.step}/3 · {row.version} · {row.build} · {row.source} · {row.device}</p>{row.note && <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{row.note}</p>}</article>)}</div>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
