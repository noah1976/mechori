import { ArrowRight, Lightbulb } from "lucide-react";
import Link from "next/link";
import { journalPrompts } from "@/lib/journal-prompts";

export function JournalPrompts({ vehicleId }: { vehicleId?: string }) {
  const vehicleQuery = vehicleId ? `&vehicle=${encodeURIComponent(vehicleId)}` : "";

  return (
    <section className="journal-prompts" aria-labelledby="journal-prompts-heading">
      <div className="journal-prompts-heading">
        <Lightbulb size={20} aria-hidden="true" />
        <div>
          <span className="eyebrow">A SMALL START</span>
          <h2 id="journal-prompts-heading">今日は、愛車のどんな記録を残しますか？</h2>
          <p>整備のことも、思い出や日常のことも、自由に記録できます。</p>
        </div>
      </div>
      <div className="journal-prompt-list">
        {journalPrompts.map((prompt) => (
          <Link
            href={`/journal/new?prompt=${encodeURIComponent(prompt.id)}${vehicleQuery}`}
            key={prompt.id}
            className="journal-prompt-link"
          >
            <span>{prompt.label}</span>
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}
