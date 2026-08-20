# ALPHA_LAUNCH_CHECKLIST

## 凡例

- `[x]` 実装・人間QA済み
- `[~]` 実装済み・人間QA待ち
- `[ ]` 未実装または未完了
- `[-]` 今回対象外・延期・撤回

このチェックリストは、人間QAを省略して実装済み機能を完了扱いにしない。コード、テスト、本番反映、人間QAは別々に確認する。現在のα確認先は `https://mechori-alpha.netlify.app`。

## 1. α開始前

- `[~]` Netlify α URLへアクセスできる
- `[~]` Supabase Authで招待Googleログインができる
- `[~]` 招待URLを複数発行し、同じURLの重複利用を防げる
- `[~]` クルマまたはバイクを登録できる
- `[~]` 車種マスタにない車両を自由入力で登録できる
- `[~]` 写真なし、過去車、複数台を登録できる
- `[~]` プライバシーポリシー、AI・データ利用方針を確認できる
- `[ ]` Global Compliance Review frameworkを確認し、β拡大・国際公開・Native Drive Log・広告・Professional課金の各Gateに対象地域、一次資料、専門家確認の要否を記録する（具体的法令調査は別途）

## 2. テスターの最小フロー

- `[~]` 招待URLからGoogleログインする
- `[~]` P-081B: 招待URLで登録画面の前にMECHORIの説明Landingを確認し、招待tokenを失わずGoogleログインへ進める。無効なURLは安全な案内を表示する
- `[~]` P-081B: 招待経由の新規ユーザーは表示名を保存してから愛車登録へ進み、既存車両がある場合は再登録を強制しない
- `[~]` P-081B: `MECHORI User`の既存ユーザーは名前救済dialogを確認し、「あとで」はそのsessionだけ閉じ、保存直後にGarage・つながり・投稿者表示へ反映する
- `[~]` P-081: 未ログインHomeで「愛車との時間を、記録して、つないで、残していく。」と「MECHORIをはじめる」を確認し、既存ログイン導線と招待URLを維持する
- `[~]` P-081: 初回ログイン後の3ステップ案内を進める／あとで閉じる。別ユーザーへcompletionが引き継がれず、既存車両があるユーザーはGarageへ進める
- `[~]` P-081: Homeの「MECHORIをはじめよう」で愛車、最初の記録、知り合い探しの実データ進捗・各導線・閉じる操作を確認する
- `[~]` 表示名・`@username`・bioを設定する
- `[~]` 愛車を登録し、愛称・所有開始時期・メイン写真を設定する
- `[~]` P-084B: 新規Vehicleは「MECHORI内で見つけられる」が既定ONで、ownerが編集画面からOFF／ONできる。OFF後は検索から消え、外部匿名共有と既存Vehicle Followは変わらないことを確認する
- `[~]` P-086: Garageまたは「記録する」からUniversal Composerを開き、Vehicle、本文のみ、または本文＋写真で保存する。Quick Record初期画面に公開範囲・種別・「詳しく記録する」別入口がなく、保存後にGarage Timelineへ反映されることを確認する
- `[~]` PR #5統合QA: Deploy PreviewでGoogle OAuth後に同じPreviewへ戻り、Logout → Login後もsessionが維持されることを確認する。Productionと正規の`deploy-preview-<digits>--mechori-alpha.netlify.app`以外のoriginは許可しない。
- `[~]` Garage Vehicle Identity: メーカー、車名＋trim、型式・年式、車齢／所有期間／走行距離、Ownerを順に確認する。長い車名は320 / 375 / 390 / 430pxで横にはみ出さず、trim・型式・年式・走行距離等が未入力の場合は「不明」等のplaceholderを表示せず自然に省略する。人間QA待ち
- `[~]` Garageから詳しい記録を、写真なしで保存する
- `[~]` P-085: 整備記録で「自分で作業／お店・工場／不明・記録しない」を選び、既存Provider検索または店名＋市区町村の最小追加を行う。編集後も当時の名称snapshotが維持されることを確認する
- `[~]` 写真・写真説明付きの詳しい記録を保存する
- `[~]` 発生日を正確な日付、年月ごろ、年ごろ、時期不明で保存する（日付入力は作成・編集画面で人間QA待ち）
- `[~]` 詳しいJournal / Maintenanceでは既存Visibility仕様を確認する（Quick Recordでは公開範囲を選ばない）
- `[~]` 新規詳細記録の公開範囲初期値が「α参加者に公開」で、既存のVisibility仕様を確認する（Quick Recordの旧仕様記録。新しい固定公開方針は下記の追補で確認する）
- `[~]` 保存後の完了画面からGarage、投稿詳細、次の記録、ホームへ移動する
- `[~]` 投稿を再読込して、履歴・写真・説明・並び順を確認する
- `[~]` P-077: ホーム、フォロー中、Garage、愛車ページの投稿を初回タップで開き、直接URL・戻る後の再遷移でも投稿詳細を表示する
- `[x]` P-066: 投稿を編集し、本文、日付、写真、関連整備記録を保持したまま保存する
- `[x]` P-051: いいねを追加・解除し、再読込後も状態が維持されることを確認する
- `[x]` P-064: 投稿のお題を選び、対応する書き方ヒントを確認する
- `[~]` ログアウト確認、ログアウト完了、再ログインを行う

## 3. 下書き・失敗時

- `[~]` 入力途中で再読込し、下書き復元の確認が表示される
- `[~]` 下書き復元、削除、新しく書くを選択できる
- `[~]` 写真を含む下書きで、文章復元と写真再選択案内を確認する
- `[~]` 保存失敗時に入力内容と下書きが残る
- `[~]` 保存成功後にだけ下書きが削除される
- `[~]` 保存中にボタンの進行状態が表示され、二重送信されない

## 4. プロフィール・交流

- `[x]` P-061: 投稿者アイコン・表示名から公開プロフィールを開く
- `[~]` 車名・車両画像から車両プロフィールを開く
- `[~]` 本文・余白から投稿詳細を開き、いいね操作では遷移しない
- `[~]` 表示名または`@username`で人を検索する
- `[~]` 「人・クルマを探す」から候補を確認する
- `[~]` ユーザーフォローで全公開車両の投稿がフィードへ反映される
- `[~]` 車両フォローで対象車両だけが反映される
- `[~]` ユーザーフォローと車両フォローを独立して解除できる
- `[~]` 招待者と新規ユーザーがユーザー単位で相互フォローになる
- `[~]` 2ユーザー・複数台で同じ投稿が重複表示されない
- `[~]` 非公開車両、ブロック対象、退会済みユーザーが検索・候補から除外される
- `[~]` 他人のプロフィールで公開車両・公開Journalだけが表示される
- `[~]` P-078: プロフィール画像表示は実機確認済み。認証済みBlob取得方式を維持したままHooks lint違反を修正し、表示回帰は人間QA待ち
- `[~]` AUD-004: private Avatarをsession内cache・single-flightで共有し、変更・削除・logout・ユーザー切替時にinvalidate／clearする。人間QAでは複数画面の再利用、変更直後、削除後、logout後を確認する
- `[~]` P-079: 検索画面ではFABを非表示にし、フォーム末尾の「この条件で探す」、Enter／キーボード検索、送信後の検索結果へのscroll/focus、0件時の記録導線、エラー時の再試行を実装。iPhone Safari人間QA待ち
- `[~]` P-084B（AUD-005）: 外部匿名共有`alpha_public_vehicle_shares`とは別に、active α participantだけが読むVehicle Discovery read modelを使う。既存active α Vehicleは最小フィールドで初期backfillし、新規Vehicleは「MECHORI内で見つけられる」を既定ONとして保存する。ownerは編集画面からOFF／ONを変更でき、OFFは検索対象だけを外し、外部匿名共有と既存Vehicle Followを変更しない。`FIAT`／`Barchetta`／`カブ`検索、Vehicle Follow→Connections反映→解除、owner Followとの独立、inactive・private・block対象の除外を人間QAする。旧版の「今後のVehicleは初期非公開」という記載は、2026-08-12のowner-controlled default ON実装に合わせて訂正した。`バルケッタ`の日本語aliasは別課題
- `[~]` P-080（AUD-002）: フォロー操作が型付きResultを返し、同一対象の処理中重複を防止。Follow解除RPCの曖昧なDELETE条件を対象user IDの明示変数へ修正し、通常ユーザー・管理者とも自分のperson followだけを解除できるようにした。RLSは維持し、P-073の通知はFollow時のみ生成する。migration適用後にConnections／公開Garage／相互フォローを人間QAする
- `[~]` AUD-001／AUD-003: ナビ定義をroute・ラベル・サーフェス・認証／管理者条件・現在地判定へ集約し、認証状態・権限・routeから実際の項目を返す振る舞いテストへ改善。外部UI・route・DB・RLS変更なし。P-075前の基盤整備として人間QA待ち
- `[~]` P-075A: 自分・他人のフォロー中／フォロワー、相互フォロー表示、公開Garageへの遷移、一覧内フォロー／解除、フォロー中のクルマを確認する（本番反映済み・人間QA待ち）
- `[ ]` P-075B: フォロー中／フォロワー一覧の公開・非公開設定
- `[ ]` P-075C: 非公開Garage、フォロー申請、承認／拒否／取消、申請通知、既存フォローの扱い

## 5. 写真・Storage

- `[~]` iPhoneの撮影写真を選択・保存できる
- `[~]` 縦長・横長写真のアスペクト比が維持される
- `[~]` P-076: スマートフォン写真全幅は実機確認済み。キャプションへ左右16pxと上下間隔を追加し、記録本文では写真・本文・見出しの入力順、写真説明の直後表示、縦横比を維持する。PC表示は人間QA待ち
- `[x]` P-069: 既存「近所ドライブ」の写真2枚を別端末で表示する
- `[x]` P-069: ページ再読込後も写真を表示する
- `[x]` P-069: 「再読み込み」で署名URL取得を再実行し表示する
- `[~]` 非公開記録の写真が公開URL・共有版から取得できない
- `[-]` 写真単独の「写真も公開／写真は自分だけ」切り替え

## 6. 運用確認

- `[~]` アプリ内フィードバックを送信し、失敗時に内容が保持される。メニュー表記は「フィードバック」に統一し、入力・完了・管理画面では記録作成FABを表示しない
- `[~]` フィードバックを「良かった／迷った／動かなかった／欲しい／その他」の独立ボタンで選び、運営側で未評価・status・種別・期間を整理する。P-082で対象をGPT用Markdownへ一括コピー／ダウンロードできる（Feedbackは実装要求ではなくEvidence。人間QA待ち）
- `[~]` 管理画面へ管理者だけが入れる
- `[~]` P-085: platform adminが初期OWNERを選択してProvider連携済みOrganizationを作成し、Founding Garage設定、OWNER／STAFF追加・変更・削除を行う。初期OWNERなしでは作成不可、最後のOWNER保護、STAFF read-only、outsider拒否、audit logを確認する
- `[~]` P-085: membershipのあるユーザーだけに事業者スペース導線を表示し、OWNERは管理、STAFFは閲覧のみ行えることを確認する
- `[~]` 非管理者が監査履歴・管理RPCへアクセスできない
- `[~]` Owner Plus／Founding Testerの利用権を理由付きで付与・確認できる
- `[~]` GA4／GTM／Clarityの送信範囲とマスキングを確認する
- `[~]` favicon、Apple Touch Icon、PWA manifestを確認する
- `[~]` P-070 Phase 1: auth後にshellを先出しし、Workspace依存UIを局所loadingへ分離、shared social取得を必要routeへ遅延化した。Home／フォロー中／投稿詳細／Garage／つながりと、検索・フィードバック・管理画面の初期表示を人間QAする。AppContext全面分割とWorkspace JSON正規化は未着手。AUD-004 Avatar cacheは実装済み・人間QA待ち。

## 7. 未実装・延期

- `[~]` P-074 ナビゲーション再設計の試験実装（SPの4項目ナビ、ログアウト時3項目ナビ、ハンバーガーメニュー、記録作成FAB、ガレージのログイン要求表示。人間UX QA待ち）
- `[~]` P-074 PCナビ修正（中央ナビ定義から左サイドバーへ全メニューを統合し、PCのハンバーガー、drawer、overlay、bottom navigation、右下FABを非表示にした。モバイルは既存構造を維持。人間QA待ち）
- `[~]` P-073 Web通知一覧・未読バッジ・個別／一括既読・Like／Follow／新規公開記録eventを実装し、additive migrationを本番αへ適用済み。Web配信後に、本人以外の取得拒否、重複抑止、非公開化後のsafe state、PC／SP badgeを人間QAする
- `[ ]` β中盤のオーナー向けネイティブアプリ着手（αではWebでコア体験を検証し、WebとNativeを二重開発しない）
- `[-]` アプリアイコンの未読件数
- `[-]` AIナレッジの本格提供
- `[ ]` AI翻訳の外部プロバイダー接続と品質確認
- `[~]` ProfessionalのOrganization／membership／Founding Garage最小基盤（P-085、人間QA待ち）
- `[ ]` Professionalの症例庫、工場作成記録、帳票、契約、課金
- `[-]` 決済・広告・有料プランの本番導入
- `[-]` `mechori.com`へのDNS・ホスティング切り替え

## 8. 人間QAの記録

P-069のように本番で再現した不具合は、テスト成功だけを根拠に解決済みとしない。確認日、端末、ログイン状態、対象記録、再読込・再試行の結果、必要な診断コードを所有者の手元へ記録する。Googleアカウント、内部UUID、署名URL、アクセストークンは文書へ記載しない。

## 9. 次のα改善フェーズ再テスト

既存92項目を維持したまま、次のまとまった改善フェーズを以下の順で確認する。

- `[ ]` P-086 Quick RecordをiPhone Safariで実機QAする（入口、本文のみ、本文＋写真、Vehicle選択、詳細設定なしの保存、30秒程度の完了、保存後Timeline反映、入力中の迷い、保存失敗・下書き復元）。
- `[ ]` Garage Timelineの「端末内メディアが見つかりません」を複数投稿で再現確認し、IndexedDB／local Blob／legacy media reference／Supabase media／保存方式差のどこで起きるかと影響範囲を記録する。原因不明のままDONEにしない。
- `[ ]` 未ログインLandingのheader余白、ログイン後headerの視覚的中央、画面間のheader／title／navigation不統一をiPhone優先で確認する。
- `[ ]` GarageをDesign North Starとして、Home、Quick Record、Vehicle Timeline／Record、Journal、Search、Profile／Notificationsの主要journeyで共通Design Languageを確認する。全routeの一括改修やprototype／admin／professionalの同格改修は行わない。
- `[ ]` αテスター3名へ再テストを依頼し、説明なしで記録できるか、記録が面倒でなくなったか、画面移動後も同じサービスに見えるか、また記録したいと思えるかを収集する。
- `[ ]` 再テスト前の最低条件（Quick Record実機動作、media問題の解決または原因・影響範囲の明確化、Headerの目立つ崩れ解消、主要journeyのVisual consistency）を満たしたことを確認する。

このフェーズでは実機QA中の不満を一件ずつ即修正せず、収集後にまとめて優先順位を判断する。P-086、Garage media、Header／Navigation、Design consistencyは、コード完成・自動検証・Preview反映・人間QAを別状態として記録する。

## 10. 2026-08-15 checkpoint追補（当初記録）

- PR #2のGarage Vehicle Identity改善はopen・未mergeで、人間QA待ち。
- PR #3のDeploy Preview OAuth origin許可とsession cookie修正は実装済み・Deploy Preview反映済み。iPhone Safariでのログイン確立は未確認のため、Googleログインを完了扱いにしない。
- Garage timelineの「端末内メディアが見つかりません」再発はP1調査項目として記録する。既存92項目は削除・統合せず、原因と影響範囲の確認後に該当QA項目を更新する。

## 11. 2026-08-15 UX Improvement Pass 追補

- `[~]` P-086 Quick Recordの初期画面をVehicle、本文、任意写真、保存へ絞った。保存後だけ任意の整備情報Bottom Sheetを出し、iPhone Safariで本文のみ／写真付き保存、Close / Skip、追加入力の失敗、keyboard表示中の保存、Vehicle自動選択、Timeline反映を人間QAする。
- `[~]` モバイル共通Headerを左右固定slot＋中央titleへ変更した。未ログインLandingの大きな上部余白、ログイン後のbrand／page titleの物理的な中央、右action追加時の崩れをiPhoneで確認する。
- `[~]` Garage Timelineの旧`local_blob`写真は別端末・別originで復元できない制約を明確化し、本文を妨げない縮退表示へ改善した。新規Quick Record写真、既存共有写真、legacy local写真をそれぞれ確認し、legacy移行が未実装であることを記録する。
- `[~]` 共通Header、authenticated Home、Garage、Quick Record、Journal detailへGarage由来のDesign Languageを限定適用した。Home → Garage → Record → Timelineの一貫性をiPhone SafariとPCで確認する。Search、Profile、Notificationsは優先度B、Admin／Professionalは今回対象外。
- `[ ]` 上記の実機QA後、既存αテスター3名へ再テストを依頼する。評価は「投稿できる」だけでなく、説明なしで記録できるか、画面を跨いでも同じサービスに見えるか、また記録したいと思えるかとする。

## 12. 2026-08-15 Quick Record 写真共有・モバイルQA追補

- `[~]` Quick Recordの写真入口は「写真を追加」一つになった。iPhone SafariとAndroid browserで、OS標準pickerから写真ライブラリ・撮影・ファイル選択を自然に開始でき、同じ写真操作が二重表示されないことを確認する。
- `[~]` 本文のみ、本文＋写真の両方を「α参加者に公開」で保存し、保存直後のGarage Timelineと別session／別deviceの共有表示を確認する。写真付きだけがprivateへ誘導されないことを確認する。
- `[~]` P-086共有写真保存: Quick Recordの公開写真は、事前に正規化した`alpha_inline` Blobをshared Storageの新規insertとして保存し、shared Journal RPC成功後に`alpha_shared`参照をpublishする。iPhone Safariで小さい写真・通常のiPhone写真・private写真を保存し、公開写真だけが別session／別deviceでも表示されることを確認する。失敗時は本文・選択写真・下書きが残り、diagnosticのstage／HTTP status／safe error codeだけを記録する。
- `[ ]` Quick Recordの公開範囲UIが表示されず、保存すると「α参加者に公開」になることを確認する。入力途中で離れた下書きは公開されず、下書き復元後に正式保存した時だけ共有されることを確認する。Maintenance Recordや詳しい記録の既存Visibility選択はこの項目で変更しない。
- `[ ]` Quick Record画面に投稿前の「詳しく記録する」別入口がないことを確認する。「記録する」で本文・任意写真の投稿が先に保存され、保存後の追加入力はoptionalであることを確認する。
- `[ ]` 保存後の追加案内で「整備情報を追加」または「閉じる／スキップする」を選べること、閉じても元投稿が残ること、追加入力に失敗しても元投稿を破壊しないことを確認する。後から記録詳細で追加・編集できることも確認する。
- `[~]` Quick Recordの本文＋写真を「α参加者に公開」で保存し、共有一覧・別session／別deviceで表示されることを確認する。共有写真の失敗時は入力が残り、安全な再試行メッセージになることを確認する。
- `[~]` 保存後の整備情報sheetの日付fieldsetはiPhone Safari再現を受けて幅制約を再修正済み。320 / 375 / 390 / 430pxで日付inputが親幅からはみ出さないことを実機再確認する。既存編集画面、下書き復元／新しく書く／削除／破棄の重要度、keyboard表示時も「記録する」がbottom navigationやsafe areaに隠れないことを確認する。
- `[~]` Garage Timelineで、新規共有写真、既存shared写真、旧`local_blob`写真を区別して確認する。共有写真はJournal detailと同じshared Storage参照を優先してTimelineにも表示されること、旧local写真だけは本文を残した縮退表示になることを確認する。別origin／別deviceでのlegacy回復は未実装P1として記録する。
- `[~]` Home、Garage、Quick Record、Journal detailで画像がcontainer外へ出ないこと、Headerのviewport中央、未ログインLanding上部余白をiPhone Safariで確認する。Landing余白の原因は要確認のままにする。

## 13. 2026-08-15 Authenticated Home Feed QA追補

- `[~]` Authenticated Homeで、投稿一覧が大きなcardの2列gridではなく、owner、Vehicle、date、本文、任意写真、最小metadataの順に読める単列FeedであることをiPhone SafariとPCで確認する。長い本文、複数投稿、写真あり／なし、titleと本文が同じ投稿を含める。
- `[~]` Homeの通常「α参加者に公開」labelと重複した「読む」CTAがFeedを占有せず、Like、投稿詳細、owner／Vehicle link、followers-onlyやprivateなど例外Visibilityの表示が維持されることを確認する。
- `[~]` 月次summaryがFeedより目立たず、各既存導線が動くこと、Homeの「記録する」FABがbottom navigation・safe area・Feed本文を妨げないことを確認する。
- `[~]` Following FeedがAuthenticated Homeそのものであり、数件previewの「すべて見る」へ依存せず続きをscrollできることを確認する。特集Journal、`FROM ALPHA GARAGES`等のdecorative English label、上端accent付きの大きな投稿cardがないことを確認する。Feed-firstが再訪理由になるかは、実機操作とαヒアリングで検証し、実測前にWAU / MAU改善と扱わない。
- `[~]` Home Feedの写真が320px、375px、390px、430px前後のiPhone Safari幅でcontainer・viewportから横にはみ出さず、本文、写真、Like、detail linkがそれぞれ操作できることを確認する。

## 14. 2026-08-19 α Signature Experience

- `[~]` Homeを開き、Reference Garageへ移動せずにDEMO表記付きのcompact History Spineが早い位置で見えること、通常Feedと構造が異なること、架空の利用数・解決率・same-model結果がないことを確認する。
- `[~]` Quick Recordのplaceholderが「愛車に何がありましたか？」で、投稿前にcategoryを選ばず、まだ直していない異音等を本文のみ・写真付きの両方で保存できることを確認する。
- `[~]` 保存直後はneutralなsingle nodeとして表示され、保存後に本人が「不具合・気になること」を選んだ場合だけ「未解決」になることを確認する。診断、修理、結果がなくても保存でき、Closeしても元recordが残ることを確認する。
- `[~]` Home、Quick Record保存後、Garageで同じHistory Spineのline、node、date、type、status、本文のvisual grammarを確認する。320 / 375 / 390 / 430pxで横overflowがなく、320pxのRecord CTAが本文を大きく覆わないことをiPhone Safariで再確認する。
- `[~]` Garageの実recordはchronological historyとして表示され、actual relationがない記録を因果chainに見せないこと、欠損actor／resultを補完しないことを確認する。Reference GarageはDEMO詳細のsecondary routeとして動作することを確認する。
- `[~]` Home Feedの本文と写真が同じcanonical Journal detailへ遷移し、写真からmedia URLや404へ移動しないことをdesktop／iPhone Safariで確認する。
- `[ ]` αテスターへ答えを説明せず、普通のクルマSNSとの違い、保存後に履歴が残った感覚、未対応issueを書けるか、点検・結果も続けて残したいか、Owner／Mechanicを越えて経験が残る価値を自由回答で聞く。
