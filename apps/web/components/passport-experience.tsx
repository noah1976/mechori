"use client";

import { useApp } from "@/lib/app-context";
import { PassportServiceReportInbox } from "@/components/passport-service-report-inbox";
import {
  publishPassportShare,
  revokePassportShare,
} from "@/lib/passport-share";
import { submitAlphaFeedback } from "@/lib/alpha-operations";
import { pushAnalyticsEvent } from "@/lib/analytics";
import {
  createVehiclePassportDraft,
  displayVehicleModel,
  getPreferredVehicle,
  type Vehicle,
  type VehiclePassport,
  type VehiclePassportDraft,
} from "@mechori/core";
import {
  ArrowLeft,
  CarFront,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  LoaderCircle,
  Pencil,
  Save,
  Send,
  Share2,
  ShieldCheck,
  Unlink,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

type PassportMode = "edit" | "complete" | "view";

export function PassportExperience() {
  const {
    data,
    locale,
    workspaceLoadState,
    retryWorkspace,
    saveVehiclePassport,
    setVehiclePassportShare,
  } = useApp();
  const vehicles = useMemo(
    () => data.vehicles.filter((vehicle) => vehicle.ownerProfileId === data.currentProfileId),
    [data.currentProfileId, data.vehicles],
  );
  const preferred = getPreferredVehicle(vehicles);
  const [vehicleId, setVehicleId] = useState(preferred?.id ?? "");
  const vehicle = vehicles.find((item) => item.id === vehicleId) ?? preferred;
  const passports = useMemo(() => data.vehiclePassports ?? [], [data.vehiclePassports]);
  const passport = vehicle
    ? passports.find((item) => item.vehicleId === vehicle.id)
    : undefined;
  const [draft, setDraft] = useState<VehiclePassportDraft>(() => initialDraft(preferred));
  const [mode, setMode] = useState<PassportMode>(passport ? "view" : "edit");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [focusShareControls, setFocusShareControls] = useState(false);
  const hydratedPassportKey = useRef("");

  useEffect(() => {
    if (!vehicle) return;
    const current = passports.find((item) => item.vehicleId === vehicle.id);
    const nextKey = `${vehicle.id}:${current?.updatedAt ?? "new"}`;
    if (hydratedPassportKey.current === nextKey) return;
    hydratedPassportKey.current = nextKey;
    setDraft(initialDraft(vehicle, current));
    setMode((currentMode) => currentMode === "complete" && current ? "complete" : current ? "view" : "edit");
    setFocusShareControls(false);
    setSaveError(false);
  }, [passports, vehicle]);

  if (workspaceLoadState === "loading") {
    return <div className="empty-state" role="status"><LoaderCircle className="spin" size={26} /><p>愛車情報を読み込んでいます</p></div>;
  }
  if (workspaceLoadState === "error") {
    return <div className="empty-state"><h1>愛車情報を読み込めませんでした</h1><button className="primary-action" type="button" onClick={() => void retryWorkspace()}>もう一度試す</button></div>;
  }
  if (!vehicle) {
    return (
      <div className="page-stack narrow-page passport-page">
        <PassportHeader />
        <section className="empty-state passport-empty">
          <CarFront size={34} aria-hidden="true" />
          <h2>まず愛車を登録します</h2>
          <p>登録済みの車名や年式を使って、愛車パスポートを作ります。</p>
          <Link className="primary-action" href="/garage/new?returnTo=%2F">まず愛車を登録する</Link>
        </section>
      </div>
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      const saved = await saveVehiclePassport(draft);
      if (passport?.shareToken) {
        await publishPassportShare(vehicle!, saved, passport.shareToken);
      }
      setMode("complete");
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  function changeVehicle(nextVehicleId: string) {
    setVehicleId(nextVehicleId);
  }

  return (
    <div className="page-stack narrow-page passport-page">
      <PassportHeader />
      {vehicles.length > 1 && (
        <label className="passport-vehicle-picker">
          <span>パスポートを作る愛車</span>
          <select value={vehicle.id} onChange={(event) => changeVehicle(event.target.value)}>
            {vehicles.map((item) => <option key={item.id} value={item.id}>{item.make} {displayVehicleModel(item, locale)}</option>)}
          </select>
        </label>
      )}
      <VehicleIdentity vehicle={vehicle} />
      {mode === "edit" && (
        <PassportForm
          draft={draft}
          saving={saving}
          saveError={saveError}
          hasPassport={Boolean(passport)}
          onChange={setDraft}
          onCancel={passport ? () => setMode("view") : undefined}
          onSubmit={save}
        />
      )}
      {mode === "complete" && passport && (
        <PassportCompletion
          vehicle={vehicle}
          passport={passport}
          onView={() => { setFocusShareControls(false); setMode("view"); }}
          onShare={() => { setFocusShareControls(true); setMode("view"); }}
        />
      )}
      {mode === "view" && passport && (
        <PassportOwnerView
          vehicle={vehicle}
          passport={passport}
          onEdit={() => setMode("edit")}
          onShareTokenChange={setVehiclePassportShare}
          focusShareControls={focusShareControls}
          onShareControlsFocused={() => setFocusShareControls(false)}
        />
      )}
    </div>
  );
}

function PassportHeader() {
  return (
    <header className="passport-header">
      <span className="eyebrow">愛車パスポート</span>
      <h1>愛車パスポート</h1>
      <p>工場に見せるための、愛車の情報をまとめます。</p>
      <small>一度に全部埋めなくても大丈夫です。分かる範囲だけで作れます。</small>
    </header>
  );
}

function VehicleIdentity({ vehicle }: { vehicle: Vehicle }) {
  const specs = [vehicle.year ? `${vehicle.year}年式` : "", vehicle.grade, vehicle.modelCode, vehicle.specificationNote].filter(Boolean);
  return (
    <section className="passport-vehicle-identity" aria-label="対象の愛車">
      <CarFront size={22} aria-hidden="true" />
      <div>
        <span>{vehicle.nickname || "愛車"}</span>
        <h2>{vehicle.make} {vehicle.model}</h2>
        {specs.length > 0 && <p>{specs.join(" · ")}</p>}
      </div>
    </section>
  );
}

function PassportForm({
  draft,
  saving,
  saveError,
  hasPassport,
  onChange,
  onCancel,
  onSubmit,
}: {
  draft: VehiclePassportDraft;
  saving: boolean;
  saveError: boolean;
  hasPassport: boolean;
  onChange(draft: VehiclePassportDraft): void;
  onCancel?: () => void;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
}) {
  function setField<K extends keyof VehiclePassportDraft>(key: K, value: VehiclePassportDraft[K]) {
    onChange({ ...draft, [key]: value });
  }
  return (
    <form className="passport-form" onSubmit={onSubmit} noValidate>
      <p className="passport-form-intro">空欄のままでも作れます。今わかることだけで十分です。</p>
      <div className="passport-odometer-row">
        <label className="field">
          <span>現在の走行距離 <small>任意</small></span>
          <input type="number" min="0" inputMode="numeric" value={draft.odometerValue} onChange={(event) => setField("odometerValue", event.target.value)} placeholder="例: 86420" />
        </label>
        <label className="field passport-unit-field">
          <span>単位</span>
          <select value={draft.odometerUnit} onChange={(event) => setField("odometerUnit", event.target.value as VehiclePassportDraft["odometerUnit"])}>
            <option value="km">km</option><option value="mi">mi</option><option value="unknown">不明</option>
          </select>
        </label>
      </div>
      <PassportTextarea label="重要な仕様・改造" value={draft.modifications} placeholder="例: 社外マフラー、エンジン載せ替え、純正状態" onChange={(value) => setField("modifications", value)} />
      <PassportTextarea label="最近わかる整備・交換部品" value={draft.recentMaintenance} placeholder="例: 去年クラッチ交換、バッテリー交換済み" onChange={(value) => setField("recentMaintenance", value)} />
      <PassportTextarea label="今気になっていること・工場に伝えたいこと" value={draft.workshopConcerns} placeholder="例: 最近、低速で少し異音がします" onChange={(value) => setField("workshopConcerns", value)} />
      <PassportTextarea label="その他、伝えておきたいこと" value={draft.otherNotes} placeholder="必要なことがあれば" onChange={(value) => setField("otherNotes", value)} />
      {saveError && <p className="form-error-summary" role="alert">保存できませんでした。通信を確認して、もう一度お試しください。</p>}
      <div className="form-actions">
        {onCancel && <button type="button" className="secondary-action" onClick={onCancel}><ArrowLeft size={17} />戻る</button>}
        <button type="submit" className="primary-action" disabled={saving}>{saving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}{saving ? "保存中" : hasPassport ? "変更を保存" : "愛車パスポートを作る"}</button>
      </div>
    </form>
  );
}

function PassportTextarea({ label, value, placeholder, onChange }: { label: string; value: string; placeholder: string; onChange(value: string): void }) {
  return <label className="field passport-textarea"><span>{label} <small>任意</small></span><textarea rows={3} maxLength={2000} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function PassportCompletion({ vehicle, passport, onView, onShare }: { vehicle: Vehicle; passport: VehiclePassport; onView(): void; onShare(): void }) {
  const [feedback, setFeedback] = useState("");
  const [feedbackState, setFeedbackState] = useState<"idle" | "saving" | "saved" | "error" | "skipped">("idle");
  async function submitFeedback() {
    if (!feedback.trim() || feedbackState === "saving") return;
    setFeedbackState("saving");
    try {
      await submitAlphaFeedback({
        kind: "other",
        content: `[passport_owner]\n${feedback.trim()}`,
        pagePath: "/",
        appBuild: process.env.NEXT_PUBLIC_COMMIT_REF ?? process.env.NEXT_PUBLIC_CONTEXT ?? "",
        userAgent: navigator.userAgent,
      });
      pushAnalyticsEvent("feedback_submitted", { feedback_kind: "other" });
      setFeedbackState("saved");
    } catch {
      setFeedbackState("error");
    }
  }
  return (
    <div className="passport-completion">
      <section className="passport-completion-message" role="status">
        <CheckCircle2 size={28} aria-hidden="true" />
        <div><h2>愛車パスポートができました</h2><p>工場に見せるための愛車情報をまとめました。あとからいつでも変更できます。</p></div>
      </section>
      <PassportPreview vehicle={vehicle} passport={passport} />
      <div className="passport-completion-actions"><button type="button" className="primary-action" onClick={onView}>パスポートを見る</button><button type="button" className="secondary-action" onClick={onShare}><Share2 size={17} />工場に見せる</button></div>
      <section className="passport-feedback">
        <h2>ここまで触ってみて、気になったことがあれば教えてください</h2>
        <p>使いづらかったところ、足りないと思った情報、工場に見せるなら欲しいものなど、なんでもOKです。</p>
        {feedbackState === "saved" ? <p className="passport-feedback-status"><Check size={17} />送信しました。ありがとうございます。</p> : feedbackState === "skipped" ? <p className="passport-feedback-status">あとから通常のフィードバック画面でも送れます。</p> : <>
          <label className="field"><span>フィードバック（任意）</span><textarea rows={4} maxLength={2000} value={feedback} onChange={(event) => setFeedback(event.target.value)} /></label>
          {feedbackState === "error" && <p className="form-error-summary" role="alert">送信できませんでした。時間をおいてもう一度お試しください。</p>}
          <div className="passport-feedback-actions"><button className="primary-action" type="button" disabled={!feedback.trim() || feedbackState === "saving"} onClick={() => void submitFeedback()}>{feedbackState === "saving" ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}送る</button><button className="secondary-action" type="button" onClick={() => setFeedbackState("skipped")}>今は送らない</button></div>
        </>}
      </section>
    </div>
  );
}

function PassportOwnerView({ vehicle, passport, onEdit, onShareTokenChange, focusShareControls, onShareControlsFocused }: { vehicle: Vehicle; passport: VehiclePassport; onEdit(): void; onShareTokenChange(vehicleId: string, shareToken?: string): Promise<void>; focusShareControls: boolean; onShareControlsFocused(): void }) {
  const [shareState, setShareState] = useState<"idle" | "saving" | "copied" | "error">("idle");
  const shareControlsRef = useRef<HTMLElement>(null);
  const shareUrl = passport.shareToken && typeof window !== "undefined" ? `${window.location.origin}/p/${passport.shareToken}` : "";
  useEffect(() => {
    if (!focusShareControls || !shareControlsRef.current) return;
    shareControlsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    shareControlsRef.current.focus({ preventScroll: true });
    onShareControlsFocused();
  }, [focusShareControls, onShareControlsFocused]);
  async function createShare() {
    setShareState("saving");
    try {
      const token = await publishPassportShare(vehicle, passport);
      await onShareTokenChange(vehicle.id, token);
      setShareState("idle");
    } catch { setShareState("error"); }
  }
  async function copyShare() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setShareState("copied");
    window.setTimeout(() => setShareState("idle"), 1800);
  }
  async function nativeShare() {
    if (!shareUrl) return;
    if (!navigator.share) return copyShare();
    await navigator.share({ title: `${vehicle.make} ${vehicle.model} 愛車パスポート`, url: shareUrl });
  }
  async function revoke() {
    if (!passport.shareToken) return;
    setShareState("saving");
    try {
      await revokePassportShare(passport.shareToken);
      await onShareTokenChange(vehicle.id);
      setShareState("idle");
    } catch { setShareState("error"); }
  }
  return (
    <div className="passport-owner-view">
      <div className="passport-view-heading"><div><span className="eyebrow">YOUR PASSPORT</span><h2>工場へ見せる内容</h2></div><button type="button" className="secondary-action" onClick={onEdit}><Pencil size={16} />編集する</button></div>
      <PassportPreview vehicle={vehicle} passport={passport} />
      <PassportServiceReportInbox vehicleId={vehicle.id} />
      <section className="passport-share-controls" ref={shareControlsRef} tabIndex={-1}>
        <div className="section-heading compact"><div><span className="eyebrow">SHARE</span><h2>工場に見せる</h2></div><ShieldCheck size={21} aria-hidden="true" /></div>
        <p>共有を始めるまで、このパスポートは非公開です。共有ページには、上に表示した情報だけが載ります。</p>
        {!passport.shareToken ? <button className="primary-action" type="button" disabled={shareState === "saving"} onClick={() => void createShare()}><Link2 size={17} />{shareState === "saving" ? "作成中" : "共有リンクを作る"}</button> : <div className="passport-share-active">
          <div className="passport-share-url"><Link2 size={16} /><span>{shareUrl}</span></div>
          <div className="passport-share-actions"><button className="primary-action" type="button" onClick={() => void nativeShare()}><Share2 size={17} />共有する</button><button className="secondary-action" type="button" onClick={() => void copyShare()}><Copy size={17} />{shareState === "copied" ? "コピーしました" : "リンクをコピー"}</button><Link className="secondary-action" href={`/p/${passport.shareToken}`} target="_blank"><ExternalLink size={17} />開く</Link><button className="text-danger-action" type="button" disabled={shareState === "saving"} onClick={() => void revoke()}><Unlink size={16} />共有を停止</button></div>
        </div>}
        {shareState === "error" && <p className="form-error-summary" role="alert">共有を変更できませんでした。時間をおいてもう一度お試しください。</p>}
      </section>
    </div>
  );
}

export function PassportPreview({ vehicle, passport }: { vehicle: Pick<Vehicle, "make" | "model" | "nickname" | "year" | "grade" | "modelCode" | "specificationNote">; passport: VehiclePassport }) {
  const rows = [
    { label: "現在の走行距離", value: passport.odometerValue === undefined ? undefined : `${passport.odometerValue.toLocaleString("ja-JP")} ${passport.odometerUnit === "unknown" ? "" : passport.odometerUnit}`.trim() },
    { label: "重要な仕様・改造", value: passport.modifications },
    { label: "最近わかる整備・交換部品", value: passport.recentMaintenance },
    { label: "今気になっていること・工場に伝えたいこと", value: passport.workshopConcerns },
    { label: "その他、伝えておきたいこと", value: passport.otherNotes },
  ].filter((row) => row.value);
  const specs = [vehicle.year ? `${vehicle.year}年式` : undefined, vehicle.grade, vehicle.modelCode, vehicle.specificationNote].filter(Boolean);
  return (
    <article className="passport-preview">
      <header><span>{vehicle.nickname || "愛車"}</span><h1>{vehicle.make} {vehicle.model}</h1>{specs.length > 0 && <p>{specs.join(" · ")}</p>}</header>
      {rows.length > 0 ? <dl>{rows.map((row) => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl> : <p className="passport-preview-empty">追加情報はまだありません。車名と登録済みの仕様だけで使えます。</p>}
    </article>
  );
}

function initialDraft(vehicle?: Vehicle, passport?: VehiclePassport): VehiclePassportDraft {
  if (!vehicle) return createVehiclePassportDraft("");
  const draft = createVehiclePassportDraft(vehicle.id, passport);
  if (!passport && vehicle.currentOdometerReading?.displayedValue !== undefined) {
    draft.odometerValue = String(vehicle.currentOdometerReading.displayedValue);
    draft.odometerUnit = vehicle.currentOdometerReading.unit;
  }
  return draft;
}
