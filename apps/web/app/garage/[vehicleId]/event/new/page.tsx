"use client";

import { useApp } from "@/lib/app-context";
import { QuickEventForm } from "@/components/quick-event-form";
import { translate } from "@mechori/i18n";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function QuickVehicleEventPage() {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const { data, locale } = useApp();
  const vehicle = data.vehicles.find((item) => item.id === vehicleId);

  if (!vehicle) return <div className="empty-state"><h1>{translate(locale, "vehicleNotFound")}</h1><Link href="/garage" className="primary-action">{translate(locale, "openGarage")}</Link></div>;
  return <QuickEventForm vehicle={vehicle} />;
}
