"use client";

import { ProfessionalOrganizationDetail } from "@/components/professional-organization-detail";
import { useParams } from "next/navigation";

export default function ProfessionalOrganizationPage() {
  const { id } = useParams<{ id: string }>();
  return <ProfessionalOrganizationDetail organizationId={id} />;
}
