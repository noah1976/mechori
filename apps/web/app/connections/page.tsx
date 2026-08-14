"use client";

import { ConnectionsView } from "@/components/connections-view";
import { useSearchParams } from "next/navigation";

export default function ConnectionsPage() {
  const searchParams = useSearchParams();
  const profile = searchParams.get("profile");
  const tab = searchParams.get("tab") === "followers" ? "followers" : "following";
  return <ConnectionsView ownerPublicProfileId={profile} initialList={tab} />;
}
