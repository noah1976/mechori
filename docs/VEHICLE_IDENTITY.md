# VEHICLE_IDENTITY

## 目的

ユーザーが普段使う言語や販売国の名称を尊重しながら、同じ車系統・同じ世代の経験を検索と集合知で結びます。車種マスタにない車両も登録を止めません。

## 表示名と識別子

- メーカー・ブランドは、既知の別名を世界共通のアルファベット表記へ正規化する。例: `フィアット` → `FIAT`、`日産` → `NISSAN`。
- ユーザーが入力したメーカー名と車名は`makeInput`、`modelInput`として失わない。
- 未登録メーカーがラテン文字なら大文字表記へ整えるが、カタログ一致とは扱わない。非ラテン文字を推測で翻字しない。
- 車名は単純な翻訳と市場別名称を区別する。`スカイライン` / `SKYLINE`は同じ市場名の表示差、`ヴィッツ` / `YARIS`は同じ車系統に属し得る別の市場名として扱う。

## 識別の層

1. `brandId`: 世界共通のメーカー・ブランド
2. `modelFamilyId`: 市場名をまたいで関連付ける車系統
3. `generationId`: 年式、型式等で区別する世代。特定できなければ空
4. `variantId`: 同一世代内で機関・駆動系等が大きく異なる仕様系統。特定できなければ空
5. `grade`: ユーザーが入力した個別グレード名。正規IDに置き換えず保持
6. `marketNameId`: 販売国・地域で使用された車名
7. `marketRegion`: 市場名が使われる国・地域

同じ車名でも世代や市場仕様が異なる場合があるため、名前だけで`generationId`や`variantId`を確定しません。年式・型式が不足する場合は`modelFamilyId`までの接続を許容します。グレード名だけで複数世代に存在し得る場合も世代を推測しません。

### 同一世代内の仕様差

整備ナレッジでは、同じ車名・同じ世代でも仕様系統を分けます。例としてR33スカイラインでは、日産公式資料上、GTS25t Type Mは`ECR33`・`RB25DET`、GT-R V-specは`BCNR33`・`RB26DETT`であり、同世代だからといって完全一致事例にはできません。

- 型式が確認できた場合: `confirmed_model_code`
- 世代を含むグレード表記だけの場合: `grade_candidate`
- 世代まで候補化できる場合: `generation_candidate`
- グレードと型式が矛盾する場合: `conflicting_inputs`
- 特定できない場合: `unmatched`

検索・AI整理の一致範囲は、`exact_variant`、`same_generation_other_variant`、`same_family_other_generation`、`same_family_unspecified`へ分けます。仕様不明の事例を完全一致件数へ昇格しません。

R33の初期辞書は、[日産 GTS25t Type M](https://www2.nissan.co.jp/HERITAGE/DETAIL/426.html)と[日産 GT-R V-spec](https://www.nissan.co.jp/HERITAGE/DETAIL/211.html)を根拠にしています。辞書は例示的な小規模集合であり、全グレードを網羅した車種マスタではありません。

## メーカーをまたぐ関係

メーカー名が違っても関係する車両は、単一メーカー名へ統合せず、ブランドと市場名を保持したまま関係グラフで結びます。

| 関係 | 扱い | 例 |
|---|---|---|
| `market_name_variant` | 地域・販売ブランドによる名称差。同じ車系統だが市場仕様は別確認 | OPEL Speedster / VAUXHALL VX220、TOYOTA Vitz / YARIS |
| `oem_rebadge` | OEM姉妹車。車系統は接続するが専用装備・型式・部品適合は別確認 | MAZDA AZ-1 / SUZUKI CARA |
| `brand_transition` | 生産・販売ブランドの移管。時期と仕様差を保持 | FIAT X1/9 / BERTONE X1/9 |
| `licensed_continuation` | 設計・生産権を引き継いだ継承車。別車系統のまま関連付ける | LOTUS Seven / CATERHAM Seven |
| `inspired_derivative` | 元車を再現・着想した派生。類似事例の参考候補に留める | LOTUS Seven / BIRKIN S3 Roadster |

同じ`modelFamilyId`を持つ場合でも、世代、型式、エンジン、市場仕様を確認せずに部品適合や修理事例を「同一」としません。`licensed_continuation`と`inspired_derivative`は別の`modelFamilyId`を維持し、通常検索の完全一致件数へ混ぜません。

初期関係の根拠は、メーカーまたは正規系統の資料を優先します。[Caterham](https://caterhamcars.com/us/about/history)はLotus Sevenの生産権等を1973年に取得したと説明し、[Suzuki](https://www.suzuki.co.jp/suzuki_digital_library/1_auto/cara.html)はCARAをAZ-1のOEM供給車と説明しています。[Stellantis Media](https://www.media.stellantis.com/it-it/opel/press/21-anni-fa-opel-presentava-la-speedster)はOpel Speedsterの英国市場名をVauxhall VX220と説明しています。Birkinは[正規販売資料](https://www.birkin.com.au/about-birkin.php)がLotus Sevenを基にした再現車と説明しているため、正規継承ではなく派生として扱います。

## 登録フロー

1. ユーザーはメーカーと車名を自由入力する。
2. 既知の別名と一致した場合、正規メーカー表記と車系統候補をその場で表示する。
3. 確実な別名一致だけを`matched_alias`として保存する。
4. メーカーだけ一致した場合は`brand_only`、不明なら`unmatched`とする。
5. 任意のグレード・型式から世代と仕様系統を段階的に候補化する。矛盾時は保存を妨げず警告する。
6. 候補がなくても入力原文で登録を完了し、登録後の車両情報編集から正規IDへ接続できる。

車種フォローと集合知の関連付けには、利用できる場合は`modelFamilyId`を使います。市場名が違う記録を同じ世代・仕様だと断定せず、検索結果では「同一世代」「別市場名」「同じ車系統・別世代」等を分けます。

## 写真による候補

写真認識は将来の入力補助であり、車種の自動確定機能にはしません。

```text
写真を選択
  → 端末内で縮小・位置情報除去
  → 車両候補を0件以上生成
  → 文字入力、年式、型式、市場との整合を表示
  → ユーザーが候補を選択または自由入力へ戻る
  → 確認された正規IDだけを保存
```

- ナンバープレート、顔、背景、位置情報を識別目的で保存しない。
- 写真だけから年式、グレード、世代、市場仕様を断定しない。
- 候補ゼロや誤認でも登録を続行できる。
- 外部AI・画像認識Providerへ送る場合は、送信範囲、保持、学習利用、費用、同意を事前に別承認する。
- 候補の由来を`text_alias`、`photo_candidate`等で区別し、写真候補を確認済み別名と同じ確度にしない。

αでは外部画像認識を使用せず、テキスト別名による候補表示だけを実装します。

## カタログ運用

- 初期辞書は動作検証用の小さな集合であり、全世界の車種マスタではない。
- 別名追加は既存の車両入力原文を変更しない。
- 誤統合を分離できるよう、正規化辞書と車両個体を別データとして扱う。
- カタログ変更では、影響する車両・フォロー・検索対象を監査できるようにする。
- 世代・市場の対応は公式資料や複数資料で確認し、AIの推測だけで確定しない。
