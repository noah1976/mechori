# Human Validation Pipeline — 2026-09

- 更新日: 2026-09-28
- 状態: `DESIGN_REVIEW_READY / RECRUITMENT_NOT_STARTED / PIPELINE_EXPERIMENT_NOT_RUN`
- 関連課題: MECH-049（P1）。P-087の実機QA・実利用検証を支える運用設計
- 基準: 最新main `23e34ab159a1cc071a32997253be6e79cece045c`（会社OS PR #29 merge済み）
- branch: `codex/30-human-validation-pipeline`
- 承認範囲: この文書と最小checkpointの作成・検証・commit・push・PR。投稿、DM、募集、協力者の実データ取得、実験、課金、main mergeは未承認

## 1. Why this exists

MECHORIのMissionは、どんなクルマ・地域でも維持を担う人が必要な知識・整備経験へアクセスでき、専門家の価値と収入が向上する社会を目指すこと。Missionを継続するには実費を賄えるEconomic Valueも必要である。[会社憲章](company/COMPANY_CHARTER.md)に従い、操作できたこと、実用で選ばれたこと、支払われたことを分ける。

Human Validation Pipelineは、短い確認作業を協力者へ渡し、正しい人間の証拠を繰り返し取得する運用の仮説である。Productの追加機能ではない。協力者の人数や友人の称賛を事業需要へ変換せず、Founderが全QAを代行しなくても確認が進むかを試す。

**PassportはMissionではなく、現在のProduct Entry Hypothesis（顧客へ価値を届ける入口の仮説）である。Passport自体を成功させるのではなく、実際の用途に十分な価値があるかを判断できるEvidenceを得る。会社として「Passportを守らない。Missionを守る。」Mission Value × Economic Value × Evidenceから入口を検討し、Passportの継続、Positioning変更、縮小、Front-doorからの撤退、別の入口へのpivotはすべてCEO Decision Requiredとする。AIはEvidenceと選択肢を整理し、維持・終了・転換を独断しない。**

## 2. Current bottleneck

| 分類 | 現在分かること | 根拠・限界 |
| --- | --- | --- |
| CURRENT DECISION | 最大課題は「実装済みPassportが、実際の利用場面で選ばれる理由を確認できていないこと」。既存Passportの実利用価値を先に確認する | 第一回経営会議後のCEO回答。この方針の採用と顧客価値の実証は別 |
| FACT / IMPLEMENTED BUT NOT VALIDATED | 共有・Workshop返却・Owner承認・履歴追加のprototypeはある。P-087はHuman QA pending・実験未開始 | [PROJECT_STATE §1](PROJECT_STATE.md#1-現在テスターが利用できる主要フロー)、[BACKLOG P-087](BACKLOG.md#p-087-愛車パスポート-α-vertical-slice)。本タスクは動作を再検証していない |
| FACT / CEO報告 | Human QAの取得がFounder時間、少人数α、低頻度な整備機会に左右されている | 今回のCEO observation。遅延時間・参加率等の実測はない |
| FACT / CEO報告 | 既存αへPassport feedback依頼を送信済み | 前回のCEO回答。受信件数・内容は今回取得していない。新規催促を先に増やさない |
| CURRENT HYPOTHESIS | 目的別募集と短いself-service作業で、Founder以外の確認を増やせる | この文書の提案。募集・実験は未実施 |
| UNKNOWN | 到達人数、参加・完了率、端末構成、Founder支援時間、実Workshop利用、再利用、支払意思、実費・入金 | ゼロや成功率の仮定で埋めない |

CEO修正を引き継ぐ。7日間はQA、取得可能なfeedback、財務baseline、観測準備の期間であり、実案件成立の期限ではない。不要な入庫、強い依頼、人為的な利用誘導をしない。機会なしはUNKNOWN。Founder最大5時間は全社作業の上限で、使い切る目標ではない。

今後のread-only management reviewでは、branch・commit・push・PRは明示的に必要とされた場合だけ行う。本タスクはdocs-only実装と指定branch・commit・push・PRが明示承認された例である。会社OSの恒久ルールは改訂しない。

## 3. Validation layers

| 層 | 対象・目的 | 確認する行動 | 得られる証拠／得られない証拠 |
| --- | --- | --- | --- |
| A. QA Collaborator | 車好きでなくてよい。iPhone / Android / PC・Macで10〜15分のTechnical / Usability QA | 指定画面を開く、履歴を探す、迷う・表示異常・動かない箇所を報告する | Technical QAと使いやすさの観察。Product Pull、Market validation、Workshop willingness to payは得られない |
| B. Owner Validation Candidate | 趣味車・旧車・希少車・輸入車・長期所有車等で、今後1〜2か月に自然な点検・修理・車検・相談の可能性がある本人 | 自分の用途で履歴を選び、実際に工場へ渡す。後日機会があれば自分で再利用する | 候補登録・意向は発言。実用途での使用はProductの行動証拠。募集への応答だけでは市場需要を示さない |
| C. Workshop Validation Candidate | 実際の工場・Mechanic。最初から登録・契約を求めない | Ownerが共有したPassportを開く、過去履歴を見る、必要情報を探す、実作業後に任意で返却する | 具体的な受け渡し・入力負担の行動証拠。返却だけで支払意思・一般工場の行動・内容の専門家確認済みを認定しない |

候補資格は自己申告と観察の範囲で記録する。資格証明書、勤務先一覧、顧客名簿等を集めない。Passportの匿名返却は工場本人確認済みではない。[現状](PROJECT_STATE.md#passport-roundtrip-prototype-checkpoint)の「共有リンクから届いた内容」と確認状態を維持する。

Founder本人の車両、またはFounderが既に関係を持つWorkshopでのcaseは、常に `PROTOCOL / WORKFLOW DEBUG CASE` として別集計する。履歴共有→読取→返却→Owner承認→次回履歴と操作負担の確認に使うが、Market validation、Product Pull、General Workshop behavior、willingness to payには数えない。

外部Ownerの実用途は別のvalidation candidateとする。Founder既知工場を含むcase、知人・紹介によるcase、代理操作・支援付きcaseの条件を隠さず、一般化できる範囲を狭く示す。

### 最初に渡すself-service task card（draft）

共通カードは「対象URL / 確認日・版 / 目的 / 10〜15分上限 / 操作3つまで / 終了・中止方法 / 返答3項目 / 確認期限 / 問い合わせ先」で一枚にする。目的と安全条件を示し、操作の正解や褒めてほしい点を教えない。動画・通話・画面録画は標準にしない。

**Aの初回は閲覧中心。** (1) 未ログイン入口で何をするサービスと思ったかを一文、(2) 個別案内した検証Passportで指定の履歴情報を一つ探す、(3) 戻る・画面幅・返却欄の意味を確認して送信前に止める。最後に「できた／できなかった・どこで迷った・端末とブラウザの種類」を返す。止まった段階も有効な結果で、全操作完了を要求しない。

検証URL・資料の準備は開始前ゲート。Ownerが提供範囲を許可し、個人情報を除いた検証資料だけを使う。未準備ならPassport課題はBLOCKEDとし、入口の閲覧QAだけに縮小したことを記録する。本番に架空の整備事例・車両仕様を作らず、試験用データが必要なら明示的TEST DATAを許可済み検証環境だけで扱う。カード内の検証用情報を実事例として報告しない。

Aへの本番α招待や実記録の入力を初回の標準にしない。新規参加者へ既存αの記録が見える範囲、アカウント作成、保存操作が必要なQAは、環境・データ・招待範囲の確認後に個別承認する。認証情報を共有しない。保存・返却・承認の全roundtripは別カードで既存αまたはFounder debug caseへ割り当て、閲覧QAの完了をP-087全体のQA完了にしない。

**Bの最初の確認は5分程度（ASSUMPTION）。** 用途、機会の大まかな時期、普段の履歴の持ち方だけを確認し、予定なし・未定も許す。実機会が来るまで待機し、検証のための入庫を求めない。

**Cの実機会時カードは読取・探索・任意返却の一件だけ。** 作業した事実を分かる範囲で返し、不明を残す。5〜10分はASSUMPTIONの負担上限案で、通常業務を妨げる場合は中止して理由を記録する。Founderが工場の返却を代筆しない。

## 4. Recruitment sources

入口とFounderとの関係は別項目にする。

| recruitment source | 用途・注意 |
| --- | --- |
| existing alpha | 依頼済みfeedbackを優先。追加作業・再連絡は既存同意範囲内だけ |
| founder personal X | 車クラスタ外はA、実整備機会を持つ車クラスタはB。フォロワーを自然獲得扱いしない |
| founder Facebook | 実生活・過去の仕事の知人へA、車関係の知人へB、本人同意のある二次紹介へC |
| founder direct acquaintance | 個別の知人経由。頼まれた操作と自発行動を分ける |
| referral | 紹介先本人が希望して参加。紹介者名・人間関係図は保存しない |
| organic external | Founderの依頼・個人投稿・紹介を経ず自ら到達したと確認できる場合だけ。入口不明はUNKNOWN |
| workshop relationship | Founder既知工場。debug caseとして扱う |

関係は `close relationship / acquaintance / weak tie / no prior relationship / UNKNOWN` の粗い区分。本人が任意に答えるか、Founderが既に知る範囲だけで記録する。Xで面識がなくても募集を見て来た人の入口はfounder personal Xで、organic externalに変更しない。

## 5. X strategy

- 「αテスター」より「10〜15分のWeb動作確認」「整備予定がある方の協力」を先に示す。何をするか、所要時間、対象、謝礼なし・一回任意を明記する。
- AとBは別投稿にする。Aは車好き・車両所有を条件にせず、端末とブラウザの違いを探す。Bは車好きという属性だけでなく自然な利用機会を条件にする。
- **ASSUMPTION / 投稿上限案:** 14日でX最大2投稿。初回A、後半にB。Aを再掲するならBを延期し、2投稿を超えない。既に必要人数が来たら募集を止める。
- 再掲は初回から少なくとも7日空け、まだ必要な端末・残り枠と同じ任意条件だけを書く。成功したような体験談、架空activity、毎日のリマインダーを使わない。
- 原則は希望者本人からのDM。公開返信は「協力できそう」の意思表示だけにし、車名・整備内容・連絡先を書かせない。Founderからの一斉DMは行わない。
- 投稿前に現在のDM受付可否を確認する。設定変更はこの設計に含まない。DM不可なら公開の意思表示から既に使える連絡手段を本人と合意するか、X募集を保留する。新フォーム・メール名簿は作らない。
- 公開の募集投稿へ個別招待URL・Passport tokenを置かない。返信を順にA/Bへ分類し、バズ・表示回数・フォロワー増を目標にしない。

## 6. Facebook strategy

実生活の知人や過去の仕事関係には「車に詳しくなくても短時間の確認で助かる」と伝える。車関係の知人には今後の自然な利用機会を尋ねる。友人の友人・工場への紹介は、募集文を本人へ任意転送してもらい、興味を持った本人から連絡を受ける。

紹介者に連絡先・勤務先・顧客情報を送ってもらわず、紹介先の同意前にFounderがDMしない。個別招待URLの転送は求めない。[既存α運用](ALPHA_PLAYBOOK.md)の個別招待・非拡散を維持する。

**ASSUMPTION / 投稿上限案:** 14日でFacebook 1投稿。A協力とB/C紹介を明確な選択肢として書く。閲覧範囲はCEOが選び、友人以外への公開・グループへの転載は別判断。X文面のコピーではなく知人向けの文脈にする。無差別DM、個別の長時間説明、紹介の催促は行わない。

## 7. Recruitment funnel

`Post / Introduction → Interested → Suitable (A / B / C) → Consent → Task sent → Started → Completed → Feedback received → Follow-up candidate`

B/Cは適格・同意の後に `WAITING_NATURAL_OPPORTUNITY` を持つ。自然な案件と共有同意がそろうまで実用taskを送らない。QAと実利用の両方に関心がある人にも別task IDを付け、同じ人を人数として重複計上しない。

`DECLINED / WITHDRAWN / BLOCKED / NO_OPPORTUNITY / NO_RESPONSE / UNKNOWN` を終了・保留理由として残す。Task sentはアプリ招待とは別。初回カード後の追跡催促を標準にせず、期限終了時の未回答も結果とする。Follow-up candidateは将来の任意協力への同意であり、次回送信の自動許可ではない。

### 最小台帳案（今回は実データを作成しない）

テンプレートと匿名の集計だけをdocsへ置ける。参加者単位の台帳は既にGit除外される `tmp/human-validation/participant-ledger.md` 等へローカル保存する案とし、commit・PRへ入れない。新CRM・Google Sheet等は導入しない。連絡先との対応は既存SNS会話に留め、別名簿へ複製しない。

最小項目: `random participant ID / role / first source / referral origin（任意の区分） / Founder relationship / Founder-linked caseか / task ID・版・環境 / stage・日付 / consent scope / natural opportunity window / device・OS・browserの種類と必要時のmajor version / support NONE・CLARIFICATION・COACHED・PROXY・UNKNOWN / participant minutes・Founder minutes / result PASS・FAIL・BLOCKED・NOT_OBSERVED / anonymous issue reference / follow-up opt-in`。

氏名、SNS handle、email、電話、正確な所在地、VIN、ナンバー、実本文、請求書、画像、raw URL/token、会話全文を台帳へ写さない。browserの完全なUser-Agentも不要。参加・連絡・共有範囲は任意同意と撤回を扱い、利用機会未定なら詳細予定を集めない。

**ASSUMPTION / 保持案:** 14日レビュー後30日以内に参加者台帳を削除し、必要な匿名集計・再現手順だけを残す。再協力希望は元のSNS会話で確認できる範囲に留める。既存のアプリfeedbackやアカウントをこの期限で勝手に削除しない。生のSNS会話・実資料を外部AIへ送らず、既存feedbackも許可済みの最小匿名要約だけを使う。保持期間・データ範囲は開始前にCEO確認する。

## 8. Evidence / bias rules

| 証拠区分 | 認める範囲 | 飛躍させない結論 |
| --- | --- | --- |
| TECHNICAL QA | 特定版・環境・端末・操作のpass/fail、再現条件 | 他端末・本番全体が正常、Product Pull |
| USABILITY OBSERVATION | 説明前の用途理解、迷い、時間、助けの有無 | 現実で使う価値・継続需要 |
| STATED FEEDBACK | 感想、意向、友人の称賛・批判。発言として記録 | Workshop実利用、再利用、支払 |
| PROTOCOL / WORKFLOW DEBUG CASE | Founder車両・既知Workshopの往復と負担 | Market validation、Product Pull、一般工場の行動、willingness to pay |
| PRODUCT USE OBSERVATION | 非Founderの実用途・自然な機会での共有・読取・返却・承認・別日の利用 | 一件の完走から市場成立、継続率、Knowledge Network成立 |
| MARKET VALIDATION CANDIDATE | 従来手段との具体差と本人の選択を、入口・関係・支援・機会付きで示す | 募集人数＝market demand、QA完了＝PMF |
| REVENUE EVIDENCE | 具体申込・実支払・更新・全実費込み採算を別々に記録 | 興味・申込＝売上、売上＝持続利益 |

Founder network由来の結果には必ず **FOUNDER NETWORK BIAS** を添える。関係性による礼儀、無償協力、ITに慣れた人への偏り、車好きへの偏り、指示された操作と自発利用の差を記す。面識なしや弱い関係でも個人投稿・紹介由来の選択偏りは消えない。

Founder車両のdebug caseを集計から分離し、Ownerとの関係とWorkshopのFounder既知性も別に残す。Founderが代行した操作はPROXYで、自力完了・自然利用へ加算しない。支援後の成功も消さず別欄へ置く。関係不明・支援量不明はUNKNOWN。

件数には必ず対象層、期間、task版、分母、機会あり／なしを添える。全同意者、task送付者、開始者、完了者、返答者を別集計。未回答・辞退・未完了を落として成功率を上げない。意図しない共有・本人性・安全の未確認を「確認済み」と表示せず、診断・修理手順・原因を生成しない。

## 9. Initial target

以下は **ASSUMPTION / INITIAL TARGET**。CEO未採用、14日内の案件成立義務ではない。

| 層 | 小さい初期目安・受入上限案 | 条件 |
| --- | --- | --- |
| A | 3人、各1カード | iPhone Safari、Android Chrome、PC/Mac browser各1件を狙う。未取得環境は未検証。同じ人の複数端末は人数を増やさない |
| B | 候補最大2人 | 自然な機会が1〜2か月内にあり得る本人。14日で使用しなくても未達・失敗にしない |
| C | 候補最大1拠点・受取担当者1人 | Owner経由または本人同意の紹介。実案件・返却件数のquotaにしない |

受入は合計最大6人、重複は実人数で数える。応募が多くても枠を自動拡大せず、受付停止の短い案内だけで終える。未接触の候補名簿を増やさない。端末がそろわない場合の追加募集・入替は予算とCEO判断へ戻す。

無償協力をv0.1の第一候補とする。一回・任意・中止可能を明示し、永久の無料QA担当や反復義務を想定しない。

| 謝礼案 | 利点 | 欠点・費用・権限 |
| --- | --- | --- |
| 無償のFounder network協力 | 新規謝礼支出なし、既存の信頼で少人数から始めやすい | 関係性・余暇・親切による偏り。辞退・次回拒否を尊重。追加謝礼0円は計画条件であり、既存運営費が無料という意味ではない |
| 小額の一回謝礼 | 負担に報い、知人以外の協力を検討しやすい | 支出、支払手続、謝礼目当ての偏り。初期費用＝CEO承認単価×対象人数＋支払実費。金額・方法はUNKNOWN。継続契約は提案しない。ギフト券・報酬・campaignは別承認まで実施しない |

謝礼を使う場合も肯定的評価・完走・購入を条件にしない。今回価格決定、購入、キャンペーン開始は行わない。

## 10. Founder workload

現在の全社作業票のFounder最大5時間／7日間を維持する。以下は追加枠ではなく、既存のfeedback・自然機会整理の2時間枠内で組み替える **ASSUMPTION / 上限案**。

| PipelineだけのFounder作業 | Week 1上限案 |
| --- | ---: |
| 文案・カード・許可済み確認先の最終確認 | 15分 |
| X・Facebook投稿（別承認後だけ） | 5分 |
| 応答分類・任意同意・カード一括案内 | 20分 |
| 質問への短い回答 | 15分 |
| 結果確認・匿名集計 | 20分 |
| 停止・次回候補・枠の確認 | 15分 |
| 合計 | 90分 |

Week 1は既存QA最大2時間＋財務最大1時間＋feedback/Pipeline計最大2時間で、全社5時間以内。Pipeline以外のfeedbackに少なくとも30分の余地を残す配分案で、使い切らない。Week 2のPipelineは最大60分、同週の全作業も5時間以内。14日のPipeline合計上限案は150分。準備不足なら募集を延期し、裏方の準備時間を枠外へ逃がさない。

通話・日程調整は標準にせず、同じカードを非同期で渡す。DM案は希望者最大6人へ初回案内1回、本人が求めた質問への回答1回まで。追加催促なし。必要な説明が長くなる人へ個別支援を続けず、BLOCKEDとしてカードの課題を残す。週の支援15分枠または全社5時間枠に達したら受付・追加作業を止める。

Coordinationが枠・停止条件を管理し、Product & Customer Researchが層・bias・辞退を整理、QA / Operationsがカードと再現条件を整理、Finance / Revenueが新支出なし・既存実費UNKNOWNを確認する。Routine作業はcost-efficient tier（Luna相当）。重要な証拠解釈の衝突時のみhigher-reasoning tierを一回に絞る。協力者へ特定AI利用を要求しない。

## 11. Draft recruitment copy

すべて **CEO REVIEW DRAFT / NOT SENT**。人数・時間・無償条件は未採用の提案。task URL・個別招待・tokenは含めない。

### X A：Technical / Usability QA

> 作っているWebサービスの動作確認に、10〜15分だけ協力してくれる方を3人ほど探しています。車好きでなくてもOK。スマホやPCで指定画面を開き、迷った所・動かない所を教えてください。今回は謝礼なし・1回だけ。協力できそうならDMへ。

### X B：実整備機会を持つOwner候補

> 今後1〜2か月に点検・修理・車検や整備相談の予定がある、趣味車・旧車などを長く乗る方を2人ほど探しています。整備履歴を工場へ渡す「愛車パスポート」の使い方を確かめたいです。初回確認は5分ほど、謝礼なし。予定を増やす必要はありません。関心があればDMへ。

### Facebook：友人・知人への協力と紹介

> いま作っている、クルマの整備履歴を残すWebサービスの確認に少し力を貸してもらえたら助かります。
>
> ①車に詳しくなくても、スマホ・PCで10〜15分の動作確認をしてくれる方を3人ほど。
> ②今後1〜2か月に整備や相談の予定がある車好きの方、または整備工場の方への紹介もありがたいです。最初の確認は5分ほどで、予定を増やす必要はありません。
>
> 今回は謝礼なしの任意の協力です。ご本人が希望する場合だけ、この募集文を伝えてもらえれば十分です。連絡先を私へ送る必要はありません。関心があればメッセージをください。

Facebookの①と②は返答時にA/B/Cへ分ける。紹介人数を成果とせず、紹介先本人の同意前に連絡しない。使う文面・公開範囲・DM受付条件はCEOが決める。

## 12. First 14-day operating experiment

名称は **RECRUITMENT / HUMAN VALIDATION PIPELINE TEST**。Passport market validationではない。状態は `EXPERIMENT_NOT_RUN`。下記は開始承認後の計画であり、今回実行しない。

| 期間 | 最小作業案 | 観測するもの・止める条件 |
| --- | --- | --- |
| 開始前 | CEOが投稿・文案・受付・人数・無償・保持範囲・開始を決定。検証先と資料の許可を確認。依頼済みα feedbackで重複する確認を減らす | 未承認・不適切な共有・確認先未準備は開始しない。既存feedbackは発言の証拠として使う |
| Day 1–3 | X AとFacebookを各1回だけ投稿する案。先着応答を目的別に分類し、同意したA最大3人へ同じカードを渡す | source→応答→適格→同意→task送付の実数。未準備・辞退・人数上限を残す |
| Day 4–7 | 非同期の10〜15分QAと既存feedbackを整理。質問は受付上限内で回答 | 開始→完了→feedback受領、説明なしの完了、止まった段階、端末、Founder分数。7日で実案件を作らない |
| Day 8–10 | 予算と未充足目的を見てX Bを1回、またはAの再掲1回を選ぶ。枠が埋まっていれば投稿なし | 選択理由を記録。B/Cは自然機会待ち。関係性・紹介元を分ける |
| Day 11–14 | 新規受付・催促を増やさず、全候補の段階と欠測を集計し、CEOへ次の小さい判断を提出 | 投稿を続ける／カードを直す／縮小／停止を証拠で検討。自動延長・案件quota・市場検証完了宣言なし |

post数、応答人数、適格人数、同意人数、送付人数、開始人数、完了人数、feedback受領人数、支援なし完了人数、task所要分、Founder総分をsource別・層別に示す。各率は実数と分母を添え、送付0件なら完了率は算出不能。興味のある応答を未同意の参加に数えない。

X / Facebookはフォロワー・友人数、閲覧範囲、関係性、投稿時刻が違う。同一条件の比較や無作為化をしていないので、人数差から媒体の優劣・一般的転換率を決めない。表示回数等が取得できなければreachはUNKNOWN、post→responseの率も作らない。小さい実数で「この窓口でこのカードが届いた」とだけ判断する。

初回後は、匿名のカード・版・結果・再現条件を再利用する。次回の協力は本人のopt-inから少人数へ新たに依頼する別承認案とし、同じ人へ恒常的に頼らない。二回目のwaveも小さく試して継続運用負担を確認するまで、安定したHuman QA供給とは呼ばない。今回は通知・自動募集を設定しない。

## 13. Success / failure / learning criteria

基準は **ASSUMPTION / 次の小試験への判断案**。開始前に固定し、人数不足で後から合格条件を下げない。

- **継続検討の兆候:** 異なる非Founder協力者2人以上が、同じ版の短いAカードをFounderの追加説明・代理操作なしで終了し、pass/fail/止まった操作を自分で返せる。指定の失敗報告で終えた場合もカード終了として数え、操作成功件数とは分ける。匿名化できる具体的確認結果があり、支援・全社時間上限と共有同意を守れたことが条件。市場成立の合格ではない。
- **学習:** 応答なしなら到達・窓口・文面、応答後に止まれば対象や同意、送付後に止まればURL・ログイン・手順、開始後に止まれば操作・説明・時間、完了後に返答なしなら返答方法を次の確認候補にする。原因は推測せず、理由が得られなければUNKNOWN。
- **縮小・保留:** 一人ずつの長い説明や反復催促がないと進まない、予定外の時間を使う、確認先が準備できない、枠を超える対応が必要ならself-service仮説は弱い。人数を追加して隠さず、カード一つへ縮小または停止する。
- **即時停止:** 意図しない共有、データ喪失、診断・修理指示との重大な誤認、未承認支出・送信があれば対象工程を止め、証拠を保持してCEOへ報告する。安全・権利違反の完走を成果にしない。
- **未判定:** B/Cに自然機会がなければNO_OPPORTUNITYで、実利用・再利用・Workshop価値・支払意思はUNKNOWN。候補数不足も実数のまま報告し、協力不足からProduct価値を否定しない。

### Passport仮説に関するfailure classificationとCEO判断

Pipeline試験の進み具合とPassportの価値判断を分ける。A協力者2人以上という§13の項目はPipeline運用の継続検討の兆候であり、Passportの成否・継続・停止・pivotを決める人数基準ではない。Passportについて人数だけの固定kill thresholdは置かない。以下の層を混同せず、該当するfailureの証拠・機会・関係・支援・代替手段を添えて扱う。

| 分類 | 観察例 | 扱い |
| --- | --- | --- |
| **1. TECHNICAL FAILURE** | 動かない、表示されない、保存できない、共有から返却・Owner承認までのroundtripが壊れている | 該当版・環境・操作のTechnical QA問題として記録し、必要なQAへ戻す。製品価値の否定材料にしない。技術的に使えなかったケースから価値を判定しない |
| **2. USABILITY / COMPREHENSION FAILURE** | 何をするサービスか分からない、操作が分からない、Passportの意味が伝わらない | 説明前の理解、迷った箇所、援助・誘導を記録し、UI・文言・Positioningの問題として扱う。直ちにPassportの価値仮説を否定しない。修正・追加作業を採用するかは別途判断する |
| **3. WORKFLOW FAILURE** | Ownerに確認できる便益がある一方、Workshopが履歴を読まない・返却しない、通常業務で返却負担が高い | Owner → Workshop → OwnerのReturn Loop仮説を再検討する。どの段階で誰が止めたか、相手が受け取ったか、自然な機会か、要した支援・時間を確認する。Workflow不成立をOwner価値の不存在と同一視しない |
| **4. VALUE FAILURE evidence** | 対象のTechnical QAが成立し、利用者が用途を理解し、現実の利用機会がある。それでも「LINEで十分」「紙・整備明細で十分」「履歴を渡す必要を感じない」「次回は使わない」「追加workflowに価値を感じない」といった実際の選択・行動が観察される | Founderとの関係、募集元、自然な機会か、支援量、Workshopの実参加、選ばれた代替手段、発言と行動を示してCEOへ **ENTRY HYPOTHESIS REVIEW** を提案する。発言だけ、機会なし、技術・理解失敗をValue Failureとしない |
| **5. NO OPPORTUNITY** | 観測期間中に自然な点検・修理・車検・相談等の利用機会が来ない | **UNKNOWN**として残す。機会不足・未回答をProduct failureや成功に数えない。不要な入庫や利用誘導で機会を作らない |

#### Value Failure後のEntry Hypothesis Review

ENTRY HYPOTHESIS REVIEWはPassportを救済する追加機能の承認ではなく、Missionへ届く入口を選び直す判断資料である。必要な条件がそろった具体的なValue Failure evidenceがある場合、またはEntry Hypothesisを選び直すのに十分な複数の観察がそろった場合に、CoordinatorがEvidenceと不確実性をまとめてCEOへ戻す。人数だけの固定kill thresholdは置かない。十分さはFounder relationship、自然な利用機会、支援量、対象導線のTechnical QA、Workshopの関与、実際に選ばれた代替手段、観察された行動と母数を合わせて判断する。

一方、不都合な結果のたびに協力者や観察期間を増やし、追加機能を作って検証を延命しない。AI診断、SNS、OCR、media、notification、Workshop機能拡張をPassportの価値不足を埋める目的だけで提案しない。今回のfailureだけから次の入口も決めない。

比較候補は例として、Owner単独のMaintenance History／愛車カルテ、Workshop起点の顧客報告・整備記録、Knowledge Retrieval、Mechanic work record／Professional evidence、その他のEvidenceから得た入口がある。候補を既定路線にせず、それぞれを **Mission Value × Economic Value × Evidence** で比較する。Missionへの具体的な効果、誰が何に対価を払うか、全実費を含む採算の未知、独立した行動Evidenceと反証を併記する。

Passportの継続、Positioning変更、縮小、Front-doorからの撤退、別Entry Hypothesisへのpivotは **CEO Decision Required**。AIは候補とリスクを提示するだけで、Passportを終了・維持したりpivotを採用したりしない。

14日で分かるのは募集・カード・回答の短い運用が回る兆候と負担である。継続的QA供給、Product Pull、PMF、Knowledge再利用、Revenue validation、実費込み利益は別の未知として残る。

## 14. What NOT to build

tester management system、CRM、紹介機能、campaign機能、報酬システム、新analytics、新onboarding、新feedback、SNS機能、application codeを作らない。DB・migration・dependency・外部設定も変更しない。新フォーム・Google Sheet・新サービス契約・上位AI契約・課金・価格を導入しない。今回は文書と既存手段による運用案まで。

[ALPHA_PLAYBOOK](ALPHA_PLAYBOOK.md)には過去の写真共有・Home・参加規模の記述が残る。現在のPassport・共有範囲は[PROJECT_STATE](PROJECT_STATE.md)と対象画面の実装状態を優先確認し、募集で旧仕様を約束しない。旧α/β人数やPositioningの5人試験を今回の初期目標へ自動適用せず、既存方針やBacklogも削除しない。

## 15. CEO decisions required

設計とdocs-only実装は依頼済み。次の実行判断はすべて **CEO DECISION REQUIRED**。このPRのmerge承認だけを投稿・DM・実験開始へ拡張しない。

| CEO判断 | レビュー可能な案 | 現在の状態 |
| --- | --- | --- |
| 実際にXへ投稿するか | 14日最大2投稿。A→B、またはA再掲でB延期 | 未決定 / 未投稿 |
| Facebookへ投稿するか | 1投稿、公開範囲はCEO指定 | 未決定 / 未投稿 |
| どのdraftを使うか | §11のX A / X B / Facebook。目的と順序を選ぶ | 未決定 |
| DM対応範囲 | 本人からの希望者最大6人、初回案内1回＋求められた質問への回答1回、催促なし | 未決定 / 未送信 |
| 初期募集人数 | A3人、B最大2人、C最大1拠点、実人数最大6人 | ASSUMPTION / INITIAL TARGET |
| 謝礼を使うか | v0.1は謝礼なしの任意協力を推奨。有償なら単価・支払方法・総額を別審査 | 未決定 / 支出開始なし |
| 14日experimentを開始するか | §12–13、Pipeline150分以内かつ全社5時間／7日間以内 | 未決定 / EXPERIMENT_NOT_RUN |
| 確認先・参加・同意・保持範囲 | 初回Aは閲覧中心、検証資料の許可、ローカル台帳の保持案。α招待・保存QAは別ゲート | 未決定 / 実データ取得なし |
| Passportの継続・Positioning変更・縮小・Front-doorからの撤退・pivot | Entry Hypothesis ReviewのEvidenceを見てCEOが決定 | CEO DECISION REQUIRED |

CEOが対象・操作・データ・時間・費用を選んだ後、その承認範囲だけを別作業で開始する。今回は設計文書とPR提出で停止する。

参照: [会社OS](company/README.md)、[OPERATING_SYSTEM](company/OPERATING_SYSTEM.md)、[FINANCIAL_GUARDRAILS](company/FINANCIAL_GUARDRAILS.md)、[ALPHA_PLAYBOOK](ALPHA_PLAYBOOK.md)、[ALPHA_LAUNCH_CHECKLIST](ALPHA_LAUNCH_CHECKLIST.md)、[PRIVACY](PRIVACY.md)、[Positioning Decision](strategy/positioning-2026-09/MECHORI_POSITIONING_DECISION.md)、本チャットの第一回経営会議後CEO判断と今回の依頼。確認日はいずれも2026-09-28。外部Web調査・本番DB・feedback原文・請求取得は行っていない。
