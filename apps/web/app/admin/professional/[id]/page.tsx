"use client";

import { ProfessionalOrganizationDetail } from "@/components/professional-organization-detail";
import { useParams } from "next/navigation";

export default function AdminProfessionalOrganizationPage() {
  const { id } = useParams<{ id: string }>();
  return <ProfessionalOrganizationDetail organizationId={id} adminMode />;
}
