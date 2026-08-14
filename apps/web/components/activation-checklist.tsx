"use client";

import {
  activationChecklistHref,
  dismissActivationChecklist,
  hasDismissedActivationChecklist,
  resolveActivationProgress,
  type ActivationChecklistItemId,
} from "@/lib/activation-state";
import { useApp } from "@/lib/app-context";
import { CheckCircle2, ChevronRight, Circle, Search, UsersRound, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const itemCopy: Array<{
  id: ActivationChecklistItemId;
  title: string;
  description: string;
}> = [
  { id: "vehicle", title: "愛車を登録する", description: "まずはクルマやバイクを1台、ガレージに迎えましょう。" },
  { id: "record", title: "最初の記録を残す", description: "整備でも、今日の出来事でも。愛車の時間を残せます。" },
  { id: "connection", title: "知り合いを探す", description: "気になる人やクルマを見つけて、つながってみましょう。" },
];

export function ActivationChecklist() {
  const { authSession } = useApp();
  const profileId = authSession.status === "signed_in" ? authSession.profileId : "";

  if (!profileId) return null;
  return <ActivationChecklistForProfile key={profileId} profileId={profileId} />;
}

function ActivationChecklistForProfile({ profileId }: { profileId: string }) {
  const {
    data,
    isRemoteAlpha,
    sharedJournalLoadState,
    workspaceLoadState,
  } = useApp();
  const [dismissed, setDismissed] = useState(() => hasDismissedActivationChecklist(profileId));
  const ownVehicles = useMemo(
    () => data.vehicles.filter((vehicle) => vehicle.ownerProfileId === data.currentProfileId),
    [data.currentProfileId, data.vehicles],
  );
  const ownVehicleIds = useMemo(() => new Set(ownVehicles.map((vehicle) => vehicle.id)), [ownVehicles]);
  const ownRecordCount = data.records.filter((record) => ownVehicleIds.has(record.vehicleId)).length
    + data.journals.filter((journal) => journal.authorProfileId === data.currentProfileId).length;
  const progress = resolveActivationProgress({
    workspaceReady: workspaceLoadState === "ready",
    socialLoading: isRemoteAlpha && (sharedJournalLoadState === "idle" || sharedJournalLoadState === "loading"),
    vehicleCount: ownVehicles.length,
    recordCount: ownRecordCount,
    followCount: data.follows.filter((follow) => follow.targetType === "profile" || follow.targetType === "vehicle").length,
  });

  if (dismissed || workspaceLoadState !== "ready") return null;

  function dismiss() {
    dismissActivationChecklist(profileId);
    setDismissed(true);
  }

  if (progress.complete) {
    return (
      <section className="activation-checklist activation-checklist-complete" aria-labelledby="activation-checklist-title">
        <CheckCircle2 size={22} aria-hidden="true" />
        <div>
          <span className="eyebrow">MECHORIをはじめよう</span>
          <h2 id="activation-checklist-title">愛車の履歴が育ちはじめました</h2>
          <p>記録とつながりを、あなたのペースで続けていきましょう。</p>
        </div>
        <button type="button" className="icon-action" onClick={dismiss} aria-label="この案内を閉じる">
          <X size={18} aria-hidden="true" />
        </button>
      </section>
    );
  }

  return (
    <section className="activation-checklist" aria-labelledby="activation-checklist-title">
      <header>
        <div>
          <span className="eyebrow">MECHORIをはじめよう</span>
          <h2 id="activation-checklist-title">愛車の時間を、ここから残していきましょう</h2>
        </div>
        <button type="button" className="icon-action" onClick={dismiss} aria-label="この案内を閉じる">
          <X size={18} aria-hidden="true" />
        </button>
      </header>
      <div className="activation-checklist-items">
        {itemCopy.map((item) => {
          const state = progress[item.id];
          const href = activationChecklistHref(item.id, ownVehicles[0]?.id);
          const complete = state === "complete";
          const loading = state === "loading";
          const Icon = item.id === "connection" ? UsersRound : item.id === "record" ? Search : Circle;
          if (complete) {
            return (
              <div className="activation-checklist-item is-complete" key={item.id}>
                <CheckCircle2 size={20} aria-hidden="true" />
                <span><strong>{item.title}</strong><small>完了</small></span>
              </div>
            );
          }
          if (loading) {
            return (
              <div className="activation-checklist-item is-loading" key={item.id} role="status">
                <Icon size={20} aria-hidden="true" />
                <span><strong>{item.title}</strong><small>確認中…</small></span>
              </div>
            );
          }
          return (
            <Link className="activation-checklist-item" href={href} key={item.id}>
              <Icon size={20} aria-hidden="true" />
              <span><strong>{item.title}</strong><small>{item.description}</small></span>
              <ChevronRight size={19} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
