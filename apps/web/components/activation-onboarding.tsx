"use client";

import {
  activationOnboardingSteps,
  completeActivationOnboarding,
  firstProfileSetupIntent,
  firstProfileSetupIntentFromAuthResult,
  hasCompletedActivationOnboarding,
  needsProfileDisplayNameSetup,
} from "@/lib/activation-state";
import { useApp } from "@/lib/app-context";
import { ArrowRight, CarFront, ChevronLeft, CircleCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function ActivationOnboarding() {
  const { authSession } = useApp();
  const profileId = authSession.status === "signed_in" ? authSession.profileId : "";

  if (!profileId) return null;
  return <ActivationOnboardingForProfile key={profileId} profileId={profileId} />;
}

function ActivationOnboardingForProfile({ profileId }: { profileId: string }) {
  const { data, workspaceLoadState } = useApp();
  const [visible, setVisible] = useState(() => !hasCompletedActivationOnboarding(profileId));
  const [step, setStep] = useState(0);
  const ownVehicles = data.vehicles.filter((vehicle) => vehicle.ownerProfileId === data.currentProfileId);
  const workspaceReady = workspaceLoadState === "ready";
  const hasVehicle = workspaceReady && ownVehicles.length > 0;
  const currentProfile = workspaceReady
    ? data.profiles.find((profile) => profile.id === data.currentProfileId)
    : undefined;
  const pendingIntent = typeof window === "undefined" ? undefined : firstProfileSetupIntentFromAuthResult(
    new URLSearchParams(window.location.search).get("authEvent"),
    new URLSearchParams(window.location.search).get("inviteCompleted") === "1",
  );
  const setupIntent = firstProfileSetupIntent(profileId) ?? pendingIntent;
  const needsName = needsProfileDisplayNameSetup(currentProfile?.displayName);

  if (!visible || setupIntent === "invite" || (needsName && !setupIntent)) return null;

  const current = activationOnboardingSteps[step] ?? activationOnboardingSteps[0];
  const finalStep = step === activationOnboardingSteps.length - 1;
  const nextHref = hasVehicle ? "/garage" : "/garage/new";

  function finish() {
    completeActivationOnboarding(profileId);
    setVisible(false);
  }

  return (
    <section className="activation-onboarding" aria-labelledby="activation-onboarding-title">
      <div className="activation-onboarding-progress" aria-label={`ステップ ${step + 1} / ${activationOnboardingSteps.length}`}>
        {activationOnboardingSteps.map((item, index) => (
          <span key={item.title} className={index === step ? "is-active" : index < step ? "is-complete" : ""}>
            {index < step ? <CircleCheck size={16} aria-hidden="true" /> : index + 1}
          </span>
        ))}
      </div>
      <div className="activation-onboarding-copy">
        <span className="eyebrow">MECHORIをはじめよう</span>
        <h2 id="activation-onboarding-title">{current.title}</h2>
        <p>{current.body}</p>
      </div>
      <div className="activation-onboarding-actions">
        {step > 0 && (
          <button type="button" className="text-link" onClick={() => setStep((currentStep) => currentStep - 1)}>
            <ChevronLeft size={17} aria-hidden="true" />戻る
          </button>
        )}
        <span />
        {!finalStep ? (
          <button type="button" className="primary-action" onClick={() => setStep((currentStep) => currentStep + 1)}>
            次へ<ArrowRight size={17} aria-hidden="true" />
          </button>
        ) : workspaceReady && setupIntent === "signup" && needsName ? (
          <button type="button" className="primary-action" onClick={finish}>
            名前を決める<ArrowRight size={17} aria-hidden="true" />
          </button>
        ) : workspaceReady ? (
          <Link href={nextHref} className="primary-action" onClick={finish}>
            <CarFront size={18} aria-hidden="true" />
            {hasVehicle ? "ガレージを見る" : "まず愛車を登録する"}
          </Link>
        ) : (
          <span className="activation-onboarding-wait" role="status">愛車を確認しています…</span>
        )}
        <button type="button" className="text-link" onClick={finish}>
          あとで
        </button>
      </div>
      {finalStep && hasVehicle && (
        <p className="activation-onboarding-existing"><UsersRound size={16} aria-hidden="true" />すでに登録した愛車があるため、ガレージへ進みます。</p>
      )}
    </section>
  );
}
