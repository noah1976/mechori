import type {
  HazardLevel,
  Locale,
  ResolutionStatus,
  VerificationStatus,
  Visibility,
} from "@mechori/core";
import { translate } from "@mechori/i18n";
import { CheckCircle2, CircleAlert, Eye, EyeOff, ShieldAlert } from "lucide-react";

export function HazardBadge({ level }: { level: HazardLevel }) {
  return (
    <span className={`badge hazard-${level.toLowerCase()}`}>
      {level === "CRITICAL" ? <ShieldAlert size={14} /> : <CircleAlert size={14} />}
      {level}
    </span>
  );
}

export function VisibilityBadge({ value, locale }: { value: Visibility; locale: Locale }) {
  return (
    <span className="badge badge-neutral">
      {value === "private" ? <EyeOff size={14} /> : <Eye size={14} />}
      {translate(locale, value)}
    </span>
  );
}

export function ResolutionBadge({ value, locale }: { value: ResolutionStatus; locale: Locale }) {
  return (
    <span className={`badge resolution-${value}`}>
      <CheckCircle2 size={14} />
      {translate(locale, value)}
    </span>
  );
}

export function VerificationBadge({ value, locale }: { value: VerificationStatus; locale: Locale }) {
  return <span className="badge badge-outline">{translate(locale, value)}</span>;
}
