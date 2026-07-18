"use client";

import { useApp } from "@/lib/app-context";
import { formatOwnershipDuration, summarizeVehicleRelationship } from "@mechori/core";
import { translate } from "@mechori/i18n";
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
    return <div className="empty-state"><CarFront size={34} /><h1>{translate(locale, "vehicleNotFound")}</h1><Link href="/garage" className="primary-action">{translate(locale, "openGarage")}</Link></div>;
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
          <span className="welcome-check"><CheckCircle2 size={18} />{translate(locale, "vehiclePageReady")}</span>
          <h1>{translate(locale, "vehicleJoinedGarage", { vehicle: vehicle.model })}</h1>
          <p>{vehicleSummary}</p>
          {vehicle.ownerComment && <blockquote>{vehicle.ownerComment}</blockquote>}
        </div>
      </section>

      <section className="welcome-next-actions">
        <div><span className="eyebrow">ONE MORE MOMENT</span><h2>{translate(locale, "addFirstMoment")}</h2><p>{translate(locale, "firstMomentIntro")}</p></div>
        <div className="welcome-action-buttons">
          <Link href={`/garage/${encodeURIComponent(vehicle.id)}/event/new`} className="primary-action"><Camera size={18} />{translate(locale, "addMoment")}<ArrowRight size={17} /></Link>
          <Link href="/garage" className="secondary-action"><Plus size={17} />{translate(locale, "viewVehiclePageNow")}</Link>
        </div>
      </section>
    </div>
  );
}
