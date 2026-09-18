import type { Vehicle, VehiclePassport } from "@mechori/core";

export interface PassportShareProjection {
  make: string;
  model: string;
  nickname?: string;
  modelYear?: number;
  grade?: string;
  modelCode?: string;
  specificationNote?: string;
  odometerValue?: number;
  odometerUnit: VehiclePassport["odometerUnit"];
  modifications?: string;
  recentMaintenance?: string;
  workshopConcerns?: string;
  otherNotes?: string;
  updatedAt: string;
}

export function buildPassportShareProjection(
  vehicle: Vehicle,
  passport: VehiclePassport,
): PassportShareProjection {
  if (passport.vehicleId !== vehicle.id) throw new Error("passport_vehicle_mismatch");
  return {
    make: vehicle.make,
    model: vehicle.model,
    ...(vehicle.nickname ? { nickname: vehicle.nickname } : {}),
    ...(vehicle.year ? { modelYear: vehicle.year } : {}),
    ...(vehicle.grade ? { grade: vehicle.grade } : {}),
    ...(vehicle.modelCode ? { modelCode: vehicle.modelCode } : {}),
    ...(vehicle.specificationNote ? { specificationNote: vehicle.specificationNote } : {}),
    ...(passport.odometerValue === undefined ? {} : { odometerValue: passport.odometerValue }),
    odometerUnit: passport.odometerUnit,
    ...(passport.modifications ? { modifications: passport.modifications } : {}),
    ...(passport.recentMaintenance ? { recentMaintenance: passport.recentMaintenance } : {}),
    ...(passport.workshopConcerns ? { workshopConcerns: passport.workshopConcerns } : {}),
    ...(passport.otherNotes ? { otherNotes: passport.otherNotes } : {}),
    updatedAt: passport.updatedAt,
  };
}
