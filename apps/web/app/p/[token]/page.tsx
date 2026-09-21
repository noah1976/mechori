"use client";

import { PassportPreview } from "@/components/passport-experience";
import { PassportServiceReportForm } from "@/components/passport-service-report-form";
import { loadPassportShare, type PassportShareProjection } from "@/lib/passport-share";
import { CarFront, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PublicPassportPage() {
  const { token } = useParams<{ token: string }>();
  const [share, setShare] = useState<PassportShareProjection | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void loadPassportShare(token).then((value) => { if (active) setShare(value); }).catch(() => { if (active) setShare(null); });
    return () => { active = false; };
  }, [token]);
  if (share === undefined) return <div className="app-loading"><LoaderCircle className="spin" size={24} /><span>愛車パスポートを読み込んでいます</span></div>;
  if (!share) return <div className="empty-state public-share-missing"><CarFront size={34} /><h1>この愛車パスポートは共有されていません</h1><p>共有が停止されたか、URLが正しくない可能性があります。</p><Link href="/" className="primary-action">MECHORIへ</Link></div>;
  const vehicle = { make: share.make, model: share.model, nickname: share.nickname, year: share.modelYear, grade: share.grade, modelCode: share.modelCode, specificationNote: share.specificationNote };
  const passport = { vehicleId: "public", odometerValue: share.odometerValue, odometerUnit: share.odometerUnit, modifications: share.modifications, recentMaintenance: share.recentMaintenance, workshopConcerns: share.workshopConcerns, otherNotes: share.otherNotes, createdAt: share.updatedAt, updatedAt: share.updatedAt, completedAt: share.updatedAt };
  return (
    <div className="page-stack narrow-page workshop-passport-page">
      <header className="workshop-passport-header"><span className="eyebrow">愛車パスポート</span><h1>{share.make} {share.model}</h1><p>工場へ伝えるために、オーナーがまとめた愛車情報です。</p></header>
      <PassportPreview vehicle={vehicle} passport={passport} />
      <PassportServiceReportForm token={token} />
      <aside className="workshop-share-note"><ShieldCheck size={20} aria-hidden="true" /><p>この情報は車両オーナーが工場への共有用に公開しています。整備の正しさや車両状態を保証するものではありません。</p></aside>
    </div>
  );
}
