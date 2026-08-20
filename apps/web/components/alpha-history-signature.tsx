import {
  VehicleContinuity,
  type VehicleExperienceMark,
} from "@/components/vehicle-continuity";
import { signatureDemoStory, type Locale } from "@mechori/core";
import Link from "next/link";

function demoExperiences(locale: Locale): VehicleExperienceMark[] {
  const ja = locale === "ja";

  return signatureDemoStory.experiences.map((experience) => ({
    id: experience.id,
    dateLabel: ja ? experience.dateJa : experience.dateEn,
    dateTime: experience.occurredAt,
    label: ja ? experience.labelJa : experience.labelEn,
    title: ja ? experience.titleJa : experience.titleEn,
    detail: ja ? experience.detailJa : experience.detailEn,
    actor: experience.actorName && experience.actorRoleJa && experience.actorRoleEn
      ? {
          role: ja ? experience.actorRoleJa : experience.actorRoleEn,
          name: experience.actorName,
        }
      : undefined,
    kind: experience.kind,
  }));
}

export function AlphaHistorySignature({
  locale,
  compact = false,
  headingLevel = "h2",
}: {
  locale: Locale;
  compact?: boolean;
  headingLevel?: "h1" | "h2";
}) {
  const ja = locale === "ja";
  const { vehicle } = signatureDemoStory;
  const Heading = headingLevel;

  return (
    <section
      className={`alpha-history-signature${compact ? " is-compact" : ""}`}
      aria-labelledby={compact ? "home-history-signature-heading" : "reference-history-signature-heading"}
    >
      <header className="alpha-history-signature-heading">
        <span className="demo-label">DEMO・{ja ? "架空例" : "FICTIONAL"}</span>
        <Heading id={compact ? "home-history-signature-heading" : "reference-history-signature-heading"}>
          {ja ? "一台のクルマに残る経験" : "Experience that stays with one vehicle"}
        </Heading>
      </header>
      <VehicleContinuity
        label={ja ? "デモ車両の経験の継続" : "Demo vehicle experience continuity"}
        ledgerLabel={ja ? "このクルマに残った経験" : "Experience kept with this vehicle"}
        density={compact ? "compact" : "standard"}
        identity={{
          make: vehicle.make,
          model: vehicle.model,
          context: ja ? vehicle.contextJa : vehicle.contextEn,
          badge: ja ? "車両" : "Vehicle",
          objectLabel: ja ? "この個体" : "This individual vehicle",
        }}
        experiences={demoExperiences(locale)}
        knowledgeOutlet={{
          label: ja ? "将来の接続" : "Future connection",
          title: ja ? "同型車の経験へ" : "Toward experience from similar vehicles",
          description: ja
            ? "同型車との照合・比較は未実装です。"
            : "Matching and comparison with similar vehicles are not implemented.",
        }}
      />
      <footer className="alpha-history-signature-footer">
        <p>
          {ja
            ? "実在の車両・人物・整備結果ではありません。引き継ぎと同型車比較も現在利用できる機能ではありません。"
            : "This does not depict real vehicles, people, or maintenance results. Succession and cross-vehicle comparison are not currently available."}
        </p>
        {compact && (
          <Link href="/reference-garage" className="alpha-history-signature-link">
            {ja ? "架空例の前提を見る" : "About this fictional example"}
          </Link>
        )}
      </footer>
    </section>
  );
}
