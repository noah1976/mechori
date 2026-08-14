"use client";

import Link from "next/link";
import { BarChart3, Database, LockKeyhole, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/app-context";

export function PrivacyPolicyContent() {
  const { locale } = useApp();
  const ja = locale === "ja";

  return (
    <div className="page-stack narrow-page privacy-policy-page">
      <header className="page-header">
        <div>
          <span className="eyebrow">PRIVACY POLICY</span>
          <h1>{ja ? "プライバシーポリシー（α版）" : "Privacy policy (alpha)"}</h1>
          <p>
            {ja
              ? "MECHORIが少人数α版で扱う情報、その目的、外部サービス、利用者の選択肢を説明します。"
              : "This policy explains the information MECHORI handles in its private alpha, why it is used, the external services involved, and your choices."}
          </p>
        </div>
      </header>

      <p className="policy-version">
        {ja ? "制定・最終更新：2026年7月27日" : "Effective and last updated: July 27, 2026"}
      </p>

      <aside className="settings-section privacy-policy-section" aria-label={ja ? "α版の提供について" : "About the alpha offering"}>
        <h2>{ja ? "α版の提供について" : "About the alpha offering"}</h2>
        <p>
          {ja
            ? "現在、MECHORIはα版として無料で提供しています。サービスを継続・改善するため、将来的に広告の表示や、一部機能を対象とした有料プランを導入する可能性があります。"
            : "MECHORI is currently provided as a free alpha. To sustain and improve the service, we may introduce advertising or paid plans for selected features in the future."}
        </p>
      </aside>

      <section className="privacy-policy-principles" aria-label={ja ? "基本原則" : "Core principles"}>
        <article>
          <ShieldCheck size={22} aria-hidden="true" />
          <div>
            <h2>{ja ? "必要最小限" : "Data minimization"}</h2>
            <p>{ja ? "サービス提供とα改善に必要な範囲だけを扱います。" : "We handle only what is needed to provide and improve the alpha."}</p>
          </div>
        </article>
        <article>
          <LockKeyhole size={22} aria-hidden="true" />
          <div>
            <h2>{ja ? "非公開が基本" : "Private by default"}</h2>
            <p>{ja ? "明示的に公開を選んだ情報以外は公開しません。" : "Information is not public unless you explicitly choose to publish it."}</p>
          </div>
        </article>
        <article>
          <Database size={22} aria-hidden="true" />
          <div>
            <h2>{ja ? "第三者AI学習に提供しない" : "No third-party AI training"}</h2>
            <p>{ja ? "α版の入力内容を外部AIの学習へ提供しません。" : "Alpha content is not provided for external AI training."}</p>
          </div>
        </article>
      </section>

      <section className="settings-section privacy-policy-section">
        <h2>{ja ? "1. 運営者と問い合わせ窓口" : "1. Operator and contact"}</h2>
        <p>
          {ja
            ? "本サービスはMECHORI運営者が提供します。プライバシーに関する質問、データの確認・訂正・削除・利用停止の相談は、次の窓口へご連絡ください。本人確認のため、追加情報をお願いする場合があります。"
            : "The service is provided by the MECHORI operator. Contact the address below with privacy questions or requests to access, correct, delete, or restrict use of your data. We may request additional information to verify your identity."}
        </p>
        <a className="text-link" href="mailto:info@mechori.com">info@mechori.com</a>
        <p className="legal-note">
          {ja
            ? "これは招待制α版の運用方針です。一般公開、課金または対象地域の拡大前に、運営者の法定表示を含めて専門家による確認と改定を行います。"
            : "This is the operating policy for the invite-only alpha. It will be reviewed and updated, including legally required operator disclosures, before general release, payments, or regional expansion."}
        </p>
      </section>

      <section className="settings-section privacy-policy-section">
        <h2>{ja ? "2. 取得・保存する情報" : "2. Information we collect and store"}</h2>
        <ul>
          <li>
            {ja
              ? "認証情報：Googleログインから返されるアカウント識別子、メールアドレス、基本プロフィール情報。認証処理はSupabase Authを利用します。"
              : "Authentication data: the account identifier, email address, and basic profile information returned by Google sign-in. Authentication is handled by Supabase Auth."}
          </li>
          <li>
            {ja
              ? "アカウント・招待情報：内部ユーザーID、表示名、表示言語、α参加状態、招待の発行・使用・有効期限。"
              : "Account and invitation data: internal user ID, display name, interface language, alpha membership status, and invitation issuance, redemption, and expiry."}
          </li>
          <li>
            {ja
              ? "利用者が入力する情報：車両、所有期間、整備・故障・修理・部品・出来事、ジャーナル、公開範囲、フィードバック、通報。写真・動画は利用者が選択した場合だけ扱います。"
              : "User-provided data: vehicles, ownership periods, maintenance, faults, repairs, parts, events, journal entries, visibility choices, feedback, and reports. Photos and videos are handled only when selected by the user."}
          </li>
          <li>
            {ja
              ? "技術・安全情報：セッションCookie、アクセス日時、IPアドレス、ブラウザ・端末情報、エラーログその他、不正利用防止と安定運用に必要なログ。"
              : "Technical and security data: session cookies, access times, IP address, browser and device data, error logs, and other logs needed for abuse prevention and stable operation."}
          </li>
        </ul>
        <p>
          {ja
            ? "Google Drive、連絡先、友人一覧、Google上の投稿にはアクセスしません。車台番号全文、ナンバープレート番号、正確な保管場所、GPS移動履歴、運転免許証、クレジットカード情報はα版の標準入力項目として取得しません。"
            : "MECHORI does not access Google Drive, contacts, friend lists, or Google posts. Full VINs, registration plate numbers, precise storage locations, GPS trip histories, driver's licenses, and credit-card information are not standard alpha inputs."}
        </p>
      </section>

      <section className="settings-section privacy-policy-section">
        <h2>{ja ? "3. 利用目的" : "3. Purposes of use"}</h2>
        <ul>
          <li>{ja ? "本人認証、招待制αへの参加確認、セッション維持" : "Authentication, invite-only alpha access control, and session management"}</li>
          <li>{ja ? "愛車・整備・出来事の保存、編集、表示、共有範囲の適用" : "Storing, editing, displaying, and applying visibility choices to vehicle, maintenance, and event data"}</li>
          <li>{ja ? "不正利用防止、障害調査、セキュリティ、バックアップ" : "Abuse prevention, incident investigation, security, and backups"}</li>
          <li>{ja ? "フィードバック・通報への対応、少人数αの使い勝手と品質改善" : "Responding to feedback and reports and improving alpha usability and quality"}</li>
          <li>{ja ? "法令上必要な対応と権利保護" : "Legal compliance and protection of rights"}</li>
        </ul>
      </section>

      <section className="settings-section privacy-policy-section">
        <h2>{ja ? "4. 外部サービスと国外での処理" : "4. External services and international processing"}</h2>
        <p>
          {ja
            ? "MECHORIは次の事業者を、記載した目的の範囲で利用します。各事業者の設備や委託先が日本国外にある場合があります。"
            : "MECHORI uses the following providers only for the stated purposes. Their facilities or subprocessors may be located outside Japan."}
        </p>
        <div className="policy-provider-list">
          <article><strong>Google</strong><span>{ja ? "Google OAuthによるログイン" : "Sign-in with Google OAuth"}</span><a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">{ja ? "プライバシーポリシー" : "Privacy policy"}</a></article>
          <article><strong>Supabase</strong><span>{ja ? "認証、データベース、利用者別アクセス制御" : "Authentication, database, and per-user access controls"}</span><a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">{ja ? "プライバシーポリシー" : "Privacy policy"}</a></article>
          <article><strong>Netlify</strong><span>{ja ? "Web配信、サーバー処理、運用ログ" : "Web hosting, server processing, and operational logs"}</span><a href="https://www.netlify.com/privacy/" target="_blank" rel="noreferrer">{ja ? "プライバシーポリシー" : "Privacy policy"}</a></article>
          <article><strong>Google Analytics 4</strong><span>{ja ? "画面導線と利用状況の集計" : "Aggregate navigation and usage measurement"}</span><a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">{ja ? "データ利用について" : "How Google uses data"}</a></article>
          <article><strong>Microsoft Clarity</strong><span>{ja ? "表示崩れ・操作上の詰まりの把握" : "Detecting layout problems and interaction friction"}</span><a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noreferrer">{ja ? "プライバシーステートメント" : "Privacy statement"}</a></article>
        </div>
        <p>
          {ja
            ? "個人情報を販売しません。法令に基づく場合、生命・安全を守るために必要な場合、または上記の委託先が目的の範囲で処理する場合を除き、本人の同意なく第三者へ提供しません。"
            : "We do not sell personal information. We do not disclose it to third parties without consent except where required by law, necessary to protect life or safety, or processed by the providers above within the stated purposes."}
        </p>
      </section>

      <section className="settings-section privacy-policy-section">
        <div className="policy-section-title">
          <BarChart3 size={21} aria-hidden="true" />
          <h2>{ja ? "5. アクセス解析とCookie" : "5. Analytics and cookies"}</h2>
        </div>
        <p>
          {ja
            ? "ログイン維持などに必要なCookieに加え、本番配信ではGoogle Tag Manager経由でGoogle Analytics 4とMicrosoft Clarityを利用します。これらはCookie等を使い、閲覧した画面、操作、端末・ブラウザのおおよその情報を処理する場合があります。"
            : "In addition to cookies required for sign-in and sessions, production delivery uses Google Analytics 4 and Microsoft Clarity through Google Tag Manager. These services may use cookies or similar technologies to process viewed pages, interactions, and approximate device or browser data."}
        </p>
        <p>
          {ja
            ? "MECHORIは利用者ID、メールアドレス、車種、整備本文、ジャーナル本文、検索語、部品番号、費用、画像内容を解析用のカスタム属性として送信しません。Clarityではアプリ全体を明示的にマスクし、画面内容を読めない状態で操作傾向だけを確認します。"
            : "MECHORI does not send user IDs, email addresses, vehicle names, maintenance text, journal text, search terms, part numbers, costs, or image content as analytics custom attributes. The application is explicitly masked in Clarity so that we can review interaction patterns without reading screen content."}
        </p>
        <p>
          {ja
            ? "ブラウザの設定や各事業者のオプトアウト機能でCookieを制限できますが、必要なCookieを無効にするとログイン等が動作しない場合があります。EU・英国・スイス向け提供前に、地域に応じた同意管理を実装します。"
            : "You can restrict cookies in your browser or through provider opt-out tools, although disabling essential cookies may prevent sign-in or other features. Region-appropriate consent controls will be implemented before targeting the EU, UK, or Switzerland."}
        </p>
      </section>

      <section className="settings-section privacy-policy-section">
        <h2>{ja ? "6. AIと入力内容" : "6. AI and user content"}</h2>
        <p>
          {ja
            ? "現在のα版は、愛車・整備・ジャーナル等の入力内容をOpenAIその他の外部AIへ送信していません。将来AI整理を導入する場合は、送信先、目的、対象データ、保存・学習の扱いを明示し、必要な同意や設定を用意してから開始します。"
            : "The current alpha does not send vehicle, maintenance, journal, or other user-entered content to OpenAI or another external AI. Before introducing AI-assisted organization, we will disclose the provider, purpose, data involved, and storage and training treatment, and provide required consent or controls."}
        </p>
        <p>
          {ja
            ? "公開内容であっても、第三者によるAI学習、RAG、外部データセット作成を許可したことにはなりません。"
            : "Even public content does not grant third parties permission for AI training, RAG, or external dataset creation."}
        </p>
        <Link className="text-link" href="/ai-policy">{ja ? "AI学習・データ利用方針を見る" : "Read the AI training and data use policy"}</Link>
      </section>

      <section className="settings-section privacy-policy-section">
        <h2>{ja ? "7. 公開範囲、保存期間、削除" : "7. Visibility, retention, and deletion"}</h2>
        <ul>
          <li>{ja ? "公開範囲は各画面の設定に従います。限定公開・自分のみの情報を公開ページへ転用しません。" : "Visibility follows the setting shown for each item. Limited or private information is not repurposed for public pages."}</li>
          <li>{ja ? "アカウントと入力内容は、α参加中とサービス提供に必要な期間保存します。招待、有効期限、セキュリティログ、バックアップは目的ごとに必要な期間だけ保持します。" : "Accounts and user content are retained while participating in the alpha and for as long as needed to provide the service. Invitations, expiry data, security logs, and backups are retained only as needed for their purposes."}</li>
          <li>{ja ? "削除依頼後も、バックアップ、法令対応、不正防止に必要な情報の削除には合理的な期間を要する場合があります。" : "After a deletion request, removal from backups or records required for legal compliance or abuse prevention may take a reasonable period."}</li>
          <li>{ja ? "α版ではセルフサービスのデータ出力・アカウント削除画面は未実装です。窓口で本人確認後に個別対応します。" : "Self-service export and account deletion are not yet available in the alpha. Requests are handled individually after identity verification."}</li>
        </ul>
      </section>

      <section className="settings-section privacy-policy-section">
        <h2>{ja ? "8. 安全管理と本方針の変更" : "8. Security and policy changes"}</h2>
        <p>
          {ja
            ? "認証情報とアプリデータの分離、利用者別アクセス制御、通信の暗号化、権限の最小化など、規模に応じた安全管理を行います。ただしインターネット上の保存・通信に絶対的な安全を保証することはできません。"
            : "We use safeguards appropriate to the alpha, including separation of authentication and app data, per-user access controls, encrypted transport, and least-privilege access. No internet storage or transmission can be guaranteed absolutely secure."}
        </p>
        <p>
          {ja
            ? "機能、外部サービス、対象地域または法令の変更に応じて本方針を改定します。重要な変更はサービス内その他の適切な方法で案内し、ページ冒頭の更新日を変更します。"
            : "We may update this policy as features, providers, target regions, or laws change. Material changes will be announced in the service or by another appropriate method, and the date above will be updated."}
        </p>
      </section>
    </div>
  );
}
