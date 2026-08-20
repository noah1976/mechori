import { AlphaHistorySignature } from "@/components/alpha-history-signature";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReferenceGaragePage() {
  return (
    <div className="page-stack reference-garage">
      <Link href="/" className="back-link"><ArrowLeft size={17} />ホームへ戻る</Link>
      <header className="reference-garage-heading">
        <p className="section-label">DEMO車両の履歴</p>
        <h1>一台のクルマに残る経験</h1>
        <p>整備、気づき、オーナーの追記が、同じ車両の時間として積み重なる見え方を確認できます。</p>
      </header>
      <AlphaHistorySignature locale="ja" />
      <p className="reference-garage-note">この画面は整備の正しさや車両状態を保証するものではありません。記録した事実、作業、部品、結果を後からたどれる形の例です。</p>
    </div>
  );
}
