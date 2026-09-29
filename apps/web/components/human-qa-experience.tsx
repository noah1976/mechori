"use client";

import { PassportMaintenanceHistory } from "@/components/passport-maintenance-history";
import { QA_HISTORY } from "@/lib/human-qa-fixture";
import { QA_NOTE_LIMIT, QA_RESULTS, QA_TASK, qaAnalyticsContext, qaDeviceClass, sanitizeQaSource, validateQaFeedback, type QaFeedbackInput, type QaResult } from "@/lib/human-qa";
import { pushAnalyticsEvent } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const instructions = [
  "この履歴で、いちばん新しい点検の時期を探してください。",
  "「すべて見る」を開いて、いちばん古い記録を探してください。",
  "ワイパーの記録で「次回」に何が書かれているか探してください。",
];
const resultLabels: Record<QaResult, string> = { done: "できた", confusing: "少し迷った", blocked: "できなかった" };

export function HumanQaExperience() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<QaResult | "">("");
  const [note, setNote] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [locked, setLocked] = useState(false);
  const submissionId = useRef("");
  const submitting = useRef(false);
  const submittedInput = useRef<QaFeedbackInput | null>(null);
  const entryTracked = useRef(false);

  function context(currentStep = step) {
    const source = sanitizeQaSource(new URLSearchParams(window.location.search).get("src"));
    return qaAnalyticsContext(source, currentStep, qaDeviceClass(window.innerWidth));
  }
  useEffect(() => {
    if (entryTracked.current) return;
    entryTracked.current = true;
    const source = sanitizeQaSource(new URLSearchParams(window.location.search).get("src"));
    pushAnalyticsEvent("qa_entry_view", qaAnalyticsContext(source, 0, qaDeviceClass(window.innerWidth)));
  }, []);

  function begin() {
    setStarted(true);
    pushAnalyticsEvent("qa_started", context(0));
  }
  function nextStep() {
    const completed = step + 1;
    setStep(completed);
    pushAnalyticsEvent("qa_step_completed", context(completed));
  }
  async function submit() {
    if (submitting.current || state === "saved") return;
    if (!submissionId.current) submissionId.current = crypto.randomUUID();
    const current = context();
    const input = submittedInput.current ?? validateQaFeedback({ submissionId: submissionId.current, task: QA_TASK, step, source: current.source, device: current.device_class, result, note });
    if (!input) {
      setError("結果を選び、300文字以内で入力してください。氏名・連絡先・URL・車台番号・ナンバー等は含めないでください。");
      setState("error");
      return;
    }
    submitting.current = true;
    submittedInput.current = input;
    setLocked(true);
    setState("saving");
    setError("");
    try {
      const response = await fetch("/api/qa-feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), signal: AbortSignal.timeout(10000) });
      const body = await response.json();
      if (response.status === 429) throw new Error("rate");
      if (!response.ok || !["accepted", "duplicate"].includes(body.result)) throw new Error("unavailable");
      setState("saved");
      pushAnalyticsEvent("qa_feedback_submitted", { ...current, outcome: input.result });
      pushAnalyticsEvent("qa_completed", current);
    } catch (failure) {
      setState("error");
      setError(failure instanceof Error && failure.message === "rate"
        ? "受付の送信上限に達しました。しばらく待って再送できます。ここで終了しても大丈夫です。"
        : "現在は受付停止または一時利用不可です。保存完了は確認できていません。入力はこの画面に残っています。再送するか、内容をコピーして終了できます。");
    } finally { submitting.current = false; }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`MECHORI TEST QA / ${QA_TASK} / step ${step}\n${result ? resultLabels[result] : "未選択"}\n${note}`);
      setCopyStatus("コピーしました。送信はされていません。");
    } catch { setCopyStatus("コピーできませんでした。入力欄の文章を選択してコピーできます。"); }
  }

  return (
    <div className="qa-page" data-clarity-mask="true">
      <header className="qa-site-header"><Link href="/" className="brand-block"><strong>MECHORI</strong></Link><span>画面の動作確認</span></header>
      <section className="qa-intro" aria-labelledby="qa-title">
        <span className="eyebrow">TEST DATA · 登録不要</span>
        <h1 id="qa-title">整備履歴の見つけやすさを<br />教えてください。</h1>
        <p>試験用の履歴を読み、3つの短い操作を確かめます。10分程度で、登録は不要です。途中でやめても大丈夫です。</p>
        <p className="privacy-caption">すべてTEST DATAです。実在する利用者・車両の記録ではなく、診断や修理指示でもありません。</p>
        {!started && state !== "saved" && <button type="button" className="primary-action" disabled={locked} onClick={begin}>確認をはじめる</button>}
      </section>

      {started && state !== "saved" && <>
        <section className="qa-task" aria-labelledby="qa-task-title">
          <p className="eyebrow">{step < 3 ? `操作 ${step + 1} / 3` : "操作の確認が終わりました"}</p>
          <h2 id="qa-task-title" tabIndex={-1} aria-live="polite">{step < 3 ? instructions[step] : "下の3択で結果を教えてください。"}</h2>
          {step < 3 && <p>正解の入力は不要です。進めない場合は、下のフィードバックから終了できます。</p>}
        </section>
        <PassportMaintenanceHistory history={QA_HISTORY} />
        {step < 3 && <div className="qa-next"><button type="button" className="secondary-action" disabled={locked} onClick={nextStep}>{step === 2 ? "操作の確認を終える" : "次の操作へ"}</button></div>}
      </>}

      <section className="qa-feedback" aria-labelledby="qa-feedback-title">
        {state === "saved" ? <div role="status"><h2>フィードバックを受け取りました。</h2><p>ご協力ありがとうございました。ここで終了できます。</p><p className="privacy-caption">実際の愛車での利用は、既存のα参加への個別案内が必要です。自動登録・自動招待は行いません。</p><Link href="/" className="secondary-action">MECHORIへ戻る</Link></div> : <>
          <h2 id="qa-feedback-title">ここまで、どうでしたか？</h2>
          <p>途中で止まった結果も役立ちます。文章は書かなくても送れます。</p>
          <fieldset disabled={locked} className="qa-choices"><legend className="sr-only">操作の結果</legend>{QA_RESULTS.map((value) => <label key={value}><input type="radio" name="qa-result" checked={result === value} onChange={() => setResult(value)} /><span>{resultLabels[value]}</span></label>)}</fieldset>
          <label className="field"><span>気になったこと <small>任意・300文字以内</small></span><textarea rows={3} maxLength={QA_NOTE_LIMIT} value={note} disabled={locked} onChange={(event) => setNote(event.target.value)} placeholder="迷った箇所や、何をする画面だと思ったかなど" /></label>
          <p className="privacy-caption">氏名、連絡先、URL、車台番号、ナンバーなどは書かないでください。結果と操作段階・版・募集元・画面幅の区分を保存し、運営だけが確認します。生のフィードバックの保持目標は30日です。通常稼働中は自動削除しますが、サービスの休止・障害中は削除が遅れる場合があり、復旧後に削除します。</p>
          {error && <p className="form-error-summary" role="alert">{error}</p>}
          <div className="form-actions"><button type="button" className="primary-action" disabled={state === "saving" || !result} onClick={() => void submit()}>{state === "saving" ? "送信中…" : "結果を送って終える"}</button>{state === "error" && <button type="button" className="secondary-action" onClick={() => void copy()}>内容をコピー</button>}</div>
          {copyStatus && <p role="status">{copyStatus}</p>}
        </>}
      </section>
      <footer className="qa-footer"><Link href="/privacy">プライバシー</Link><Link href="/">途中で終了する</Link></footer>
    </div>
  );
}
