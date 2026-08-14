import type { Locale, Vehicle } from "@mechori/core";
import { ProfileAvatar } from "@/components/profile-avatar";
import { buildGarageVehicleIdentity } from "@/lib/vehicle-identity";

export function GarageVehicleIdentity({
  vehicle,
  locale,
  ownerDisplayName,
  ownerImagePath,
}: {
  vehicle: Vehicle;
  locale: Locale;
  ownerDisplayName?: string;
  ownerImagePath?: string;
}) {
  const ja = locale === "ja";
  const identity = buildGarageVehicleIdentity(vehicle, locale);

  return (
    <div className="garage-v2-vehicle-identity">
      <p className="garage-v2-make">{identity.make}</p>
      <h1 className="garage-v2-vehicle-name">
        <span>{identity.model}</span>
        {identity.grade && <span className="garage-v2-grade">{identity.grade}</span>}
      </h1>
      {(identity.modelCode || identity.year) && (
        <dl className="garage-v2-spec-line" aria-label={ja ? "車両の仕様" : "Vehicle specifications"}>
          {identity.modelCode && <div><dt>{ja ? "型式" : "Model code"}</dt><dd>{identity.modelCode}</dd></div>}
          {identity.year && <div><dt>{ja ? "年式" : "Year"}</dt><dd>{identity.year}</dd></div>}
        </dl>
      )}
      {identity.nickname && <p className="garage-v2-nickname">{identity.nickname}</p>}
      {identity.facts.length > 0 && (
        <dl className="garage-v2-facts" aria-label={ja ? "車齢・所有・走行距離" : "Vehicle age, ownership, and odometer"}>
          {identity.facts.map((fact) => (
            <div className="garage-v2-fact" key={fact.key}>
              <dt>{fact.label}</dt>
              <dd>{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="garage-v2-owner-line">
        <ProfileAvatar displayName={ownerDisplayName ?? "MECHORI"} imagePath={ownerImagePath} />
        <span>{ja ? `${ownerDisplayName ?? "オーナー"}の愛車` : `${ownerDisplayName ?? "Owner"}'s vehicle`}</span>
      </div>
    </div>
  );
}
