# GLOSSARY_JA_EN

## 目的

UI、検索、データモデル、安全表示で使う日本語と英語を統一します。車種固有語や整備書上の正式名称は、信頼できる出典を確認してから追加します。

## サービス・車両

| コード・概念 | 日本語 | 英語 | 使用上の注意 |
| --- | --- | --- | --- |
| Vehicle | 車両 | Vehicle | クルマとバイクを含む上位概念 |
| My Garage | マイガレージ | My Garage | 所有・管理車両の画面名 |
| Vehicle specification | 車両仕様 | Vehicle specification | 年式、エンジン、仕向地等の一致範囲 |
| Match scope | 車両一致範囲 | Vehicle match scope | 一致率だけでなく差異を表示する |
| Exact specification | 同一仕様 | Exact specification | 完全適合を保証しない |
| Same model, other year | 同車種・別年式 | Same model, other year | 年式差を明示する |
| Shared engine/component | 共通エンジン・部品 | Shared engine or component | 別車種を含むことを明示する |
| PhysicalVehicle | 車両個体 | Physical vehicle | Ownerや外部identifierから独立した内部参照。法的所有権を表さない |
| VehicleRelationship | 車両との関係 | Vehicle relationship | User / Organizationが期間付きでclaimする関係。法的Ownershipの証明ではない |
| EvidenceAccessGrant | Evidence閲覧許可 | Evidence access grant | 過去Evidenceのauthor変更ではなく、許可されたprojectionへのAccess |
| Recovery matching | 継承照合 | Recovery matching | identifierをPublic Searchにせずserver-sideで候補照合する |

## 整備記録

| コード・概念 | 日本語 | 英語 | 使用上の注意 |
| --- | --- | --- | --- |
| MaintenanceEvent | 整備イベント | Maintenance event | 1回の入庫・整備機会 |
| MaintenanceAction | 個別作業 | Maintenance action | 点検、交換、調整等 |
| Observation | 症状・観察事項 | Observation | 利用者が確認した現象 |
| Cause candidate | 原因候補 | Possible cause reported | 「原因」と断定しない |
| Reported check | 報告された確認箇所 | Reported check | 作業指示ではない |
| Reported action | 報告された対応 | Reported action | 推奨表現にしない |
| Improved | 改善報告あり | Improvement reported | 因果や再現性を保証しない |
| No change | 変化なし | No change reported | 改善例と同時に表示する |
| Worsened | 悪化報告あり | Worsening reported | 非表示にしない |
| Unresolved | 未解決 | Unresolved | 正直な未解決を低評価にしない |
| Part number | 部品番号 | Part number | 1文字単位でユーザー確認する |

## 走行距離・メーター

| コード・概念 | 日本語 | 英語 | 使用上の注意 |
| --- | --- | --- | --- |
| OdometerEpisode | メーター期間 | Odometer episode | 1つのメーター個体・連続期間 |
| OdometerReading | メーター表示値 | Odometer reading | 累積実走行距離と同一視しない |
| Meter replacement | メーター交換 | Odometer replacement | 回数に上限を設けない |
| CumulativeDistanceEstimate | 推定累積走行距離 | Estimated cumulative distance | 根拠、範囲、確度を併記する |
| Needs context | 経緯確認が必要 | Context required | 逆行を虚偽扱いしない |

## 出典・確認

| コード・概念 | 日本語 | 英語 | 使用上の注意 |
| --- | --- | --- | --- |
| Owner confirmed | オーナー確認済み | Owner confirmed | 内容の正確性保証ではない |
| Mechanic confirmed | メカニック確認済み | Mechanic confirmed | 確認者と対象範囲を示す |
| Official source | 公的・公式資料 | Official source | 発行元、版、対象範囲を示す |
| AI draft | AI整理・未確認 | AI-organized draft | 確認済み事実にしない |
| Unconfirmed | 未確認 | Unconfirmed | 単独事例として扱う |
| Independent report | 独立事例 | Independent report | 転載・翻訳重複を除く |
| Evidence source | 出典 | Evidence source | 権利・保持状態も追跡する |
| Revision | 訂正 | Revision | 誤りの修正を不利益にしない |

## 安全

| コード・概念 | 日本語 | 英語 | 使用上の注意 |
| --- | --- | --- | --- |
| LOW | 一般注意 | General caution | 安全保証ではない |
| CAUTION | 要注意 | Caution | 故障、けが、二次被害への注意 |
| CRITICAL | 重大な安全情報 | Critical safety information | 専門家確認と強い警告 |
| Expert confirmation | 専門家確認 | Expert confirmation | Professional契約と分離する |
| Reference case | 参考事例 | Reference case | 診断・修理指示ではない |

## 公開・プライバシー

| コード・概念 | 日本語 | 英語 | 使用上の注意 |
| --- | --- | --- | --- |
| Private record | 非公開の個人記録 | Private maintenance record | 公開KnowledgeCaseと分離する |
| Sharing draft | 共有候補 | Knowledge submission draft | 明示操作で作成する |
| Public knowledge | 公開ナレッジ | Public knowledge case | 個人記録の正本ではない |
| Redacted derivative | マスク済み派生画像 | Redacted derivative | 原本と別オブジェクト |
| Manual privacy review | プライバシー目視確認 | Manual privacy review | 自動検出ゼロ件でも必要 |
| Delete | 削除 | Delete | 匿名化、法的保全と区別する |
| Anonymize | 匿名化 | Anonymize | 再識別可能性を確認する |

## プラン

| 日本語・表示名 | 英語 | 使用上の注意 |
| --- | --- | --- |
| Free | Free | 基本記録・Evidence supply。愛車登録の台数上限なし |
| Owner Plus | Owner Plus | 高度管理・処理量・未登録車種検索等の個人向け補助収益仮説 |
| Professional | Professional | Web業務検索。契約を技量認証にしない |

## 未確定

- FIAT Barchetta固有の型式、世代、仕様差の正式表記
- バイク固有語
- 地域ごとの車検・法令用語
- バッジの正式名称
- 日本語での「メーター期間」の最終UI表現
