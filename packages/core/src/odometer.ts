import type { OdometerReading } from "./domain-model.ts";

export type OdometerSequenceAssessment =
  | "consistent_increase"
  | "same_reading"
  | "new_episode"
  | "unit_changed"
  | "needs_context";

export function assessOdometerSequence(
  previous: OdometerReading,
  current: OdometerReading,
): OdometerSequenceAssessment {
  if (previous.odometerEpisodeId !== current.odometerEpisodeId) {
    return "new_episode";
  }

  if (previous.unit !== current.unit) {
    return "unit_changed";
  }

  if (current.displayedValue < previous.displayedValue) {
    return "needs_context";
  }

  if (current.displayedValue === previous.displayedValue) {
    return "same_reading";
  }

  return "consistent_increase";
}
