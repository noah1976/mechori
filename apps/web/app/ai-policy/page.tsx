"use client";

import { BotOff, Database, Search, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/app-context";

export default function AiPolicyPage() {
  const { locale, isRemoteAlpha } = useApp();
  const ja = locale === "ja";

  return (
    <div className="page-stack narrow-page ai-policy-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">AI &amp; TEXT AND DATA MINING</span>
          <h1>{ja ? "AI学習・データ利用方針" : "AI training & data use policy"}</h1>
          <p>
            {ja
              ? "MECHORIに公開された内容は、誰でもAI学習やデータセット作成に使えることを意味しません。"
              : "Publishing content on MECHORI does not grant permission to use it for AI training or dataset creation."}
          </p>
        </div>
      </header>

      {isRemoteAlpha && (
        <p className="demo-notice">
          <ShieldCheck size={19} aria-hidden="true" />
          <span>
            <strong>{ja ? "少人数α版" : "Private alpha"}</strong>
            <span>
              {ja
                ? "α版は検索エンジンを含む自動クローラーから除外しています。"
                : "The alpha is excluded from automated crawlers, including search engines."}
            </span>
          </span>
        </p>
      )}

      <section className="ai-policy-grid" aria-label={ja ? "利用区分" : "Use categories"}>
        <article>
          <Search size={24} aria-hidden="true" />
          <div>
            <h2>{ja ? "通常の検索" : "Conventional search"}</h2>
            <p>
              {ja
                ? "正式公開後の公開ページは、検索結果への索引、順位付け、短い抜粋とリンク表示に限り許可する方針です。非公開・限定公開の内容は対象外です。"
                : "After public launch, public pages may be indexed for ranking, short snippets, and links in conventional search results. Private and limited-audience content is excluded."}
            </p>
          </div>
        </article>
        <article className="is-prohibited">
          <BotOff size={24} aria-hidden="true" />
          <div>
            <h2>{ja ? "AI学習・モデル改善" : "AI training & model improvement"}</h2>
            <p>
              {ja
                ? "基盤モデルの事前学習、追加学習、微調整、評価、合成データ生成への利用を許可しません。"
                : "Use for foundation-model training, continued training, fine-tuning, evaluation, or synthetic-data generation is not permitted."}
            </p>
          </div>
        </article>
        <article className="is-prohibited">
          <Database size={24} aria-hidden="true" />
          <div>
            <h2>{ja ? "収集・再配布" : "Extraction & redistribution"}</h2>
            <p>
              {ja
                ? "埋め込み、RAG、外部ナレッジベース、データセット化、大量取得、第三者への再配布を、事前の書面許諾なく行うことを許可しません。"
                : "Embeddings, RAG, external knowledge bases, datasets, bulk extraction, and redistribution require prior written permission."}
            </p>
          </div>
        </article>
      </section>

      <section className="settings-section ai-policy-detail">
        <h2>{ja ? "この方針の実施方法" : "How this policy is expressed"}</h2>
        <ul>
          <li>{ja ? "既知のAI学習用クローラーをrobots.txtで拒否します。" : "Known AI training crawlers are disallowed in robots.txt."}</li>
          <li>{ja ? "AI回答用の自動収集は、個別に許可すると決めるまで拒否します。" : "Automated crawling for AI answers is disallowed unless separately approved."}</li>
          <li>{ja ? "TDM（テキスト・データマイニング）の権利留保を機械判読できる形式で示します。" : "A machine-readable reservation of text and data mining rights is provided."}</li>
          <li>{ja ? "公開範囲、取得量、異常なアクセスを継続的に確認します。" : "Publication boundaries, request volume, and unusual access will be monitored."}</li>
        </ul>
        <p className="legal-note">
          {ja
            ? "robots.txt等は、すべての取得者を技術的に強制停止する仕組みではありません。この方針は利用条件と技術的意思表示を兼ね、正式な利用規約は公開前に法的確認を行います。法律で認められる引用、個人による通常の閲覧、投稿者自身の権利を不当に制限するものではありません。"
            : "robots.txt and related signals cannot technically stop every collector. This page states both usage conditions and machine-readable intent; formal terms will receive legal review before public launch. It does not improperly restrict lawful quotation, ordinary individual viewing, or contributors' own rights."}
        </p>
      </section>
    </div>
  );
}
