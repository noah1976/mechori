# PROJECT_STATE

## 現在地

2026-07-13時点で、MECHORYは初期設計からローカルプロトタイプ検証へ進みました。

`codex/local-prototype` ブランチに、Next.js、TypeScript、npm workspaces、localStorage DataProviderを使ったモバイルファーストのWebプロトタイプを実装しました。Supabase、Vercel、OpenAI API、OCR、決済、広告、本番環境には接続していません。

## 実装済み

- `docs/USER_STORIES.md` に初期MVPのユーザーストーリーを定義
- ホーム、My Garage、整備履歴、記録詳細、追加・編集、検索、インポート予告
- 日本語・英語の基本UI切り替え
- 非公開、運営確認待ち、公開の状態表現
- `LOW`、`CAUTION`、`CRITICAL` の安全表示
- 出典、確認状態、解決状態、車両一致範囲の表示
- localStorageへの追加・編集内容の保存とDEMOリセット
- `packages/core`、`packages/shared`、`packages/i18n` への共通関心事の分離
- lint、型チェック、単体テスト、production buildの成功
- 390 x 844と1440 x 900での表示確認
- 非公開記録の追加、再読み込み後の保持、検索、日英切り替えのブラウザ操作確認
- ブラウザコンソールの警告・エラーがないことの確認
- `docs/SCREENS.md` に検索・取込中心の主要画面とフローを定義
- `docs/DATA_MODEL.md` に整備イベント、複数作業、取込下書き、共有ナレッジの概念モデルを定義
- `docs/IMPORT_PIPELINE.md` に原本取得から確認・非公開保存・原本削除までの工程を定義
- `docs/PLAN_ENTITLEMENTS.md` にFree、Owner Plus、Professionalの初期権限仮説を定義
- `docs/CONTRIBUTION_INCENTIVES.md` に個人便益、履歴評価、バッジ、SNS共有の原則を定義
- `docs/TRUST_AND_VERIFICATION.md` に虚偽対策、証拠、訂正、反証、AIの根拠制限を定義
- メーター交換等を扱う`OdometerEpisode`、表示値、推定累積距離を分離し、逆行を虚偽扱いしない型とテストを追加
- プラン名に画面を密結合させない`EntitlementSet`と権限テストを追加

## 直近の目的

1. `MECH-004 危険領域タグ` を定義する。
2. 初期概念モデルをTypeScriptの型へ反映し、1イベント複数作業と複数メーター期間のローカル操作を実装する。
3. 症状検索の出力契約を、根拠・反例・一致範囲・安全警告を必須にして設計する。
4. 実物資料が用意できた時点で、3〜5ページとナンバーが写る画像を使って取込・マスキング設計を検証する。
5. 検索・取込中心の画面責務を基に、現行プロトタイプのUIを再設計する。

## ブロッカー

- 初期アカウント方式が未確定。
- FIAT Barchettaの仕様分類粒度が未確定。
- 初期管理者運用が未確定。
- ロゴ、カラー、タイポグラフィはプロトタイプ用の暫定値で、所有者確認が必要。
- 外部サービス導入はチェックリストと所有者承認までBLOCKED。

## 作業上の注意

- DEMOデータを実在する整備情報として扱わない。
- localStorageを本番データストアとみなさない。
- 新規記録は非公開を初期値とし、共有操作は運営確認待ちへ送る。
- 不明点を勝手に補完せず、所有者判断が必要な事項を記録する。
- 所有者の承認なしに外部接続、有料契約、本番設定、秘密情報登録を進めない。
