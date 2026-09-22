"use client";

import { PassportMaintenanceHistory } from "@/components/passport-maintenance-history";
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
  const specifications = [
    share.modelYear ? `${share.modelYear}年式` : undefined,
    share.grade,
    share.modelCode,
    share.specificationNote,
  ].filter(Boolean);
  const odometer = share.odometerValue === undefined
    ? undefined
    : `${share.odometerValue.toLocaleString("ja-JP")} ${share.odometerUnit === "unknown" ? "" : share.odometerUnit}`.trim();
  return (
    <div className="page-stack narrow-page workshop-passport-page">
      <header className="workshop-passport-header"><span className="eyebrow">愛車パスポート</span><h1>{share.make} {share.model}</h1>{share.nickname && <strong>{share.nickname}</strong>}{specifications.length > 0 && <p>{specifications.join(" · ")}</p>}<small>工場へ伝えるために、オーナーが共有した愛車情報です。</small></header>
      <section className="workshop-passport-context" aria-label="今回の相談と車両情報">
        <dl>
          {odometer && <div><dt>現在の走行距離</dt><dd>{odometer}</dd></div>}
          {share.workshopConcerns && <div className="is-primary"><dt>今回伝えたいこと</dt><dd>{share.workshopConcerns}</dd></div>}
          {share.modifications && <div><dt>重要な仕様・改造</dt><dd>{share.modifications}</dd></div>}
        </dl>
      </section>
      {share.projectionVersion === 2 && <PassportMaintenanceHistory history={share.maintenanceHistory ?? []} />}
      {(share.recentMaintenance || share.otherNotes) && (
        <section className="workshop-passport-supplement" aria-labelledby="workshop-passport-supplement-heading">
          <h2 id="workshop-passport-supplement-heading">オーナーからの補足</h2>
          <dl>
            {share.recentMaintenance && <div><dt>履歴にない整備・交換の補足</dt><dd>{share.recentMaintenance}</dd></div>}
            {share.otherNotes && <div><dt>その他</dt><dd>{share.otherNotes}</dd></div>}
          </dl>
        </section>
      )}
      <PassportServiceReportForm token={token} />
      <aside className="workshop-share-note"><ShieldCheck size={20} aria-hidden="true" /><p>この情報は車両オーナーが工場への共有用に公開しています。整備の正しさや車両状態を保証するものではありません。</p></aside>
    </div>
  );
}
