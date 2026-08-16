"use client";

import { QuickEventForm } from "@/components/quick-event-form";
import { useApp } from "@/lib/app-context";
import { getPreferredVehicle } from "@mechori/core";
import { CarFront } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export function QuickRecordEntry({ initialVehicleId }: { initialVehicleId?: string }) {
  const { data, locale } = useApp();
  const ja = locale === "ja";
  const vehicles = useMemo(
    () => data.vehicles.filter((vehicle) => vehicle.ownerProfileId === data.currentProfileId),
    [data.currentProfileId, data.vehicles],
  );
  const preferred = getPreferredVehicle(vehicles);
  const [selectedVehicleId, setSelectedVehicleId] = useState(() =>
    vehicles.some((vehicle) => vehicle.id === initialVehicleId)
      ? initialVehicleId!
      : preferred?.id ?? "",
  );

  if (!vehicles.length) {
    return (
      <section className="page-stack narrow-page quick-record-no-vehicle">
        <CarFront size={30} aria-hidden="true" />
        <h1>{ja ? "記録する愛車を追加" : "Add a vehicle to record"}</h1>
        <p>{ja ? "記録は愛車ごとの履歴に残ります。先に愛車を登録してください。" : "Records are saved to a vehicle history. Add your vehicle first."}</p>
        <Link href="/garage/new" className="primary-action">{ja ? "愛車を追加" : "Add vehicle"}</Link>
      </section>
    );
  }

  const vehicle = vehicles.find((item) => item.id === selectedVehicleId) ?? preferred!;

  return (
    <div className="page-stack narrow-page quick-record-entry">
      {vehicles.length > 1 && (
        <label className="quick-record-vehicle-picker">
          <span>{ja ? "愛車" : "Vehicle"}</span>
          <select value={vehicle.id} onChange={(event) => setSelectedVehicleId(event.target.value)}>
            {vehicles.map((item) => (
              <option key={item.id} value={item.id}>{item.make} {item.model}{item.nickname ? ` (${item.nickname})` : ""}</option>
            ))}
          </select>
        </label>
      )}
      <QuickEventForm key={vehicle.id} vehicle={vehicle} />
    </div>
  );
}
