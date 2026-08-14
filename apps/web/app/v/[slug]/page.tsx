"use client";

import { loadPublicVehicleShare, type PublicVehicleShare } from "@/lib/public-vehicle-share";
import { useApp } from "@/lib/app-context";
import { ArrowRight, CarFront, LoaderCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PublicVehiclePage() {
  const { slug } = useParams<{ slug: string }>();
  const { locale } = useApp();
  const ja = locale === "ja";
  const [share, setShare] = useState<PublicVehicleShare | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void loadPublicVehicleShare(slug).then((result) => { if (active) setShare(result); }).catch(() => { if (active) setShare(null); });
    return () => { active = false; };
  }, [slug]);

  if (share === undefined) return <div className="app-loading"><LoaderCircle className="spin" size={25} /><span>{ja ? "愛車ページを読み込み中" : "Loading Garage"}</span></div>;
  if (!share) return <div className="empty-state public-share-missing"><CarFront size={36} /><h1>{ja ? "この愛車ページは公開されていません" : "This vehicle page is not public"}</h1><p>{ja ? "公開が停止されたか、URLが正しくない可能性があります。" : "It may have been unpublished, or the URL may be incorrect."}</p><Link href="/" className="primary-action">{ja ? "MECHORIを見る" : "Explore MECHORI"}</Link></div>;

  const currentYear = new Date().getFullYear();
  const vehicleAge = share.modelYear ? Math.max(0, currentYear - share.modelYear) : undefined;
  const ownership = formatPublicOwnership(share, locale);

  return (
    <div className="public-vehicle-page">
      <section className="public-vehicle-hero">
        <Image src={share.imageDataUrl} alt={`${share.make} ${share.model}`} fill sizes="100vw" unoptimized priority />
        <div className="public-vehicle-shade" />
        <div className="public-vehicle-identity"><span className="eyebrow">MECHORI GARAGE</span><h1>{share.modelYear ? `${share.modelYear} ` : ""}{share.make} {share.model}</h1><p>{vehicleAge !== undefined ? (ja ? `${vehicleAge}歳のクルマ。` : `${vehicleAge} years old.`) : (ja ? "年式は未登録の一台。" : "Model year not provided.")}{ownership ? (ja ? `オーナーと過ごして${ownership}。` : ` Together with its owner for ${ownership}.`) : ""}</p>{share.ownerComment && <blockquote>{share.ownerComment}</blockquote>}</div>
      </section>
      <section className="public-vehicle-about"><div><ShieldCheck size={22} /><span><strong>{ja ? "オーナーが公開した愛車ページです" : "Published by this vehicle's owner"}</strong><small>{ja ? "非公開の整備記録やアカウント情報は共有していません。" : "Private maintenance records and account details are not shared."}</small></span></div><div><span className="eyebrow">YOUR CAR, YOUR HISTORY</span><h2>{ja ? "あなたのクルマにも、ひとつのページを。" : "One page for your vehicle's story."}</h2><p>{ja ? "愛車の写真、日々の出来事、整備の履歴を、一台の時間軸として残すMECHORIの少人数α版です。" : "MECHORI is a small alpha for keeping photos, everyday moments, and maintenance in one vehicle timeline."}</p><Link href="/" className="primary-action">{ja ? "MECHORIを見る" : "Explore MECHORI"}<ArrowRight size={17} /></Link></div></section>
    </div>
  );
}

function formatPublicOwnership(share: PublicVehicleShare, locale: "ja" | "en"): string | undefined {
  if (!share.ownershipStartedYear) return undefined;
  const now = new Date();
  const startMonth = Math.min(12, Math.max(1, share.ownershipStartedMonth ?? 1));
  const months = Math.max(0, (now.getFullYear() - share.ownershipStartedYear) * 12 + (now.getMonth() + 1 - startMonth));
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (locale === "ja") return `${years ? `${years}年` : ""}${remainingMonths ? `${remainingMonths}か月` : years ? "" : "1か月未満"}`;
  return `${years ? `${years} ${years === 1 ? "year" : "years"}` : ""}${years && remainingMonths ? " " : ""}${remainingMonths ? `${remainingMonths} ${remainingMonths === 1 ? "month" : "months"}` : years ? "" : "less than a month"}`;
}
