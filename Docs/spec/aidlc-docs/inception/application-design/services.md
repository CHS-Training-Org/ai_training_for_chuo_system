# Services

新規 Service はない。既存の `ResourceService.list` を拡張する。

## ResourceService.list のオーケストレーション

1. `normalizeKeyword(keyword)` で正規化する（trim。空・空白のみは null）
2. `buildSpec(category, normalizedKeyword, isAdmin)` で Specification を組み立てる（常に非 null。`Specification.allOf` で結合）
   - 非 ADMIN: `isActiveTrue()` を AND
   - category が非 null: `hasCategory` を AND
   - keyword が非 null: `keywordContains` を AND
   - 上記がすべて該当しない場合（ADMIN・category なし・keyword なし）は `Specification.unrestricted()`（WHERE なし）。`Specification.where(null)` や `null` の受け渡しはしない
3. 経路を選ぶ
   - **通常経路**（`from` または `to` が null）: `resourceRepository.findAll(spec, pageable)` の結果を `ResourceResponse` に変換する
   - **空き確認経路**（`from` と `to` が両方あり）: `resourceRepository.findAll(spec)` で候補を全取得し、占有リソースを除外したうえで手動ページネーションする（既存ロジックを維持。keyword は候補取得の段階で適用済み）

## 不変条件

- ロール別可視性は不変（ADMIN は inactive を含み、それ以外は active のみ）。keyword はその範囲内の絞り込みである
- `keyword` 未指定・空のときの結果は現状と同一（後方互換）
- `from` / `to` が片方だけの場合の 400 は Controller の既存チェックを維持する
- 一覧のソート順は現状維持（ソート選択は別課題 `resource-list-sort`）
