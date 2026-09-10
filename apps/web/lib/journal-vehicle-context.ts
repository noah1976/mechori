import type { GarageJournalPost } from "@mechori/core";

const publicVehicleSlugPattern = /^[0-9a-f]{24}$/;

export type JournalVehicleDestination = {
  href: string;
  kind: "garage" | "public_vehicle" | "owner_garage";
};

export function journalVehicleDestination({
  journal,
  ownedVehicleIds,
  ownerGarageHref,
}: {
  journal: GarageJournalPost;
  ownedVehicleIds: ReadonlySet<string>;
  ownerGarageHref?: string;
}): JournalVehicleDestination | undefined {
  if (journal.vehicleId && ownedVehicleIds.has(journal.vehicleId)) {
    return {
      href: `/garage?vehicle=${encodeURIComponent(journal.vehicleId)}`,
      kind: "garage",
    };
  }

  if (
    journal.vehicleTargetId &&
    publicVehicleSlugPattern.test(journal.vehicleTargetId)
  ) {
    return {
      href: `/v/${encodeURIComponent(journal.vehicleTargetId)}`,
      kind: "public_vehicle",
    };
  }

  if (ownerGarageHref) {
    return { href: ownerGarageHref, kind: "owner_garage" };
  }

  return undefined;
}
