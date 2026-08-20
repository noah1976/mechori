# DESIGN_DIRECTION

## 基本方針

MECHORI は、整備記録を確実に残し、必要な事例を素早く探し、愛車の経験を本人の言葉で楽しく残すサービスです。見た目は派手さよりも、信頼性、読みやすさ、入力しやすさ、安全性の伝達を優先しつつ、事務画面だけに見えない親しみを持たせます。

## Global Product / Hokkaido Born

MECHORIは北海道で生まれたサービスですが、日本国内向けWebサービスに見えることを目指しません。最初から世界中のオーナーが自然に利用できるglobal consumer productとして、車両写真と記録を中心に設計します。

- 日本の業務Web・国内ポータルのような過剰な罫線、カード、説明文、CTAの乱立を避ける。
- 大胆な余白、typography、車両写真、明確なinformation hierarchy、限られたbrand color、短いcopy、控えめで質の高いmotionを重視する。
- PCをスマートフォンUIの横伸ばしにせず、同時に無味乾燥なSaaSにも寄せない。
- 北国、garage、road、metal、old machinery、長く大切に使うものの質感を静かに反映する。雪や山などの直接的な装飾へ依存しない。

キーワードは「北海道製。でも最初から世界のサービスに見える。」とする。将来の`MECHORI Design System / Visual Direction v1`で、具体的なロゴ、色、タイポグラフィ、主要画面をまとめて再検討する。

## 初期体験

- スマートフォン向けWebアプリとして最適化する。
- 整備記録の登録、検索、詳細確認を主要導線にする。
- Garage Journalはブログ本文を読みやすく見せ、定型整備情報とは視覚的に分離する。
- フィードは人物だけでなく車両・車種への関心を表し、初期は時系列とする。
- いいねやフォロワー数を、安全性、正確性、整備能力の表示に見せない。

## Quick Record / Universal Composer

記録入力はフォームを埋める画面ではなく、愛車に起きたことを書き始める画面として扱う。最初に見せるのはVehicle、十分な本文入力、任意の写真、ひとつの保存操作だけにする。タイトル、分類、日付、整備・部品・費用・Providerなどは、必要な人だけが詳細設定で追加する。現αのQuick Recordは公開範囲を「α参加者に公開」に固定し、常設のprivate／public 2択を初期体験へ置かない。

- 入力原則は「まず書ける。整理はあと。」とする。初見のユーザーへMaintenance、Journal、故障記録の分岐を先に強制しない。
- 写真は添付管理UIではなく記録の文脈として扱う。写真なしでも保存可能で、iPhoneからカメラまたは写真ライブラリを自然に選べることを優先する。
- `Quiet Machinery`の低密度を保ち、白いcard、説明文、同格CTAを重ねない。本文と車両名の関係を最も強く見せ、日付などの詳細はsummaryを開いた時だけ表示する。

### Quick Record decision surface

- Quick Recordは、投稿前の判断項目をVehicle、本文、任意の写真、記録する、へ絞る。
- 現αでは正式保存を「α参加者に公開」へ固定し、Visibilityを常設の大きな2択UIにしない。入力途中のprivate状態は下書きで表現する。
- 共有を標準にするのは、他ownerの記録・写真・整備経験を発見し、Knowledge contributionと再訪を増やすためである。これは詳細記録のVisibility設計を変更するものではない。

### Post-save enrichment

- 投稿完了を構造化入力より先にする。Quick Recordの「記録する」は、本文と任意写真を保存する完了操作であり、追加情報入力に依存させない。
- 投稿入口を複数に分けず、投稿前の「詳しく記録する」別フォームは置かない。詳細情報は保存後の任意enrichment、または後から記録詳細で追加・編集する。
- mobileでは保存成功後に軽量なBottom Sheetで「追加／閉じる」だけを提示し、大量のformを強制表示しない。Skip／Closeを明確にし、追加情報を入力しないことを不完全な投稿として扱わない。
- 現在の「あとで」項目は、投稿前必須・保存後移行・廃止可能の観点で実装時に再整理する。αでは内容に応じたAI動的質問を必須にしない。
- 保存後に追加情報を促せる余地を残すが、追加しないことを不完全な投稿として扱わない。AI構造化は将来の補助であり、本文を先に残せることを妨げない。

## アクセシビリティ

WCAG 2.2 AA を目標にします。

- 色だけで状態を区別しない。
- 十分なコントラストを確保する。
- 読みやすい文字サイズにする。
- 十分なタップ領域を確保する。
- キーボード操作に対応する。
- スクリーンリーダーに配慮する。
- 多言語による文字量増加に耐える。
- エラー内容を文章でも提示する。

## 多言語

- 日本語と英語を初期提供言語とし、対応言語が増える前提の選択UIと辞書構造にする。
- 翻訳で文字量が増えても崩れにくいレイアウトにする。
- 言語に依存しない症状・部品・作業コードを表示ラベルから分離する。
- 二択トグル、国旗だけの言語表示、固定幅ラベルを避ける。
- 日付、数値、通貨、単位、複数形を文字列連結だけで組み立てない。

## 安全表示

- 危険領域には強い警告を表示できる設計にする。
- 投稿者の事実、推測、AI整理、メカニック確認済み、公的資料を視覚的にも区別する。
- 解決済みと未解決を明確にする。

## カラートーン

特定の国、メーカー、年代、車種文化をブランド全体から連想させないことを原則とします。英国車を想起させる深緑、イタリア車を想起させる赤等を、画面全体の支配色にはしません。

- 背景、面、文字、罫線は白、ニュートラルグレー、チャコールを基調にする。
- 主要操作とリンクには、整備現場や技術資料を想起する落ち着いたサービスブルーを使う。
- 達成、注目、進行の補助にはアンバーを限定的に使う。
- 緑は成功・解決、黄は注意、赤は危険・エラー、青は情報という意味を優先する。
- 車両写真の色が主役になるよう、UIの面を単一のブランド色で染めない。
- 車種、国籍、所有状態を色だけで分類しない。
- 将来のダークモードやブランド調整に備え、役割ベースのデザイントークンを使う。

αでは、ニュートラルな車体にサービスブルーとアンバーの信号色を載せる「国籍を問わない上質な整備記録帳とワークショップ」を基準にします。

## Garage Pilot v2: Quiet Machinery / Living Vehicle History

Garageは車両台帳ではなく、Vehicle、Owner、Historyを見返す場所として扱う。v2では大判のVehicle写真と重なるidentity sheetを主構成にし、写真なしの場合も年式・make・model・所有期間による静かなidentityをつくる。愛称・車種・所有時間、ひとつの主操作「このクルマの記録を残す」、整備と日常の出来事を同じ時間軸で読む構成を優先する。

- Taste SkillのDesign Guidanceを適用し、`DESIGN_VARIANCE=7`、`MOTION_INTENSITY=3`、`VISUAL_DENSITY=4`をGarage Pilotの目安とする。外部fontやmotion libraryは追加しない。
- KPI的な数値帯、連続したsurface/card、uppercase eyebrow、同格CTAを減らし、余白、写真、date、短いcopyで階層を作る。Desktopは非対称のphoto + identity、Mobileはphoto → identity → actionの順に崩す。
- 車齢・所有期間・走行距離はdashboard metricではなくVehicle identityの一部として扱う。
- 写真がないVehicleも、車名・年式・所有時間を用いた静かなfallbackで未完成に見せない。Timelineは重いcardの繰り返しではなく、日付とmarkerを持つ一本の履歴として扱う。
- このPilotの人間QA後にのみ、HomeやFeedなどへのDesign Language展開を判断する。DB、RLS、RPC、workspace data contractはこのVisual Pilotの対象外とする。Human QA pending。
- v2 Human QAの初回フィードバックでは、make／model／任意gradeを意味単位で階層化し、Garageのrecord FABをHero CTAと重複させず、Hero周辺の白いsurfaceをcontent canvasへなじませる。再確認はHuman QAで行う。

## 次のαフェーズ: GarageをDesign North Starとして主要journeyを統一する

Garageは当面のDesign North Starとして扱う。ただし、HomeやQuick RecordなどをGarageの複製にするのではなく、Garageで検証したQuiet Machinery / Living Vehicle Historyの考え方から、主要journeyに共通する視覚言語を抽出する。

- 優先順は、Home → Garage → Quick Record → Vehicle Timeline／Record → Journal → Search → Profile／Notificationsとする。約50の全routeを一度に改修せず、αテスターが頻繁に使う導線から揃える。
- 共通化の対象はHeader、Navigation、Typography hierarchy、margin／padding、card、border、radius、button、icon、accent color、image presentation、section hierarchy、Mobile layout。左右のaction数に影響されないHeaderの視覚的な中央配置も含める。
- Vehicle写真、記録の時間軸、短い事実的copy、余白をUI chromeより優先する。黒＋黄色などの強い表現はOnboardingや重要な強調部分など意図した場所に限定し、全画面の支配色にはしない。
- 次の検証値は、記録のしやすさ、主要導線の連続性、Visual consistency、実機での安定性、また投稿したくなる感覚。新機能を増やす前に既存αテスターの再利用意欲を確認する。
- Garage Timelineのmedia問題とHeaderの余白・中央ずれは、Design polishだけでなく実機QAで再現条件を確認する。原因不明の表示を見た目の調整だけで隠さない。

## α再テスト前 UX Improvement Pass

Garage由来のDesign Languageを、αテスターが頻繁に通る範囲へ限定して適用する。目的は画面数を増やすことではなく、Home → Garage → Record → Timelineが一つのサービスとして自然に読めることにある。

- 共通Headerは、モバイルで左右固定slotと中央titleを用い、左右actionの有無に関係なくbrand／page titleを視覚的に中央へ置く。未ログインLandingの上部余白は実機で検証し、コード上の推測だけで原因を確定しない。
- Quick Recordは本文、任意写真、保存の操作を近くに置き、最初に書き始める余白を優先する。詳細設定は初期画面の主役にしない。
- Homeは一つの記録CTAを主役にし、Garageは車両と時間軸、Journal detailは読む内容を主役にする。全面的なcard／borderの反復を避け、白地、余白、短い事実的copyで区切る。
- 本当に復元できない旧端末内写真は、本文を妨げる大きなerror surfaceにせず、小さく状態を伝える。共有写真の通信・権限エラーは同じ見た目で隠さず、診断可能な状態を維持する。
- 今回の適用範囲は共通Header、authenticated Home、Garage、Quick Record、Journal detailまで。Search、Profile、Notificationsは優先度B、Admin、Professional、prototypeは対象外とする。

### Quick Record QA follow-up

- Quick Recordの写真入口は、用途別の複数buttonではなく、OS標準の画像pickerを開く一つの「写真を追加」にする。iPhone SafariとAndroid browserが写真ライブラリ、撮影、ファイル選択を各OSの自然な選択肢として提示できることを優先する。
- `愛車で何をしましたか？`のように、故障だけへ寄せない短い事実的copyを使う。詳細設定は同じpageのProgressive Disclosureとして、境界線と余白で静かに区切り、古い別formの印象を作らない。
- 取得不能なlegacy local写真はTimeline本文より大きなerror surfaceにしない。一方、共有写真の失敗は隠さず、再試行可能な状態と区別する。新規共有写真は記録本文と同じaudienceで扱う。

### Authenticated Home Feed

- Homeの投稿一覧は、cardの集合ではなく、人とVehicleの記録が続くFeedとして扱う。owner、Vehicle、date、本文、任意写真、最小のreactionをこの順で読む。
- Authenticated HomeはFollowing Feedをfirst surfaceに置く。これは、記録する用事がない日にも他Owner / Vehicleの続きから再訪理由を作れるかを確かめるα仮説であり、Retention改善を前提にしない。自分の履歴、Search、月次summaryは役割を保ったままsecondaryに置く。
- 投稿は重いwhite surface、上端accent line、強いshadow、同じvisibility label、独立した重複CTAで囲わない。投稿間は余白と必要最小限のdividerで区切る。titleと本文が同じ内容なら、内容を改変せず表示上の重複だけを避ける。
- Homeの月次情報は行動を妨げない低優先度のsummaryとし、Feedをfirst-class contentにする。mobileのrecord FABは内容を覆わず、bottom navigationとsafe areaから十分離す。
- Journal CardはHomeだけの特別な装飾にせず、Garage由来のwhite base、読みやすい本文、写真の収まり、控えめなsocial metadataを各投稿一覧へ共通適用する。写真はcontainerとviewportからはみ出さず、本文の後に自然に続く。Human QAでHome、Feed、公開Profileの読みやすさを確認する。

## α Signature Experience

- `Vehicle Continuity`を、Home、Quick Record保存後、Garageで共用するMECHORIのSignature vocabularyとする。`Vehicle Anchor`が同じ個体を継続して示し、実recordは`Experience Mark`、日付・種別・actor／sourceは`Experience Register`、まだ存在しない将来は`Continuation Slot`として構成する。未実装のsame-model接続は`Knowledge Outlet`として境界だけを示す。細いlineとcircleを中心とするgeneric vertical timelineへ戻さない。
- Vehicleは常に構造の中心に置く。Owner / Mechanicは、その時点で記録・作業・参照したactorとしてExperience Mark内に表示し、avatar、Like、投稿者を中心軸にしない。将来のOwner変更はVehicle Anchorを維持したままactor／eraを追加できる構造にする。
- Quick Record保存直後はneutralな一つのExperience Markを表示する。本人が保存後に「不具合・気になること」を保存した場合だけ`未解決`を静かに示す。Continuation Slotは「まだ記録はありません」と明示し、未来の点検・修理・結果をfake recordとして描かない。
- Home first-viewは説明panelではなく、明示的な「DEMO・架空例」のVehicle Continuityを最初のProduct objectとする。黒いactivation onboardingはSignatureの後へ下げ、white baseのcompact utilityへ変更する。DEMOには実在人物、技術的因果、fake metricを使わない。
- GarageはVehicle Identityを維持し、選択車両のactual recordだけをExperience Markとして表示する。件数を価値の主役にせず、欠損actor／resultを補完せず、actual relationがないrecordを一つのcaseに見せない。
- DesktopのPrimary Capture ActionはMECHORI logo直下、navigationより前へ置く。Mobileは既存FABを維持する。Reference GarageはHome理解の必須routeにせず、架空DEMOの前提を確認するsecondary routeとする。
- 320px以下でもVehicle Anchorを上部band、Experience MarkをExperience Register + contentの2 trackへ再配置し、long text、actor、status、mediaへ`min-width: 0`とwrapを適用する。Chromium幅確認とiPhone Safari実機QAを別状態として扱う。

## 未確定

- ロゴ
- タイポグラフィ
- UIコンポーネント方針
- 初期対応ブラウザ
