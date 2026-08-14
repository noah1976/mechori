# AI_CRAWLING_POLICY

## 目的

MECHORIの公開ページは、検索エンジンから必要なオーナーへ届くために使います。一方、オーナーが蓄積したJournal、整備記録、写真、構造化ナレッジを、第三者がAIモデル、外部ナレッジベース、データセットの原料として無断利用することは許可しません。

「公開」は閲覧と共有の範囲を示すものであり、AI学習、Text and Data Mining（TDM）、大量取得、再配布への包括的な許諾ではありません。

## 利用区分

### 許可する

- 正式公開後の公開ページを、通常の検索結果へ索引する。
- 検索順位付け、ページ名、短い抜粋、サムネイル、MECHORIへのリンクを表示する。
- 個人がブラウザで通常閲覧し、法令と利用規約の範囲で共有・引用する。
- 投稿者本人が、自身に権利のある原文や画像を利用する。

### 事前許諾なしに許可しない

- 生成AI・基盤モデルの事前学習、追加学習、微調整、蒸留、評価。
- AIモデル向けの合成データ、ベンチマーク、評価用正解データの作成。
- Embedding、RAG、外部検索索引、外部ナレッジベースへの恒久保存。
- AI回答がMECHORIの閲覧を代替する目的で行う自動収集。
- Journal、整備記録、写真、部品情報、車両情報の大量取得、データセット化、再配布、販売。
- robots.txt、アクセス制御、レート制限、公開範囲を回避する取得。

## 環境別方針

### 少人数α

- 一般検索、AI検索、AI学習を含むすべての自動クローラーを拒否する。
- HTMLメタデータ、`robots.txt`、`X-Robots-Tag`で`noindex`を示す。
- 共有URLはテスター間の明示共有に限り、検索流入を目的にしない。

### 正式公開後

- 公開を明示したページだけを通常検索へ許可する。
- 認証、Garage、非公開整備記録、入力、設定、モデレーション画面は検索対象外にする。
- 既知のAI学習クローラーを拒否する。
- AI回答・AI検索専用クローラーは、送客、表示範囲、保存、学習不使用を個別評価してから許可する。当初は拒否する。
- クローラー名とProvider方針を定期的に見直す。

## 技術的な意思表示

- `robots.txt`で、環境とUser-Agentごとの許可・拒否を表明する。
- 正式公開時も既知の通常検索クローラーだけを許可するallowlistを基本とし、未確認の自動クローラーは既定で拒否する。
- α環境では`X-Robots-Tag`とHTML metadataでも索引拒否を表明する。
- 全環境で`TDM-Reservation: 1`を返す。
- `/.well-known/tdmrep.json`でサイト全体のTDM権利留保を表明する。
- 公開ページに、人間が読める日英の方針を表示する。

TDM Reservation ProtocolはW3C Community Groupの仕様であり、W3C標準ではありません。robots.txtやTDM信号も、悪意ある取得者を技術的に停止するアクセス制御ではありません。利用規約、公開データの最小化、レート制限、ログ監視、異常取得への対応を組み合わせます。

## Google検索の制約

Googleは、通常検索と検索内のAI機能に同じGooglebotの制御を使います。Google検索への掲載を維持したまま、AI Overviews等だけを完全に拒否する独立スイッチはありません。`nosnippet`等で利用範囲を狭めると検索結果の説明文も失われ、流入を損ないます。

そのため正式公開時は次を採用します。

1. Googlebotによる公開ページの通常検索索引は許可する。
2. `Google-Extended`は拒否し、Google検索以外の一部AI学習・grounding利用を拒否する。
3. Search Consoleで表示・流入を計測し、AI検索による代替表示がMECHORIの目的を損なう場合は、抜粋制御を再検討する。

## 公開情報の最小化

検索流入を得るために、整備記録全文や個体履歴全文を公開する必要はありません。正式公開時は次を検討します。

- 症状・車種・年式範囲・確認状態・安全上の注意を検索可能にする。
- 詳細な経過、根拠比較、個体履歴との照合はMECHORI内で提供する。
- 写真、位置、正確な日付、費用、所有者情報は、本人の公開選択と検索価値を確認して最小化する。
- 検索用ページとユーザーが投稿した原文の公開範囲を分離する。

検索向けに内容を意図的に薄くして誤解を生むことは避けます。公開する要約にも、確認状態、未解決、反対結果、安全上の注意を残します。

## 公開前の法務・運用確認

- 利用規約と投稿規約に、AI学習、TDM、外部ナレッジ化、大量取得、再配布の禁止を明記する。
- 投稿者からMECHORIが受ける利用許諾を、サービス表示・検索索引・内部ナレッジ生成に必要な範囲へ限定する。
- 投稿者が第三者素材を無断でAI学習禁止として主張しないよう、権利保有確認を設ける。
- 著作権法上の例外、各国のTDM例外、EU DSM Directive Article 4の権利留保方法を専門家へ確認する。
- クローラー違反の連絡先、証拠保全、拒否、削除要請、アクセス遮断の手順を用意する。

## 参照した一次資料

- OpenAI, Overview of OpenAI Crawlers: https://developers.openai.com/api/docs/bots
- Anthropic, Does Anthropic crawl data from the web?: https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler
- Google Search Central, AI Features and Your Website: https://developers.google.com/search/docs/appearance/ai-features
- Apple, About Applebot: https://support.apple.com/en-us/119829
- Common Crawl, CCBot: https://commoncrawl.org/ccbot
- W3C Community Group, TDM Reservation Protocol: https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/
