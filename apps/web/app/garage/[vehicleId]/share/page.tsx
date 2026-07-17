"use client";

import { useApp } from "@/lib/app-context";
import {
  loadOwnVehicleShare,
  publishVehicleShare,
  unpublishVehicleShare,
  type PublicVehicleShare,
} from "@/lib/public-vehicle-share";
import { getMechoriRuntime } from "@/lib/runtime-config";
import { formatOwnershipDuration, summarizeVehicleRelationship } from "@mechori/core";
import { Check, Copy, ExternalLink, Eye, Link2, Share2, ShieldCheck, Unlink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function VehicleSharePage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data, locale } = useApp();
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  const remoteAlpha = getMechoriRuntime() === "alpha";
  const [confirmedPhoto, setConfirmedPhoto] = useState(false);
  const [share, setShare] = useState<PublicVehicleShare | null>(null);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "copied" | "error">(
    remoteAlpha && vehicle ? "loading" : "idle",
  );
  const ja = locale === "ja";

  useEffect(() => {
    if (!vehicle || !remoteAlpha) {
      return;
    }
    let active = true;
    void loadOwnVehicleShare(vehicle.id)
      .then((result) => { if (active) { setShare(result); setStatus("idle"); } })
      .catch(() => { if (active) setStatus("idle"); });
    return () => { active = false; };
  }, [remoteAlpha, vehicle]);

  if (!vehicle) return <div className="empty-state"><h1>{ja ? "愛車が見つかりません" : "Vehicle not found"}</h1><Link href="/garage" className="primary-action">{ja ? "Garageへ" : "Open Garage"}</Link></div>;
  const relationship = summarizeVehicleRelationship(vehicle);
  const ownership = formatOwnershipDuration(locale, relationship);
  const shareUrl = share && typeof window !== "undefined" ? `${window.location.origin}/v/${share.slug}` : "";

  async function publish() {
    if (!confirmedPhoto || status === "saving") return;
    setStatus("saving");
    try {
      setShare(await publishVehicleShare(vehicle!));
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  async function copyOrShare() {
    if (!shareUrl || !share) return;
    const title = `${vehicle!.make} ${vehicle!.model} | MECHORI`;
    if (navigator.share) {
      await navigator.share({ title, text: ja ? "MECHORIでつくった愛車ページ" : "My vehicle page on MECHORI", url: shareUrl });
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setStatus("copied");
  }

  async function unpublish() {
    if (!share || status === "saving") return;
    setStatus("saving");
    try {
      await unpublishVehicleShare(share.slug);
      setShare(null);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="page-stack share-builder-page">
      <header className="page-header"><div><span className="eyebrow">SHOW YOUR VEHICLE</span><h1>{ja ? `${vehicle.model}を見せる` : `Show your ${vehicle.model}`}</h1><p>{ja ? "非公開のGarageから、見せてもよい情報だけを別の共有ページへ写します。" : "A separate public page receives only the details you choose to show."}</p></div></header>
      <div className="share-builder-grid">
        <section className="public-vehicle-card preview">
          <div className="public-vehicle-photo">{vehicle.imagePath && <Image src={vehicle.imagePath} alt={`${vehicle.make} ${vehicle.model}`} fill sizes="(max-width: 900px) 100vw, 58vw" unoptimized={vehicle.imagePath.startsWith("data:")} priority />}</div>
          <div className="public-vehicle-copy"><span className="eyebrow">MECHORI GARAGE</span><h2>{vehicle.year ? `${vehicle.year} ` : ""}{vehicle.make} {vehicle.model}</h2><p className="public-vehicle-years">{relationship.vehicleAgeYears !== undefined ? (ja ? `${relationship.vehicleAgeYears}歳のクルマ` : `${relationship.vehicleAgeYears} years old`) : (ja ? "年式未登録" : "Year not set")}{ownership ? ` · ${ownership}` : ""}</p>{vehicle.ownerComment && <blockquote>{vehicle.ownerComment}</blockquote>}</div>
        </section>
        <aside className="share-controls">
          <div className="section-heading compact"><div><span className="eyebrow">PRIVACY CHECK</span><h2>{ja ? "共有される内容" : "What will be shared"}</h2></div><ShieldCheck size={21} /></div>
          <ul className="share-field-list"><li><Check size={16} />{ja ? "メイン写真" : "Main photo"}</li><li><Check size={16} />{ja ? "メーカー・車名・おおよその年式" : "Make, model, and approximate year"}</li><li><Check size={16} />{ja ? "車齢と所有年月" : "Vehicle age and ownership duration"}</li>{vehicle.ownerComment && <li><Check size={16} />{ja ? "オーナーのひとこと" : "Owner note"}</li>}</ul>
          <div className="not-shared-note"><Eye size={18} /><div><strong>{ja ? "共有しないもの" : "Never shared here"}</strong><p>{ja ? "氏名、メール、整備の非公開内容、正確な場所、ログイン情報は含めません。" : "No name, email, private maintenance details, exact location, or account information."}</p></div></div>
          <label className="consent-option"><input type="checkbox" checked={confirmedPhoto} onChange={(event) => setConfirmedPhoto(event.target.checked)} /><span><strong>{ja ? "写真のナンバー・人物・背景を確認しました" : "I checked the plate, people, and background"}</strong><small>{ja ? "写真に写っている情報は自動で消えません。公開前に必ず確認してください。" : "Visible details are not automatically removed. Check the photo before publishing."}</small></span></label>
          {!remoteAlpha && <p className="form-error-summary">{ja ? "共有URLは公開α環境で利用できます。" : "Share URLs are available in the hosted alpha."}</p>}
          {status === "error" && <p className="form-error-summary" role="alert">{ja ? "共有ページを更新できませんでした。外部設定が完了しているか確認してください。" : "The share page could not be updated. Check the external setup."}</p>}
          {share ? <div className="published-share"><span><Link2 size={17} />{shareUrl}</span><div><button className="primary-action" type="button" onClick={() => void copyOrShare()}><Share2 size={17} />{status === "copied" ? (ja ? "コピーしました" : "Copied") : (ja ? "共有する" : "Share")}</button><Link className="secondary-action" href={`/v/${share.slug}`} target="_blank"><ExternalLink size={17} />{ja ? "公開ページを見る" : "Open public page"}</Link><button className="text-danger-action" type="button" onClick={() => void unpublish()}><Unlink size={16} />{ja ? "公開を停止" : "Unpublish"}</button></div></div> : <button className="primary-action share-publish-action" type="button" onClick={() => void publish()} disabled={!confirmedPhoto || !remoteAlpha || status === "saving"}><Copy size={17} />{status === "saving" ? (ja ? "共有ページを作成中…" : "Publishing…") : (ja ? "この内容で共有ページを作る" : "Publish this vehicle page")}</button>}
        </aside>
      </div>
    </div>
  );
}
