"use client";

import { DemoNotice } from "@/components/demo-notice";
import { OwnerDiscovery } from "@/components/owner-discovery";

export default function PeoplePage() {
  return (
    <div className="page-stack">
      <DemoNotice />
      <OwnerDiscovery />
    </div>
  );
}
