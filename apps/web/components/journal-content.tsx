import type { GarageJournalPost, JournalContentBlock, Locale } from "@mechori/core";
import { JournalMedia } from "@/components/journal-media";

export function JournalContent({
  journal,
  locale,
  contentBlocks = journal.contentBlocks,
  vehicleHref,
}: {
  journal: GarageJournalPost;
  locale: Locale;
  contentBlocks?: JournalContentBlock[];
  vehicleHref?: string;
}) {
  const firstMediaBlockId = contentBlocks.find(
    (block) =>
      block.type === "media" &&
      journal.media.some((attachment) => attachment.id === block.mediaId),
  )?.id;
  return (
    <div className="journal-content">
      {contentBlocks.map((block) => {
        if (block.type === "media") {
          const attachment = journal.media.find((item) => item.id === block.mediaId);
          if (!attachment) return null;
          return (
            <JournalMedia
              attachments={[attachment]}
              locale={locale}
              priority={block.id === firstMediaBlockId}
              vehicleHref={vehicleHref}
              key={block.id}
            />
          );
        }
        if (block.style === "heading") return <h2 key={block.id}>{block.text}</h2>;
        if (block.style === "quote") return <blockquote key={block.id}>{block.text}</blockquote>;
        return <p key={block.id}>{block.text || "\u00a0"}</p>;
      })}
    </div>
  );
}
