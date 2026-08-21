# PRODUCT

## ブランド

- 英字名: MECHORI
- 日本語読み: メカリィ
- タグライン: Fix. Share. Drive on.
- 日本語表現: 直して、シェアして、また走ろう。

MECHORIは、機械・整備を示す`MECH`を核に、車両の記憶と履歴が次の一台へ受け継がれる構想を表す造語です。公式ドメインは`mechori.com`です。

## サービスの目的

同じ車種、年式、仕様のオーナーやメカニックによる整備記録、故障事例、部品情報、解決事例を世界中から蓄積し、必要なときに検索できる車両メンテナンスナレッジサービスを構築します。

入口の体験は、オーナーと一台の愛車を主役にした履歴です。写真、Journal、プロフィール、フォローは、愛車の経験を楽しく残し、次の整備まで関係を保つために使います。実体は、そこで残された整備・故障・カスタムの実例を、出典付きで再利用できる知識基盤です。AIは知識源ではなく、蓄積済みの実例を検索・集計し、理解しやすい文章へ変換する手段に限定します。

競合との重複領域、正面から競争しない領域、初回コピーの基準は`docs/COMPETITIVE_POSITIONING.md`を正とします。

## 内部戦略モデル: Evidence GraphとEvidence Loop

MECHORIは、自動車SNS、整備記録アプリ、B2B SaaS、Affiliateサイトのいずれか一つとして設計しません。これらをつなぐ中核は、車両個体、車両仕様、症状・出来事、作業、使用部品、結果、再発・解決、出典・実例の関係を、確認状態と公開範囲を保って結び付ける**整備Evidence**です。この関係構造を内部戦略上`Evidence Graph`と呼びますが、現時点で一般ユーザー向けのMarketing用語にはしません。

長期的な価値は、次の`Evidence Loop`が閉じることにあります。

```text
記録
  -> 整理・Evidence化
  -> 検索・閲覧・再利用
  -> 実際の対応・作業
  -> 結果・再発の追記
  -> 次のオーナー・工場・専門家が再利用
```

Quick Recordはこの循環への軽い入口です。Capture原則は「何を残すかだけ決めて、すぐ書ける。詳しい整理はあと。」とします。利用者は4つの大分類から1回だけ選び、本文と任意写真の保存へ直ちに進みます。保存後の任意enrichment、使用部品、走行距離、作業情報、症状、結果、再発・解決の追記が、投稿をMECHORI固有のEvidenceへ変える橋です。大分類を詳細formや診断へ拡張せず、Evidence化を理由に投稿前の大量入力へ戻しません。

Quick Recordは「何をしたか」だけでなく、「このVehicleに何が起きたか」を受け取ります。まだ原因も対応も分からない異音、警告表示、匂い、漏れ、挙動の変化も、本文だけで正式なVehicle Eventになります。本人が入口で「気になること・不具合」を明示した場合は未解決のissueとして保存できますが、原因や診断を要求しません。「整備・修理」は詳細な作業種別を断定せず、保存後または後日の「記録の詳細」で任意に細分化します。

αでは、同じVehicleについて記録が残り、後から点検、作業、結果を追加できることを`Vehicle Continuity`という共通UI vocabularyで可視化します。Vehicleを常設のanchor、実際の記録を時点・actor・状態を持つ`Experience Mark`、その出所を読む領域を`Experience Register`、まだ存在しない将来を`Continuation Slot`として表します。これはrecord間の因果関係、Vehicle Succession、same-model Knowledge reuseが実装済みであるという意味ではありません。実関係がない履歴は車両に属する時系列記録として表示し、関係modelはβ正規化で検討します。

### 1件の記録とVehicle Experience

MECHORIで長期的に扱う中心単位は、SNSのPostではなく、同じVehicleについて時間的・意味的につながる`Vehicle Experience`です。Experienceには、観察、作業、写真、経由地、結果、再発等を時点ごとに残す`Experience Entry`を追加できます。修理とドライブは同じEntry envelopeを使えますが、症状、部品、作業、経路等のdomain semanticsまで一つの汎用schemaへ押し込みません。

現αのQuick Record / Journal 1件は、原則として一つの`Experience Entry`に相当します。実関係が保存されていない既存記録を推測でまとめず、β正規化時は明示的な関係がない限りsingleton Experienceとして移行します。`Experience`は経緯を残すcontainer、`Entry`は原文・日時・media・author・provenanceを持つ追記単位、`Evidence`はEntryやMaintenanceから本人確認・出典・結果等を保って正規化するatomicな再利用単位です。ExperienceそのものをEvidenceやKnowledge Caseと同一視しません。

現αのCapture UXは、Vehicleを確認した後に「気になること・不具合」「整備・修理」「ドライブ・思い出」「その他」のtop-level intentを1回だけ選び、すぐ本文と任意mediaへ進みます。これは詳細分類ではなく、Vehicle Experienceを残す入口だと伝わるかを検証するα実験です。選択済みの意味を保存後に聞き直さず、必要な詳細は「記録の詳細」と将来の「続きを残す」で追加します。

Vehicle Historyは初期表示を分割しても、件数で古い記録を切り捨てません。古い未解決issue、過去作業、後日の結果へ到達できることをProduct要件とします。また、知見を残す量を恒久的な画像枚数上限で制限せず、必要な制約はfile size、MIME、Storage、bandwidth、rate limit、abuse対策等のresource guardrailで管理します。現αの保存経路に残る技術上限は一時的制約として区別します。

Owner向けConsumer体験はEvidence supply、愛車履歴、獲得、network形成の入口です。Professionalは、Owner、工場、専門家の間でEvidenceを業務へ接続し、結果をOwner履歴と集合知へ返す長期の出口です。両者を別事業として分断しません。

## αテスターから得た価値表現

α版テストユーザーから、MECHORIの価値を表す言葉として「整備士にとってのGitHub（ポートフォリオ）」と「クルマのカルテ（オーナーが変わっても残る整備記録）」が挙がっています。これは需要検証済みのMarketing claimではなく、ProductとBusinessの方向が利用者の言葉でも理解され得ることを示す定性シグナルです。

- **整備士にとってのGitHub**: 許諾された案件、確認、訂正、結果追跡、専門家レビュー等が、整備士本人の持ち運べる技術ポートフォリオとして蓄積される価値仮説。投稿量や人気で技術力を保証せず、顧客情報、勤務先の権利、資格、本人性を分離する。
- **クルマのカルテ**: Vehicleを中心に、仕様、出来事、整備、部品、結果、再発・解決が継続し、将来の所有者や整備工場が許可された履歴を引き継げる価値仮説。個人情報、非公開メモ、請求書、位置情報、写真等を所有者変更だけで自動移管せず、同意、出典、公開範囲を維持する。MECHORIが車両状態や整備品質を保証する表現にはしない。

両表現は同じEvidence Loopの二つの視点です。前者はEvidenceを残したProfessionalの実績、後者はEvidenceが帰属するVehicleの継続履歴を示します。今後のインタビューでは、説明なしでも同じ価値が伝わるか、実利用へつながるかを検証します。

### クルマのカルテとVehicle continuity

「クルマのカルテ」は、前Ownerと次Ownerが直接会わなくても、Physical Vehicleに紐づく許諾済みの整備Evidenceを次のOwner、工場、利用者へ安全に再利用できるようにする仮説である。Vehicle自体、Vehicleとの期間付き関係、過去EvidenceへのAccessを分け、継承はデータcopyや過去投稿のauthor変更ではなく、transfer-safeなEvidenceへのAccess Grantとして扱う。

MECHORIは法的Ownership、車両状態、走行距離、整備品質を保証しない。VIN / chassis numberを知っていることも、Vehicleをclaimする権利と同一視しない。個人情報、private memo、位置情報、private photo、invoice原本、個人的費用、communicationは所有者変更だけで自動移管しない。具体的なTransfer / Recovery UX、identifier matching、DB正規化はβ前のArchitecture DecisionとしてDeferredにする。

## 究極的な目的

旧車趣味を、より広く、維持しやすく、始めやすい趣味にします。

- 初めて旧車を所有する人が、故障、部品、費用、整備先への不安を減らせる。
- 自分で整備したい人が、類似事例、出典、安全上の注意から、自分で確認できる範囲と専門家へ任せる範囲を判断できる。
- 車種固有ノウハウを持たない整備工場でも、Professionalの知識検索を使い、受託可否、確認すべき資料・箇所、専門店へ相談すべき範囲を判断しやすくなる。
- 専門店や経験あるメカニックの知識が、地域と言語を越えて次のオーナーと工場へ届く。

MECHORIを継続可能な事業として育て、その利益を将来の新しい事業へ再投資できる状態を目指します。室蘭への事業・地域還元は所有者側の長期構想であり、初期ユーザーへの機能上の約束やマーケティング表現とは分けて扱います。

Professionalへの加入だけで整備能力や安全性を保証しません。MECHORIは、専門外の工場でも根拠を確認しながら受けられる仕事を増やし、必要な場合は専門家へつなげられる知識基盤を目指します。

ログアプリとしての使い勝手は知識を集める入口です。本体価値は、蓄積した事例から、症状に近い原因候補、報告された確認箇所、解決例、反対事例を、出典と一致範囲付きで文章化できることです。

## 中心価値

1. 自分の車両の整備履歴を簡単に残せる。
2. 同型車・同年式・同仕様の整備事例を検索できる。
3. 個人の整備記録や本人が書いたGarage Journalから、確認済みの情報だけを構造化し、集合知として役立てられる。
4. 言語の壁を越えて世界中の事例を検索できる。
5. 整備情報の出典、確認状態、車両との一致範囲を明示し、利用者が情報の信頼性を判断できる。
6. 将来は世界中のメカニックが利用・課金する専門ナレッジ基盤へ拡張できる。
7. 旧車を扱った経験が少ない工場でも、根拠を辿って受託可否を判断できる。
8. オーナーが残した記録と、工場・専門家の経験が循環し、旧車の維持可能性を高める。
9. 故障や路上停止を含む所有体験を、写真・動画・本人の文章で楽しく共有できる。読まれる楽しさを知識が集まる入口にする。
10. 整備士が所属や国境を越えて技術履歴を積み上げ、採用、相談、教育、仕事の機会へつなげられる。

Journalを書くことは必須にしません。文章が苦手な利用者や、工場整備の事実だけを残したい利用者は、構造化整備記録だけで履歴管理とナレッジ貢献を完結できます。

## 初期の主対象

初期MVPは、次のオーナーを優先して設計します。

1. 年代・メーカーを問わず、所有すること自体を楽しみ、長く付き合いたい趣味車のオーナー
2. 旧車・ネオクラシック、輸入車、希少車、現行の趣味車・カスタム車のオーナー
3. DIYまたは工場整備の履歴を残し、車種固有情報を探すオーナー
4. 複数台、クルマとバイク、趣味車と日常車を管理するオーナー

メカニック向け機能は重要な将来市場ですが、初期MVPの画面と主要導線はオーナーを中心にします。

Professionalの長期到達点は、整備士がMECHORIを単なる情報サイトではなく、技術記録、学習、信用、仕事の基盤として自発的に勧める状態です。「整備士のGitHub」はこの到達点を表す中核設計であり、現在提供中の機能を示す宣伝文句として先行利用しません。

製品構造は、Professional品質の共通データ骨格を基盤にします。ただしOwnerをProfessionalの機能制限版として見せず、愛車との時間を軽く楽しく残す専用体験にします。Ownerの記録は明示同意により工場案件や共有ナレッジへ接続でき、工場の作業結果はオーナー履歴へ戻せるようにします。

## 初期実証範囲

FIAT Barchettaは所有者自身が深く検証する最初の密度アンカーです。招待制αは友人・知人の多車種を対象とし、車齢、国産・輸入、DIY・工場依頼等をまたいで共通価値と強く反応する利用層を確認します。設計は最初から他メーカー、現行趣味車、カスタム車、バイク等を扱えるものにします。

ProductはUniversalです。希少車、並行輸入車、限定車、グレード不明、catalog未登録を含め、対象車種を理由に登録を止めません。一方、初期GrowthではKnowledge密度とMeaningful Reuseを観察するため、2〜3程度の車種・利用目的・community clusterへ獲得を集中させる実験を行えます。これは対応車種の制限ではなく、`Product = Universal / GTM = Clustered`という役割分離です。

車種マスタの有無は登録可否に使用しません。ユーザーが入力したメーカー・車種名で即時に愛車を作成し、年式、型式、エンジン等は分かる範囲で後から補完します。メーカーは既知の別名から`FIAT`、`NISSAN`、`HONDA`等のアルファベット表記へ統一し、入力原文も保持します。車名は言語表記、市場別名称、車系統、世代を分離し、ヴィッツとYARISのような別市場名を同じ車系統へ接続できる一方、同一仕様とは断定しません。正規化は検索精度を上げる裏側の処理であり、最初のオーナーへ申請待ちや機能制限を課しません。

## 継続利用の考え方

整備は低頻度であり、毎日の投稿や連続ログインを製品価値にしません。月に一度程度でも、愛車履歴、未解決事項、同じ車種やフォロー車両の更新、症状検索、Journalのいずれかへ戻る状態を目指します。

- 修理・維持支援は、必要なときに選ばれる中核価値です。
- 個体別の愛車履歴は、一人でも成立する土台です。
- Journal、写真、フォローは、次の整備まで愛車との関係を保つ補助層です。
- 交流機能が愛車履歴または整備集合知へつながらない場合、利用頻度だけを目的に追加しません。

## 非ゴール

MECHORI は一般的な人気競争中心の車SNS、写真共有SNS、故障診断サービスではありません。Garage Journal、フォロー、フィードは、車両の経験を楽しく残し、知識基盤へつなぐための層として提供します。整備情報は参考情報であり、専門家や整備書の代替にはしません。

## 初期実装

- スマートフォン向けWebアプリを最初の体験にする。
- αでは、Googleログイン、写真中心の3分愛車登録、登録完了、写真と一言の最初の出来事、愛車の時間軸、安全な共有URLまでを一本の体験として完成させる。
- 最初の愛車登録は、メイン写真、メーカー・車名、おおよその年式、所有開始時期へ絞る。型式、仕様、走行距離は後から補完する。
- 一人でも愛車ページを作り、育て、振り返り、人に見せられる価値を、集合知より先に成立させる。
- 整備履歴の入力、構造化、検索は中核価値として維持するが、空の検索やフィードを初回画面の主役にしない。
- 自由に書けるGarage Journalと構造化整備記録を分離し、任意で関連付ける。
- 投稿の公開・非公開、安全警告、管理者確認を設計に含める。

## Drive Experience（将来Product Direction）

Drive RecordはNavigation、route discovery、recommended route、destination recommendationを主目的とせず、そのVehicleで走っていた時間・場所・出来事をVehicle Experienceとして残すRoute Recording + Experience + Sharing + Engagementの機能候補とする。

将来Native Appでは、Vehicleに紐づくDrive Sessionを検討する。start / end、route、distance、duration、写真、notes、voice annotation、vehicle observation等を持ち得るが、現時点では正式schemaを固定しない。Drive中の「写真を撮った」「異音がした」「音が消えた」等は、将来`VehicleExperience` / `ExperienceEntry`へ接続できる方向を維持する。

Drive Recordは、整備のない日にもMECHORIを開くEngagementと、Public Share Page・SNS共有によるAcquisitionの入口になり得る。未ログインユーザーがVehicle、Drive title、date、routeの公開projectionを見て、愛車の記録開始へ進める方向を検討する。ただし、公開は明示同意と撤回可能性を前提とする。

Raw GPS RouteとPublic Share Routeは分離する。Raw RouteはOwner-privateのlocation history、Share RouteはPrivacy Zone等でsanitizationされ、Ownerが明示的に公開したpresentationとする。Vehicleへ残るExperience EvidenceとOwnerの生活圏履歴を同一視しない。

## 将来拡張

- メカニック向け有料プラン
- 整備工場向け機能
- OCR・AIによる入力補助
- 多言語検索
- ネイティブアプリ
- 法的要請、監査、データエクスポート対応

## Native App（将来Product Direction）

MECHORI Native Appは、Web版をApp StoreやGoogle Playへ載せるためのwrapperではない。同じVehicle、Experience、Evidenceへアクセスする別のProduct Surfaceとして、camera / photo、audio、background location、Drive Session、offline capture、push、OS Share Sheet、Deep Link、voice等、Webでは扱いにくい「クルマと一緒にいる瞬間」のCaptureを自然にすることを目的とする。

主要なUser Flowはgenuine native UIで実装する方向とし、WebのHome、Garage、Record composer全体をWebViewで表示するだけの構成は採用しない。WebViewはOAuth等の必要なbrowser flow、外部コンテンツ、明示的にweb-onlyな画面など限定用途に留める。Backend、Domain Model、API Contract、Auth identity、entitlement、Vehicle、Experience、Entry、Evidence、validation等はWebと共有し、DOM、CSS、Web固有navigation、primary UI実装は共有しない。

Native化の成功は「App Storeに存在すること」ではなく、device-native capabilityによってCapture / ExperienceがWebより自然または強力になることで判定する。開始条件はWebの100%完成ではなく、Product / Data Contract、rights、media、同期、Public Share、認証identityが十分成熟したこととする。

## 公開前対応

- 安全性、プライバシー、利用規約、投稿ガイドラインの確認
- 危険領域への警告表示
- 通報・一時非公開・管理者確認フロー
- 個人情報を含むアップロードへの対策方針
