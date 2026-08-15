# MECHORI Project State

- 更新日時: 2026-08-15
- 対象ブランチ: `codex/quick-record-composer`
- HEAD基準: 本書を含む現在ブランチの`git log -1`を正とする
- 本番URL: `https://mechori-alpha.netlify.app`
- 状態文書のルール: 実装、テスト、本番反映、人間QAを別々に判定する。コード、テスト、Git履歴、既存の運用記録を照合し、根拠のない項目は完了にしない。本書を現在の実装状態の正本とする。

## 1. 現在テスターが利用できる主要フロー

招待URLからGoogleログインし、クルマまたはバイクを登録する。車種マスタにない車両、写真のない車両、過去に所有していた車両も登録を開始できる。記録開始時はVehicle、本文、任意の写真だけで保存でき、日付、公開範囲、種別、整備情報は必要なときに追加する。詳しいJournal形式と構造化整備記録は明示的な詳細導線として維持する。

保存後は車両の時間軸、Garage、フィードで履歴を振り返り、投稿へのいいね、投稿者プロフィール、車両プロフィール、人・クルマ検索、ユーザー／車両フォローを試せる。プロフィール設定、ログアウト、フィードバック、管理者向け運用画面も実装されている。下書きはブラウザ内に保存され、保存成功後に完了画面からGarage、投稿詳細、次の記録、ホームへ進める。

## 2. SHIPPED_VERIFIED

以下は、実装・テスト・本番反映に加えて、今回報告された人間による本番実機QAまで確認済みです。

- **P-051 いいね追加・解除**: 一覧・詳細で追加、再読込後の維持、解除を確認済み。
- **P-061 投稿者から公開ガレージへの遷移**: 投稿者アイコン・表示名から正しい公開プロフィール／Garageへ遷移することを確認済み。
- **P-064 投稿のお題・書き方ヒント**: 固定お題の表示、選択後の既存投稿画面、ヒント表示を確認済み。
- **P-066 写真付き詳しい記録の編集保存**: 写真付き既存記録の編集保存を確認済み。
- **P-069 既存共有写真の保存後表示**: 保存済み共有写真が本番で表示されることを確認済み。過去のStorage 403を踏まえた再読込・再試行経路も含め、今回のQA結果を反映した。

## 3. SHIPPED_NEEDS_QA

実装、関連テスト、現行α配信への反映までは確認できるが、人間による本番実機確認が残る項目です。

### 投稿・記録

- **P-086 Quick Record / Universal Composer MVP**: αテスターが従来の記録フォームを面倒と感じ、知見の投稿自体を止めていたP1に対し、入力原則を「まず書ける。整理はあと。」へ更新した。`/journal/new`と車両文脈の記録入口は、Vehicle、本文、任意の写真、「記録する」を最初に示すComposerを既定とする。本文の先頭行を既存`GarageJournalPost`の内部titleへ安全に反映し、event typeは`other`、発生日は当日、公開範囲は既存の既定値で保存する。日付、公開範囲、種別、DIY／お店・工場は折りたたんだ詳細設定へ置き、既存の詳しいJournal、構造化整備記録、写真保存、公開範囲、下書き、完了導線、Garage Timelineのdata contractを変更しない。AI構造化は将来候補で今回未実装。実装・自動検証後、iPhone Safariで本文のみ、本文＋写真、複数台選択、詳細設定、保存後のTimeline反映、保存失敗・下書き復元を確認するまでSHIPPED_NEEDS_QAとする。
- **P-077 投稿詳細の断続的404**: 投稿一覧の詳細リンクを同じエンコード済みURLへ統一し、Next.jsの推測的な事前遷移を使わないようにした。共有記録のバックグラウンド取得中と取得失敗を、記録不存在と分離して待機・再読み込みできる。実装・回帰テスト・本番反映済みで、人間QAではホーム、フォロー中、Garage、愛車ページからの初回タップと直接URLを確認する。
- **写真公開範囲の統一**: 写真単独の公開切り替えUIを撤去し、記録本文の公開範囲から写真の共有可否を導出する実装・テストがある。人間QAでは非公開、α参加者向け、公開停止後の写真アクセスを確認する。
- **P-071 下書き**: 既存フォームの入力をユーザー・入口・編集状態ごとにlocalStorageへdebounce保存し、復元・破棄・期限切れ・破損JSONをテスト済み。人間QAでは再読込、別ユーザー、写真再選択案内を確認する。
- **P-072 完了導線**: 保存成功後だけ完了画面を表示し、車両名・愛称・タイトル、Garage、投稿詳細、次の記録、ホームへの導線を実装・テスト済み。人間QAでは二重送信と保存失敗時の遷移を確認する。
- **P-076 記録本文内の写真表示改善**: スマートフォンの写真全幅表示は実機確認済み。今回、全幅を維持したまま写真直下のキャプションへ左右16px、上下間隔、補助テキスト相当の文字サイズと折り返しを追加した。PCの写真幅とキャプション位置は人間QA待ちのため、SHIPPED_NEEDS_QAを維持する。
- **通常投稿・さっと記録・詳しい記録**: 各保存経路と、車両時間軸・フィードへの反映を実装。人間QAでは同じ車両で3経路を順に試し、保存後に履歴が育つことを確認する。

### プロフィール・交流

- **公開プロフィール、username、bio**: 表示名、`@username`、bio、公開車両、公開Journalを表示・編集する実装と識別テストがある。人間QAでは自分・他人・未設定username・非公開項目を確認する。
- **ユーザーフォロー、車両フォロー、招待者との相互フォロー**: ユーザー単位と車両単位を分離し、招待時のユーザー相互フォロー、解除の独立性、既存フィード反映を実装・テスト済み。人間QAでは複数台所有、乗り換え、同一投稿の重複表示がないことを確認する。
- **P-084B Discovery Search zero-result regression（AUD-005）**: 人間QAで`FIAT Barchetta`と`HONDA スーパーカブ110/JA59`が0件となった。本番読み取り調査で、両方ともactive α participantのprivate workspaceには存在する一方、匿名外部共有用`alpha_public_vehicle_shares` snapshotが無く、P-084の検索条件から脱落していたことを確認した。`alpha_member_vehicle_discoveries`を外部shareと完全に分離したα限定read modelとして追加し、既存active α participantのVehicleを最小フィールド（make、model、nickname、year）だけでbackfillする。P-084 follow-upで新規Vehicleはownerの`memberDiscoveryEnabled`を既定ONで保存し、作成・編集画面の「MECHORI内で見つけられる」からowner本人だけがON/OFFできるようにした。OFFは検索対象だけを外し、既存Vehicle Follow、Connections、公開記録通知、外部匿名共有を変更しない。認証済みactive α participantだけが検索・Garage表示・Vehicle Followに利用でき、private workspace、email、VIN、位置、記録、外部匿名公開状態は返さない／変えない。`FIAT`、`Barchetta`、`カブ`は保存済み文字列で検索対象とするが、日本語別名が未保存の`バルケッタ`は今回のsubstring検索では対象外として別課題に残す。人間QA前はSHIPPED_NEEDS_QAとして扱う。
- **投稿・車両・プロフィールのリンク分離**: 投稿カードと詳細の各操作を実装・テスト済み。人間QAでは投稿者、車両、本文、いいねの各タップ先を確認する。

### 車両・基本UX

- **P-081 初回Activation / Onboarding**: 招待URLや初回訪問でサービス目的と次の行動が分からないP1課題に対し、未ログインHomeの短い価値説明と「MECHORIをはじめる」、認証後の3ステップ案内、実データ連動の「MECHORIをはじめよう」チェックリストを実装した。completion／dismissはprofile ID単位のlocalStorageで保持し、Workspace／social loadingを未完了と誤認しない。実装・自動検証・本番反映後も人間QA前はSHIPPED_NEEDS_QAとして扱う。
- **P-081B Invite Activation + First Profile Setup**: 招待URLは登録画面へ直行せず、URLフラグメント内の既存tokenを維持した説明Landingを経由する。Landingはサービスの目的と3つの価値を伝え、既存のGoogle認証・invite cookie・return-toへ接続する。新規ユーザーは表示名を必須で保存してから愛車登録へ進み、既存の`MECHORI User`はsession内で再表示しない救済dialogから名前を更新できる。プロフィールRPCとAppContextの更新を再利用し、保存後は同一session内の表示名を即時更新する。DB・RLSは変更していない。人間QA前のためSHIPPED_NEEDS_QAとして扱う。
- **P-082 管理フィードバックのGPT用Markdown一括出力**: 既存の管理フィードバック全件取得を再利用し、検索語・status・種別・期間で一覧と一致する対象を絞り込み、「GPT用に一括コピー」と「Markdownをダウンロード」を同一generatorへ統一した。出力は古い日時から安定ソートし、GPTにはFeedbackを実装要求ではなくEvidenceとして重複・優先度・採否候補・追加調査を整理させるinstructionを先頭付与する。email等の不要な個人情報は出力せず、status変更・DB・RLS・RPC schemaは行っていない。自動検証後、人間QA前のためSHIPPED_NEEDS_QAとして扱う。
- **P-073 Web通知センター**: Like、新規Follower、Follow中の人または車両による新しい公開記録をsource eventとするprivate通知table、本人専用RPC、20件単位の一覧、個別／一括既読、PC／SP未読badgeを実装した。通知生成はDB trigger内で行い、browserから任意recipientへINSERTできない。人と車両の両方をFollowする場合も`recipient + record`で1件へdedupeし、非公開・削除・権限外の記録情報は一覧RPCで返さない。additive migrationは本番αへ適用済みで、Web反映後の人間QA前はSHIPPED_NEEDS_QAとして扱う。Push、Email、Realtimeは未実装。
- **初回車両登録の簡略化、写真なし登録、バイク・過去車、所有開始時期、愛称、メイン写真**: 未登録車種・不明項目を含む段階的登録と編集を実装・テスト済み。人間QAではクルマ、バイク、複数台、過去車、写真なしを確認する。
- **Garage Visual Pilot v2（Design Direction v1）**: `/garage`を「登録車両を管理する画面」からVehicle、Owner、Historyを見返すLiving Vehicle Historyへ再構成した。v2では大判のVehicle photo、写真と重なるidentity sheet、所有時間をidentityとして読む構成、単一の記録CTA、整備／思い出を同じchronological spineで読むtimelineへ置き換えた。初回Human QAを受け、make／model／任意gradeの階層表示、Garage上のFAB非表示、Hero surfaceのcard感削減を追加した。写真なしでも年式・make・model・所有時間から静かに成立し、card・border・eyebrow・同格CTAをさらに削減している。Taste SkillのDesign Guidanceを適用した。Vehicle、Record、Follow、Notification、visibility、workspaceのdata contractは変更していない。自動検証後もiPhone／PCの人間QA前はSHIPPED_NEEDS_QAとし、他画面への展開はPilot QA後に判断する。
- **P-078 プロフィール画像の主要画面表示**: private Storageの認証済みダウンロードから生成したBlob URLで表示する方式は実機確認済み。共通AvatarのHooks lint違反を修正し、今回AUD-004のsession cacheを接続した。表示回帰の人間QA前はSHIPPED_NEEDS_QAとして扱う。
- **AUD-004 Avatar Session Cache**: private Avatarのsession内cache、同一pathのsingle-flight、変更・削除・logout・ユーザー切替時のinvalidate／clear、Blob URL lifecycleを実装・自動検証した。人間QA前のためSHIPPED_NEEDS_QAとして扱う。
- **P-079 検索実行導線の明確化**: 検索画面ではグローバルFABを非表示にし、条件フォーム末尾へ「この条件で探す」を配置して、クリック・Enter・キーボード検索を同じsubmit経路へ統一した。検索結果0件の記録導線と、再試行可能なエラー表示を分離している。実装・テスト・本番反映後も人間QA前のためSHIPPED_NEEDS_QAとして扱う。
- **P-080（AUD-002）フォロー操作の結果契約**: フォロー処理を成功・失敗の型付きPromise Resultとして返し、同一対象の処理中重複を抑止する。認証・権限・通信・未知の失敗を安全な分類へ変換し、ユーザー／車両の対象キーを分離した。Follow解除時に`set_alpha_user_follow`のPL/pgSQL変数と列名が衝突してDELETE条件が曖昧だったため、対象user IDを明示変数へ分離して通常ユーザー・platform super adminとも自分の関係だけを解除できるよう修正した。通知triggerはINSERT時だけでUnfollow通知は生成しない。RLSは維持し、additive RPC migrationの本番適用と人間QA前はSHIPPED_NEEDS_QAとして扱う。
- **AUD-001／AUD-003 ナビゲーション基盤**: route、ラベル、アイコン、サーフェス、認証・管理者条件、現在地判定、準備中状態を宣言的な定義へ集約し、モバイル、PC、ドロワーから共通利用する。認証状態・権限・routeを入力した純粋関数の振る舞いテストへ改善した。外部UI、route、DB、RLS、認証方式は変更していない。P-075前の基盤整備であり、人間QA前はSHIPPED_NEEDS_QAとして扱う。
- **P-074 PCナビ修正・フィードバックUI**: PCは中央ナビ定義から左サイドバーへ主要導線・補助導線・管理者導線を生成し、hamburger、drawer、overlay、mobile bottom navigation、global FABを表示しない構成へ整理した。モバイルの既存導線は維持し、フィードバック表記と種別選択ボタンも統一した。外部UIの本番実機確認前のためSHIPPED_NEEDS_QAとして扱う。
- **ログアウト確認・完了画面**: 保護画面からのログアウト確認と公開ホームへの完了遷移を実装。人間QAでは保存中・未保存状態を含めて確認する。
- **写真アスペクト比、iPhone写真入力、フィードバック、favicon／Apple Touch Icon／PWA**: 実装と関連コード・テストを確認済み。人間QAではiPhone撮影写真、縦横比、アイコン表示、フィードバック失敗時の再試行を確認する。

### 運営基盤

- **管理画面、管理者ロール、監査ログ、Owner Plus利用権、Founding Tester付与**: UI、RPC、監査履歴、利用権の実装と関連マイグレーションを確認済み。人間QAではowner/adminと非管理者の境界、理由入力、別利用者の拒否を確認する。
- **P-085 Professional / Service Attribution β基盤**: 実在拠点を表す`service_provider`とMECHORI上の管理主体`professional_organization`を分離し、多対多membership（OWNER／STAFF）、OrganizationへのFounding Garage資格、Provider連携、platform adminによるmembership不要の管理をadditive schemaとRPCで実装した。Organization作成は初期OWNERを必須とし、Organization rowとactive α participantのOWNER membershipを同一trusted transactionで作成するため、OWNER 0人のOrganizationを残さない。整備記録にはversionedな`serviceAttribution`（DIY／お店・工場／不明）と当時のProvider名・市区町村snapshotを保存し、旧Recordは読取時に不明として互換化する。ユーザー追加Providerは未確認候補であり、User Recordのownershipや確認状態はOrganizationへ移らない。Claim、重複merge、Provider確認、工場作成記録、実績Discoveryは未実装。人間QA前はSHIPPED_NEEDS_QAとして扱う。
- **GA4／GTM／Clarity接続準備**: コードと運用文書上の接続準備はある。人間QAでは本番計測の送信範囲、マスキング、イベント発火を管理画面と実機で確認する。

## 4. PARTIAL／OPEN

- **AI翻訳**: 原文言語と翻訳導線はあるが、実運用の自動翻訳、品質確認、費用・送信範囲の確定は未完了。
- **Professional**: P-085でOrganization、Provider、OWNER／STAFF、管理UIの最小基盤を実装した。症例庫、工場作成記録、顧客案件、帳票、契約、課金は未実装。
- **Founding Garage**: P-085でOrganizationへの資格付与とProvider／複数Member連携を可能にした。実在工場の事業者確認、契約、entitlement詳細、共同開発運用は未着手。
- **P-070 初回表示速度**: Phase 1として、auth確定後にAppShellとroute shellを表示し、Workspaceは依存UIだけで待機・再試行するよう分離した。共有socialの4読取はHome、フォロー中、共有記録詳細、公開Garageで必要時にsingle-flight取得し、Feedback、Admin、設定、検索初期表示では待たない。AppContext全面分割とWorkspace JSON正規化は未着手で、本番の性能QA前のため全体はPARTIALとして扱う。AUD-004のAvatar cacheは別途実装済みだが、人間QA待ちである。
- **P-074 ナビゲーション再設計**: 4項目の下部ナビ、ハンバーガーメニュー、記録作成FAB、ログアウト時の3項目ナビとガレージのログイン要求表示を反映。P-075Aでつながりを実画面化し、P-073も今回のmigration適用後に通知実画面へ切り替わる。ナビゲーション自体は人間の実機UX確認前のためSHIPPED_NEEDS_QAとして扱う。
- **P-075A つながり**: 自分と他人のフォロー中／フォロワー、双方向フォローから導出する関係状態、公開Garageへの遷移、一覧内フォロー／解除、自分がフォローした車両の一覧を実装した。取得は既存のユーザーフォローとWorkspace内の車両フォローを再利用し、active member・公開中車両・ブロック境界だけを返す追加の読み取りRPCを使う。本番DB適用とα配信は完了したが、人間QA前のためSHIPPED_NEEDS_QAとして扱う。
- **P-075B／P-075C つながりの公開設定・非公開Garage／フォロー申請**: OPEN。フォロー一覧の公開範囲、非公開Garage、申請・承認・取消・通知、既存フォローの移行は今回実装しない。
- **ネイティブアプリ**: αではWebコア体験を固め、β中盤にオーナー向けNative版へ着手する必須ロードマップ。現時点では未実装。
- **初期計測の本番運用**: 指標定義とコード準備はあるが、MAU最小計測のDB適用・環境設定・実データ確認は別の運用作業として残る。

## 5. DEFERRED／WITHDRAWN

### DEFERRED

- Web Push、プッシュ通知、アプリアイコンの未読件数。オーナー向けネイティブアプリ自体はβ中盤着手の必須ロードマップとして、別途実装計画を進める。
- AIナレッジ、根拠付き集合知要約、AIによる本格的な故障整理。
- Professionalの完全実装、工場間相談、帳票DX、課金。
- 決済、広告、有料プランの本番導入。
- `mechori.com`へのDNS・ホスティング切り替え。現行αの確認先はNetlify URLを維持する。

### WITHDRAWN

- 写真単独の「写真も公開／写真は自分だけ」切り替え。写真の公開範囲は記録本文に従う。
- 公開ユーザー名を内部リレーションや外部キーとして使う設計。内部は不変IDを使う。
- αでのWeb全体への無条件公開。現行の共有範囲はMECHORI利用者・α参加者向けの明示的な範囲に限定する。

## 6. 次の優先順位

1. P-086のiPhone Safari QA（Vehicle、本文のみ、本文＋写真、複数台選択、詳細設定、保存後のTimeline、下書き・失敗時の維持）。
2. P-081／P-081Bの本番実機QA（未ログインの5秒理解、招待Landing、Google認証後の表示名設定、既存`MECHORI User`救済、チェックリスト進捗）。
3. P-079の本番実機QA（検索フォーム末尾ボタン、FAB非表示、Enter、0件・エラー表示）。
4. P-084Bの本番実機QA（`FIAT`／`Barchetta`／`カブ`でα限定Vehicleを検索し、検索結果からVehicle Follow／解除、Connections反映、owner Followとの独立、外部共有状態が変わらないことを確認）。`バルケッタ`の日本語aliasは別課題。
5. P-074の本番実機UX確認（4項目ナビ、メニュー、FAB、safe area）。

## 7. 最近の主要コミット

- `43b926c` `feat: preserve post drafts and improve completion flow`: P-071下書き保存・復元、P-072完了画面と次導線。
- （今回）P-074 ナビゲーション再設計の試験実装: 4項目ナビ、メニュー、記録作成FAB、準備中画面。
- `fcb366b` `perf: reduce initial page loading work`: ログイン後初回Hydrationの取得整理。
- `a85fd52` `feat: improve post discovery and author navigation`: P-061投稿者導線、P-064投稿のお題、発見導線。
- `2366f68` `fix: stabilize post likes`: P-051いいねの楽観更新、ロールバック、二重送信抑止。
- `3d9be76` `fix: isolate storage profile access policy`: 共有Storageのアクセス境界整理。
- `26a5b3a` `fix: align shared photo access with member visibility`: 共有写真の参加者可視性整理。
- `ab7f9d6` `fix: save edited detailed records with photos`: P-066編集保存と安全なエラー表示。
- `6f3d656` `fix: align journal photos with record visibility`: 本文と写真の公開範囲統一。
- `2488bb2` `feat: add alpha profile images and faster hydration`: プロフィール画像と初期取得改善。
- `7c2955f` `feat: expose alpha admin audit history`: 監査履歴UIと運用基盤。

## 8. 既知の懸案事項

- 本文保存成功と写真表示成功は別経路である。P-069は今回の本番実機QAで保存済み写真の表示を確認済みだが、Storage変更時は同じ取得経路を回帰確認する。
- P-070 Phase 1はコード・テスト完了後に本番QAが必要である。初回auth後のshell表示、Home／フォロー中の共有記録読込、Garage／つながりの局所loading、Feedback／Admin／検索初期表示がshared social読取を待たないことを確認する。AppContext全面分割とWorkspace JSON正規化は未着手である。AUD-004のAvatar cacheは実装済みだが、人間QA待ちである。
- 下書きはブラウザ・ユーザー・投稿入口単位で保存され、写真バイナリは保存しない。写真が復元できない場合は再選択が必要になる。
- αの共有は一般Web公開ではない。記録本文、写真、車両プロフィールごとの公開範囲を混同しない。
- 車両カタログ協力、計測DB、管理者権限境界など、コードとDBの適用状態が分かれる項目は、適用履歴と人間QAを別に記録する。
- Founding Garageの資格、工場内role、platform super adminはP-085の最小基盤として実装済みで、人間QA待ちである。事業者確認、契約、entitlement詳細、Professional業務機能は未適用である。
- 基本体験は無料を原則とし、AI/OCRの通常利用、利用枠、推定原価、失敗時の非消費、super adminによる追加・免除をβで計測する。実際の上限利用者が現れるまで本格決済は急がない。
- P-074のPCナビ二重化は解消済みで、人間UX QA待ちである。画面全体のVisual Direction再設計は別途扱う。
- 現行の状態棚卸しではテスト・build・デプロイを再実行していないため、この更新自体は新しい動作保証を追加しない。

## 9. Global Compliance Review

`docs/GLOBAL_COMPLIANCE.md`に、Japan、EU / EEA、United Kingdom、United States、Australia、Canadaを初期対象とするGlobal Legal / Safety Compliance Reviewの追跡基盤を追加した。これは法令調査や法的結論ではなく、一次資料から地域別要求をProduct Requirement、設計、実装、検証、専門家レビューへ接続するための文書フレームワークである。より広い国際公開、Native Drive Log、広告、Professional課金の前にReview Gateを通す将来必須項目として扱う。具体的な年齢制限、地域別要件、法的適用可否は未確定であり、現在のαを停止扱いにしない。

## 10. 2026-08-15 Documentation Checkpoint

- **基準とリリース運用**: `main`をProduction基準とし、feature branch → Pull Request → Netlify Deploy Preview → 人間QA → `main`の順で確認する。確認目的のProduction deployは繰り返さない。今回のcheckpointは`origin/main`（`a01eb18`）を基準にした文書専用branchであり、コードは変更していない。
- **PR #2**: `codex/garage-vehicle-identity`のGarage Vehicle Identity改善はopenのままで、`main`へ未merge。人間QA待ちとして扱う。
- **PR #3**: `codex/deploy-preview-auth`はopen。`0928fb3`のDeploy Preview origin許可と、`f982c7a`のOAuth callback session cookie保存を含む。最新Deploy Preview `https://deploy-preview-3--mechori-alpha.netlify.app`はNetlify checkが成功しHTTP 200を返すが、iPhone SafariのGoogleログイン実機QAは未完了である。
- **新たに判明したP1**: Garage timelineの一部で「端末内メディアが見つかりません」が再発している。Storage、端末内メディア、再読込・logout・別端末時の境界を調査し、原因を特定するまで解決済みと扱わない。現時点ではデータ損失や全利用者への影響範囲は要確認である。
- **P0/P1/P2**: 新規P0は確認されていない。P1は上記のGarage media再発、PR #3のiPhone Safari OAuth QA、既存α機能の本番実機QAである。P2はP-075B/C、Native、AI本格提供、Professional課金等の既存Deferred項目で、今回変更しない。
- **次の確認**: まずGarage media再発の再現条件と影響範囲を記録し、並行してPR #2／#3の人間QA結果をチェックリストへ反映する。原因不明のまま項目をDONEへ移さない。

## 11. 2026-08-15 Quick Record Checkpoint

- **優先理由**: αテスター3名が現在の記録入力を面倒と感じており、MECHORIの重要資産である知見・愛車の記録の流入を妨げている。P-086はGarage Visual展開より先に、投稿開始の認知負荷を下げる。
- **決定済みの最小入力**: Vehicle、本文、任意の写真、記録する。分類、タイトル、走行距離、部品、費用、Providerなどは初回に必須にしない。保存後または詳細設定で追加するProgressive Disclosureを基本とする。
- **実装状態**: `codex/quick-record-composer`は`origin/main`を基準に、PR #4の文書commit `e8af299`をcherry-pick（`b6c4112`）して開始した。Quick Record実装commitは`9f6f5fe`で、PR #5としてopen・未merge。PR #2とPR #3のコードは取り込まず変更していない。Deploy PreviewとiPhone Safari実機QAは未完了である。
- **既知P1**: Garage timelineの「端末内メディアが見つかりません」再発はQuick Recordとは別のP1として残す。今回の写真経路で明確な原因が見つかった場合だけ関連を追記する。

## 12. 2026-08-15 次のα改善フェーズ

- **現在状態**: PR #5 `codex/quick-record-composer`はopen・未merge。Quick Record実装、PR #4相当のdocumentation checkpoint、PR #3のDeploy Preview OAuth／callback session cookie修正を同じbranchへ取り込んだ。統合後の最新commitは`0bf985d`。PR #3自体はopenのままで、`main`へは未merge。
- **Preview確認**: `https://deploy-preview-5--mechori-alpha.netlify.app`は表示可能。Supabase AuthenticationのRedirect URLsへDeploy Preview callback wildcardを追加済みで、iPhone SafariからGoogleログインを開始し、Preview #5へ戻ることを確認した。秘密情報や認証値は記録しない。
- **フェーズ目的**: 新機能を大量追加するのではなく、「記録が面倒で分かりにくい」「画面ごとに別サービスのように見える」というα体験を、既存αテスター3名の再テストまでに改善する。知見投稿を促すため、入力しやすさと主要導線の一貫性を優先する。
- **実施順序**: 1) Quick RecordのiPhone Safari実機UX QA、2) Garage Timeline media再発とHeader／Navigationの既知UI問題をまとめて調査・修正、3) GarageをDesign North StarとしてHome、Quick Record、Vehicle Timeline／Record、Journal、Search、Profile／Notificationsの主要journeyへ共通Design Languageを適用、4) αテスター3名へ再テストを依頼する。実機QA中の不満はその場で個別修正せず、一旦収集してまとめて判断する。
- **P1**: Garage Timelineの「端末内メディアが見つかりません」再発は継続。IndexedDB、local Blob、legacy media reference、Supabase media、旧新保存方式の差を候補として、再現条件と影響範囲を確定するまで解決済みと扱わない。未ログインLandingのheader余白、ログイン後headerの中央ずれ、画面間のheader／title／navigation不統一も次のUI修正対象とする。
- **再テスト条件**: Quick Recordの本文のみ／写真付き入力、Vehicle選択、30秒程度の投稿、保存後Timeline反映、迷いの有無を確認できること。主要記録flowが実機で動き、media問題の原因・影響範囲が明確または解決し、Headerの目立つ崩れと主要画面のVisual inconsistencyが改善されていることを最低条件とする。
- **次の状態**: 自動検証済み・実機QA待ちの機能を完了扱いにしない。人間QA後に、既存αテスターが「また記録したい」と感じるかを最重要の評価軸として記録する。

## 13. 2026-08-15 α再テスト前 UX Improvement Pass（PR #5継続）

- **対象と状態**: PR #5 `codex/quick-record-composer`で、Quick Record、共通Header、Garage／Journalの表示をα再テスト前に整える。PR #2、PR #3はopen・未mergeのまま変更しない。今回のコードは自動検証後にHuman QAへ回す。
- **Quick Record**: 最小入力（Vehicle、本文、任意写真、記録する）は維持し、本文・写真・保存操作を近づけ、詳細設定を初期表示から外す。`alpha_inline`の新規Quick Record写真はworkspaceに保存する既存経路を使い、端末ローカルBlob依存を新たに増やさない。
- **Header**: モバイルHeaderを左右固定slotと中央titleの共有構造にし、左右action数に影響されずtitle／brandがviewport中央に来るようにする。未ログインLandingの大きな上部余白はコード上で原因を断定できておらず、safe area・Netlify Drawer等を含めてiPhone QAで再確認する。
- **Garage media P1の原因**: 旧詳細Journalの`local_blob`写真はIndexedDBのoriginごとの端末内参照であるため、別端末・別browser・ProductionとPreviewの別originでは復元できない。新規Quick Recordの`alpha_inline`写真と、既存`alpha_shared`の共有写真は別経路である。今回、復元不能な旧local mediaは本文を妨げない小さな縮退表示にし、共有写真の取得失敗は既存の再試行／診断対象として維持する。legacy写真の移行・回復は未実装。
- **Design Language適用範囲**: 共通Header、authenticated Home、Garage、Quick Record、Journal detailを、白地・短い事実的copy・余白・内容主体・一つの主要CTAというGarage由来の文脈へ寄せた。Search、Profile、Notificationsは優先度Bとして今回未統一。Admin／Professional／prototypeは対象外。
- **再テスト前の人間確認**: iPhone Safariで、未ログインLanding上部、Header中央、Quick Record本文のみ／写真付き保存、Garage timelineの旧／新写真、Home → Garage → Record → Timelineの連続性を確認する。コード上の状態はHuman QA ready候補であり、実機確認前に完了扱いにはしない。

## 14. 2026-08-15 Quick Record iPhone Safari QA修正（PR #5継続）

- **写真付き保存の原因と修正**: 本文保存とは別に、Quick Record／詳細Journalがlazy social hydration由来の共有ready判定を投稿前に使っていた。その一時状態がfalseの間は、既存の共有アップロードを試さず「共有機能の準備が完了していないため、自分だけに保存」と止めていた。公開写真は既存の`alpha_inline` → 認証済み`alpha-journal-media` Storage → `alpha_shared` payload → shared Journal RPC経路を実行して結果で判定するよう戻した。失敗時はprivate化せず、workspace rollbackと入力保持を行い、安全な再試行メッセージを返す。
- **公開範囲**: 新規Quick Recordの写真は本文と同じ公開範囲を使う。αでの通常値「α参加者に公開」を写真だけprivateへ落とさず、`自分だけ`は明示的なprivacy選択として維持する。新規の共有写真はorigin単位のIndexedDBではなく、認証済みshared Storageを読む設計である。
- **QA polish**: 本文placeholderを「愛車で何をしましたか？」へ変更し、Quick Recordの写真操作をOS標準file picker一つの「写真を追加」へ統合した。下書き操作、詳細設定のgrouping、日付fieldのmin-inline-size、保存CTAのbottom safe area、Home／Journalのmedia containerを整えた。旧`local_blob`のTimeline fallbackは本文より目立たない68px最小高へ縮小した。
- **未解決P1／要確認**: legacy `local_blob`写真の別端末・別originでの回復／migrationは未実装。未ログインLanding上部の大きな余白はコード上で原因を確定できていない。iPhone Safariでは本文のみ、写真付きの「α参加者に公開」と「自分だけ」、保存直後のTimeline、別session／別deviceでの共有写真、日付field、下書き、bottom navigationとの距離を確認する。
- **状態**: 自動検証完了後もPR #5はopen・未merge、Human QA ready。PR #2／PR #3、`main`、Netlify／Supabase設定は変更しない。

## 15. 2026-08-15 P-086 共有写真保存経路の修正（PR #5継続）

- **再現範囲**: iPhone Safariで本文＋写真の「α参加者に公開」だけが、記録本体の保存後にshared photo copyの更新で失敗した。本文のみ、写真選択・preview、private写真の各経路とは分離して扱う。
- **原因（code／RLS contract）**: 新規共有画像はjournal ID・更新時刻・media IDを含む一意のobject pathを生成するにもかかわらず、Storage uploadを`upsert: true`で実行していた。`alpha-journal-media`の現行RLSはoperationごとのreadを絞っており、新規画像にも不要なupdate／conflict経路を通す設計だった。また`alpha_inline`のdata URLを`fetch`してから再度canvas変換しており、iPhone Safariで余分な失敗点になっていた。
- **修正と境界**: Quick Recordで既に460KB以下へ正規化済みの`alpha_inline`画像を直接Blobへ戻し、再fetch・再encodeせず、shared bucketへ新規insert（`upsert: false`）する。shared Journal RPC成功後にだけ`alpha_shared`参照をpublishするため、新規公開写真は別origin・別deviceでもshared Storage＋shared dataから取得できる。旧`local_blob`写真は移行せず、origin限定のlegacy P1として残す。
- **観測性と次のQA**: 失敗時はuser、journal ID、object path、画像内容を含めず、operation・HTTP status・safe Storage error codeだけをbrowser diagnosticへ記録する。iPhone Safariで小さい写真、通常のiPhone写真、private写真を各1件保存し、公開写真のTimeline・別session／別device表示を確認する。実機前はSHIPPED_NEEDS_QAを維持する。
