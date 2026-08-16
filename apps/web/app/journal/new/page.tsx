"use client";

import { QuickRecordEntry } from "@/components/quick-record-entry";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

export default function NewJournalPage() {
  return <Suspense fallback={null}><NewJournalContent /></Suspense>;
}

function NewJournalContent() {
  const searchParams = useSearchParams();
  const vehicleId = searchParams.get("vehicle") ?? undefined;
  return <QuickRecordEntry initialVehicleId={vehicleId} />;
}
