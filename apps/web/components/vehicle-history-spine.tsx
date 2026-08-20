import Link from "next/link";
import type { ReactNode } from "react";

export type VehicleHistorySpineItem = {
  id: string;
  dateLabel?: string;
  dateTime?: string;
  label: string;
  title: string;
  detail?: string;
  actor?: string;
  status?: string;
  kind?: "record" | "issue" | "work" | "result" | "continuation";
  href?: string;
  media?: ReactNode;
  featured?: boolean;
};

export function VehicleHistorySpine({
  items,
  label,
  density = "standard",
}: {
  items: VehicleHistorySpineItem[];
  label: string;
  density?: "compact" | "standard";
}) {
  return (
    <ol className={`vehicle-history-spine is-${density}`} aria-label={label}>
      {items.map((item) => {
        const content = (
          <>
            <div className="vehicle-history-spine-date">
              {item.dateLabel && item.dateTime ? (
                <time dateTime={item.dateTime}>{item.dateLabel}</time>
              ) : item.dateLabel ? (
                <span>{item.dateLabel}</span>
              ) : null}
            </div>
            <span
              className={`vehicle-history-spine-marker is-${item.kind ?? "record"}`}
              aria-hidden="true"
            />
            <div className="vehicle-history-spine-copy">
              <div className="vehicle-history-spine-label">
                <small>{item.label}</small>
                {item.status && <span>{item.status}</span>}
              </div>
              <strong>{item.title}</strong>
              {item.detail && <p>{item.detail}</p>}
              {item.actor && <span className="vehicle-history-spine-actor">{item.actor}</span>}
            </div>
            {item.media && <div className="vehicle-history-spine-media">{item.media}</div>}
          </>
        );

        return (
          <li
            key={item.id}
            className={`${item.featured ? "is-featured " : ""}is-${item.kind ?? "record"}`}
          >
            {item.href ? (
              <Link href={item.href} className={`vehicle-history-spine-entry${item.media ? " has-media" : ""}`}>
                {content}
              </Link>
            ) : (
              <div className={`vehicle-history-spine-entry${item.media ? " has-media" : ""}`}>{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
