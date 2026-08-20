import { CarFront } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type VehicleContinuityIdentity = {
  make: string;
  model?: string;
  context?: string;
  badge: string;
  objectLabel: string;
};

export type VehicleExperienceMark = {
  id: string;
  dateLabel?: string;
  dateTime?: string;
  label: string;
  title: string;
  detail?: string;
  actor?: {
    role: string;
    name: string;
  };
  status?: string;
  kind?: "record" | "observation" | "issue" | "work" | "result" | "transition" | "reuse";
  href?: string;
  media?: ReactNode;
  featured?: boolean;
};

export type VehicleContinuationSlot = {
  label: string;
  title: string;
  description: string;
};

export type VehicleKnowledgeOutlet = {
  label: string;
  title: string;
  description: string;
};

export function VehicleContinuity({
  identity,
  experiences,
  label,
  ledgerLabel,
  density = "standard",
  continuation,
  knowledgeOutlet,
}: {
  identity: VehicleContinuityIdentity;
  experiences: VehicleExperienceMark[];
  label: string;
  ledgerLabel: string;
  density?: "compact" | "standard";
  continuation?: VehicleContinuationSlot;
  knowledgeOutlet?: VehicleKnowledgeOutlet;
}) {
  return (
    <section className={`vehicle-continuity is-${density}`} aria-label={label}>
      <header className="vehicle-continuity-anchor">
        <div className="vehicle-continuity-anchor-label">
          <CarFront size={17} aria-hidden="true" />
          <span>{identity.badge}</span>
        </div>
        <strong>{identity.make}</strong>
        {identity.model && <b>{identity.model}</b>}
        {identity.context && <small>{identity.context}</small>}
        <span className="vehicle-continuity-anchor-state">{identity.objectLabel}</span>
      </header>

      <div className="vehicle-continuity-ledger">
        <p className="vehicle-continuity-ledger-label">{ledgerLabel}</p>
        <ol className="vehicle-experience-list">
          {experiences.map((experience) => (
            <VehicleExperience key={experience.id} experience={experience} />
          ))}
        </ol>
        {continuation && <ContinuationSlot slot={continuation} />}
        {knowledgeOutlet && <KnowledgeOutlet outlet={knowledgeOutlet} />}
      </div>
    </section>
  );
}

function VehicleExperience({ experience }: { experience: VehicleExperienceMark }) {
  const body = (
    <>
      <div className="vehicle-experience-register">
        <div className="vehicle-experience-date">
          {experience.dateLabel && experience.dateTime ? (
            <time dateTime={experience.dateTime}>{experience.dateLabel}</time>
          ) : experience.dateLabel ? (
            <span>{experience.dateLabel}</span>
          ) : null}
        </div>
        <div className="vehicle-experience-state">
          <span>{experience.label}</span>
          {experience.status && <strong>{experience.status}</strong>}
        </div>
        {experience.actor && (
          <dl className="vehicle-experience-actor">
            <div>
              <dt>{experience.actor.role}</dt>
              <dd>{experience.actor.name}</dd>
            </div>
          </dl>
        )}
      </div>
      <article className="vehicle-experience-body">
        <h3>{experience.title}</h3>
        {experience.detail && <p>{experience.detail}</p>}
      </article>
      {experience.media && <div className="vehicle-experience-media">{experience.media}</div>}
    </>
  );

  return (
    <li className={`${experience.featured ? "is-featured " : ""}is-${experience.kind ?? "record"}`}>
      {experience.href ? (
        <Link href={experience.href} className={`vehicle-experience-mark${experience.media ? " has-media" : ""}`}>
          {body}
        </Link>
      ) : (
        <div className={`vehicle-experience-mark${experience.media ? " has-media" : ""}`}>{body}</div>
      )}
    </li>
  );
}

function ContinuationSlot({ slot }: { slot: VehicleContinuationSlot }) {
  return (
    <aside className="vehicle-continuation-slot" aria-label={slot.label}>
      <span>{slot.label}</span>
      <div>
        <strong>{slot.title}</strong>
        <p>{slot.description}</p>
      </div>
    </aside>
  );
}

function KnowledgeOutlet({ outlet }: { outlet: VehicleKnowledgeOutlet }) {
  return (
    <aside className="vehicle-knowledge-outlet" aria-label={outlet.label}>
      <span>{outlet.label}</span>
      <div>
        <strong>{outlet.title}</strong>
        <p>{outlet.description}</p>
      </div>
    </aside>
  );
}
