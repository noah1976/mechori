"use client";

import { useApp } from "@/lib/app-context";
import { formatOwnershipDuration, summarizeVehicleRelationship } from "@mechori/core";
import { ArrowRight, Camera, CarFront, CheckCircle2, Plus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function VehicleWelcomePage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data, locale } = useApp();
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);
  const ja = locale === "ja";

  if (!vehicle) {
    return <div className="empty-state"><CarFront size={34} /><h1>{ja ? "愛車が見つかりません" : "Vehicle not found"}</h1><Link href="/garage" className="primary-action">{ja ? "Garageへ" : "Open Garage"}</Link></div>;
  }

  const relationship = summarizeVehicleRelationship(vehicle);
  const ownership = formatOwnershipDuration(locale, relationship);
  const vehicleSummary = ja
    ? [
        `${vehicle.year ? `${vehicle.year}年式の` : ""}${vehicle.make} ${vehicle.model}。`,
        relationship.vehicleAgeYears !== undefined ? `${relationship.vehicleAgeYears}歳のクルマです。` : "",
        ownership ? `一緒に過ごして${ownership}。` : "",
      ].join("")
    : [
        `${vehicle.year ? `${vehicle.year} ` : ""}${vehicle.make} ${vehicle.model}.`,
        relationship.vehicleAgeYears !== undefined ? ` ${relationship.vehicleAgeYears} years old.` : "",
        ownership ? ` Together for ${ownership}.` : "",
      ].join("");

  return (
    <div className="vehicle-welcome-page">
      <section className="vehicle-welcome-photo">
        {vehicle.imagePath && <Image src={vehicle.imagePath} alt={`${vehicle.make} ${vehicle.model}`} fill sizes="100vw" unoptimized priority />}
        <div className="vehicle-welcome-shade" />
        <div className="vehicle-welcome-copy">
          <span className="welcome-check"><CheckCircle2 size={18} />{ja ? "愛車ページができました" : "Your vehicle page is ready"}</span>
          <h1>{ja ? `あなたのGarageに、${vehicle.model}が加わりました。` : `${vehicle.model} has joined your Garage.`}</h1>
          <p>{vehicleSummary}</p>
          {vehicle.ownerComment && <blockquote>{vehicle.ownerComment}</blockquote>}
        </div>
      </section>

      <section className="welcome-next-actions">
        <div><span className="eyebrow">ONE MORE MOMENT</span><h2>{ja ? "最初の出来事をひとつ残す" : "Add the first moment"}</h2><p>{ja ? "今日の一枚、納車の日、最初のドライブ。写真と一言だけで始められます。" : "A photo from today, delivery day, or the first drive. One photo and a sentence are enough."}</p></div>
        <div className="welcome-action-buttons">
          <Link href={`/garage/${encodeURIComponent(vehicle.id)}/event/new`} className="primary-action"><Camera size={18} />{ja ? "出来事を追加" : "Add a moment"}<ArrowRight size={17} /></Link>
          <Link href="/garage" className="secondary-action"><Plus size={17} />{ja ? "今は愛車ページを見る" : "View vehicle page"}</Link>
        </div>
      </section>
    </div>
  );
}
