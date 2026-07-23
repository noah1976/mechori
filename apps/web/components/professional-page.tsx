"use client";

import { useApp } from "@/lib/app-context";
import { translate } from "@mechori/i18n";
import {
  ArrowRight,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  ClipboardList,
  FileOutput,
  Globe2,
  History,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export function ProfessionalPage() {
  const { locale } = useApp();
  const params = useSearchParams();
  const referredByOwner = params.get("ref") === "owner";
  const mailto = buildMailto(
    translate(locale, "professionalMailSubject"),
    translate(locale, "professionalMailBody"),
  );

  return (
    <div className="page-stack professional-page">
      <header className="professional-hero">
        <div className="professional-hero-copy">
          <span className="eyebrow">{translate(locale, "professionalEyebrow")}</span>
          {referredByOwner && (
            <p className="professional-referral-note">
              <MapPin size={17} aria-hidden="true" />
              {translate(locale, "professionalOwnerReferral")}
            </p>
          )}
          <h1>{translate(locale, "professionalTitle")}</h1>
          <p>{translate(locale, "professionalIntro")}</p>
          <div className="professional-hero-actions">
            <a href={mailto} className="primary-action">
              <Building2 size={18} aria-hidden="true" />
              {translate(locale, "professionalFoundingCta")}
            </a>
            <Link href="#workflow" className="professional-inline-link">
              {translate(locale, "professionalWorkflowTitle")}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <small>{translate(locale, "professionalFoundingNote")}</small>
        </div>
        <div className="professional-product-preview" aria-label={translate(locale, "professionalWorkflowTitle")}>
          <div className="professional-preview-topline">
            <span>MECHORI / WORKFLOW PREVIEW</span>
            <span>ILLUSTRATIVE UI</span>
          </div>
          <div className="professional-preview-vehicle">
            <span className="professional-preview-mark">M</span>
            <div>
              <small>VEHICLE HISTORY</small>
              <strong>1997 FIAT Barchetta</strong>
              <span>10 records · 2 open items</span>
            </div>
          </div>
          <div className="professional-preview-lines">
            <span><History size={17} aria-hidden="true" />Previous work received</span>
            <span><Wrench size={17} aria-hidden="true" />Checks and work recorded</span>
            <span><FileOutput size={17} aria-hidden="true" />Report ready for owner</span>
          </div>
          <div className="professional-preview-footer">
            <ShieldCheck size={18} aria-hidden="true" />
            <span>Owner report · source kept · no diagnosis claim</span>
          </div>
        </div>
      </header>

      <section id="workflow" className="professional-section">
        <div className="professional-section-heading">
          <span className="eyebrow">{translate(locale, "professionalWorkflowEyebrow")}</span>
          <h2>{translate(locale, "professionalWorkflowTitle")}</h2>
          <p>{translate(locale, "professionalWorkflowIntro")}</p>
        </div>
        <div className="professional-workflow">
          <article>
            <span>01</span>
            <History size={24} aria-hidden="true" />
            <h3>{translate(locale, "professionalWorkflowReceive")}</h3>
            <p>{translate(locale, "professionalWorkflowReceiveBody")}</p>
          </article>
          <article>
            <span>02</span>
            <ClipboardList size={24} aria-hidden="true" />
            <h3>{translate(locale, "professionalWorkflowRecord")}</h3>
            <p>{translate(locale, "professionalWorkflowRecordBody")}</p>
          </article>
          <article>
            <span>03</span>
            <FileOutput size={24} aria-hidden="true" />
            <h3>{translate(locale, "professionalWorkflowReturn")}</h3>
            <p>{translate(locale, "professionalWorkflowReturnBody")}</p>
          </article>
        </div>
      </section>

      <section className="professional-value-band">
        <div className="professional-section-heading">
          <span className="eyebrow">{translate(locale, "professionalValueEyebrow")}</span>
          <h2>{translate(locale, "professionalValueTitle")}</h2>
        </div>
        <ul>
          <li><CheckCircle2 size={19} aria-hidden="true" />{translate(locale, "professionalValueIntake")}</li>
          <li><CheckCircle2 size={19} aria-hidden="true" />{translate(locale, "professionalValueReport")}</li>
          <li><CheckCircle2 size={19} aria-hidden="true" />{translate(locale, "professionalValueReuse")}</li>
          <li><CheckCircle2 size={19} aria-hidden="true" />{translate(locale, "professionalValueHandoff")}</li>
        </ul>
      </section>

      <section className="professional-section">
        <div className="professional-section-heading">
          <span className="eyebrow">{translate(locale, "professionalKnowledgeEyebrow")}</span>
          <h2>{translate(locale, "professionalKnowledgeTitle")}</h2>
          <p>{translate(locale, "professionalKnowledgeIntro")}</p>
        </div>
        <div className="professional-knowledge-levels">
          <article>
            <LockKeyhole size={22} aria-hidden="true" />
            <div><h3>{translate(locale, "professionalKnowledgePrivate")}</h3><p>{translate(locale, "professionalKnowledgePrivateBody")}</p></div>
          </article>
          <article>
            <MapPin size={22} aria-hidden="true" />
            <div><h3>{translate(locale, "professionalKnowledgeSignal")}</h3><p>{translate(locale, "professionalKnowledgeSignalBody")}</p></div>
          </article>
          <article>
            <BookOpenCheck size={22} aria-hidden="true" />
            <div><h3>{translate(locale, "professionalKnowledgeShared")}</h3><p>{translate(locale, "professionalKnowledgeSharedBody")}</p></div>
          </article>
        </div>
      </section>

      <section className="professional-pricing">
        <div>
          <span className="eyebrow">{translate(locale, "professionalPricingEyebrow")}</span>
          <h2>{translate(locale, "professionalPricingTitle")}</h2>
          <p>{translate(locale, "professionalPricingIntro")}</p>
        </div>
        <div className="professional-price-lines">
          <strong>{translate(locale, "professionalFoundingPrice")}</strong>
          <span>{translate(locale, "professionalSoloPrice")}</span>
          <small>{translate(locale, "professionalPriceConditions")}</small>
        </div>
      </section>

      <section className="professional-global">
        <Globe2 size={30} aria-hidden="true" />
        <div>
          <span className="eyebrow">{translate(locale, "professionalGlobalEyebrow")}</span>
          <h2>{translate(locale, "professionalGlobalTitle")}</h2>
          <p>{translate(locale, "professionalGlobalIntro")}</p>
        </div>
      </section>

      <aside className="professional-safety">
        <ShieldCheck size={24} aria-hidden="true" />
        <div>
          <strong>{translate(locale, "professionalSafetyTitle")}</strong>
          <p>{translate(locale, "professionalSafetyBody")}</p>
        </div>
      </aside>

      <section className="professional-final-cta">
        <Building2 size={30} aria-hidden="true" />
        <h2>{translate(locale, "professionalFoundingCta")}</h2>
        <a href={mailto} className="primary-action">
          {translate(locale, "professionalFoundingCta")}
          <ArrowRight size={18} aria-hidden="true" />
        </a>
        <small>{translate(locale, "professionalFoundingNote")}</small>
      </section>
    </div>
  );
}

function buildMailto(subject: string, body: string): string {
  return `mailto:info@mechori.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
