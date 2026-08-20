import { AlphaHistorySignature } from "@/components/alpha-history-signature";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReferenceGaragePage() {
  return (
    <div className="page-stack reference-garage">
      <Link href="/" className="back-link"><ArrowLeft size={17} />ホームへ戻る</Link>
      <header className="reference-garage-heading">
        <p className="section-label">デモ用の架空例</p>
        <h1>Vehicle Continuityの前提</h1>
        <p>一台の車両を中心に、時点と関わった人が変わっても経験を読み返せる見え方を確認できます。</p>
      </header>
      <AlphaHistorySignature locale="ja" />
      <p className="reference-garage-note">この画面は架空の説明用fixtureです。Vehicle Succession、同型車比較、整備品質や車両状態の保証は現在提供していません。</p>
    </div>
  );
}
