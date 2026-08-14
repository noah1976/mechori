import type { Metadata } from "next";
import { ProfessionalPage } from "@/components/professional-page";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "MECHORI Professional",
  description: "車両履歴をオーナーと整備工場の間でつなぐMECHORI Professional先行検証",
};

export default function ProfessionalRoute() {
  return (
    <Suspense fallback={<div className="page-stack professional-page" />}>
      <ProfessionalPage />
    </Suspense>
  );
}
