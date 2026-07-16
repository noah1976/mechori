import type { GarageJournalPost, Locale } from "@mechori/core";
import { JournalMedia } from "@/components/journal-media";

export function JournalContent({
  journal,
  locale,
}: {
  journal: GarageJournalPost;
  locale: Locale;
}) {
  return (
    <div className="journal-content">
      {journal.contentBlocks.map((block) => {
        if (block.type === "media") {
          const attachment = journal.media.find((item) => item.id === block.mediaId);
          return attachment ? (
            <JournalMedia attachments={[attachment]} locale={locale} key={block.id} />
          ) : null;
        }
        if (block.style === "heading") return <h2 key={block.id}>{block.text}</h2>;
        if (block.style === "quote") return <blockquote key={block.id}>{block.text}</blockquote>;
        return <p key={block.id}>{block.text || "\u00a0"}</p>;
      })}
    </div>
  );
}
