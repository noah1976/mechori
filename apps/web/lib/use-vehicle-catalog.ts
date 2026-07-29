"use client";

import { loadPublishedVehicleCatalog } from "@/lib/vehicle-catalog";
import type { CollaborativeCatalogSnapshot } from "@mechori/core";
import { useEffect, useState } from "react";

export function usePublishedVehicleCatalog(enabled: boolean) {
  const [snapshot, setSnapshot] = useState<CollaborativeCatalogSnapshot | null>(null);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    async function load() {
      try {
        const loaded = await loadPublishedVehicleCatalog();
        if (!active) return;
        setSnapshot(loaded);
        setAvailable(true);
      } catch {
        // The migration may not have been applied yet. Static catalog fallback remains usable.
        if (active) setAvailable(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [enabled]);

  return { snapshot, available };
}
