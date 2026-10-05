# Functional Design Plan — ユニット: resource-sort（リソース一覧のソート順選択）

Application Design/Units Generation は SKIP 済みのため、`requirements.md`・`stories.md`（INCEPTION 成果物）を直接の入力として使う。

## 実行チェックリスト

- [x] Step 1: `business-logic-model.md` を生成する（ソート適用のデータフロー、2 経路〔`listPaginated`／`listWithAvailabilityFilter`〕それぞれでの `Sort` の扱い方）
- [x] Step 2: `business-rules.md` を生成する（ホワイトリスト検証・デフォルトソート・NULL capacity・既存フィルタとの合成ルール）
- [x] Step 3: `domain-entities.md` を生成する（スキーマ変更がないことの確認）
- [x] Step 4: `frontend-components.md` を生成する（`ResourceFilterForm` のソート選択 UI・`page.tsx`・`server/actions/resources.ts` の変更点）

## 確認済み事項（Requirements Analysis・User Stories から持ち越し、再確認不要）

- 不正な `sort` 値 → 400 VALIDATION_ERROR
- capacity が NULL のリソース → 常に末尾
- UI 構造 → フィールド+方向を 1 つの Select に統合（5 選択肢）
- ソート変更時のページネーション → 1 ページ目にリセット（既存の `handleSubmit` 実装で自然に実現）

## 本ステージで新たに決定する技術非依存の設計判断

- **名称ソートの大小文字の扱い**: 要件はキーワード「検索」のような大文字小文字非依存一致を求めていない（あくまで「アルファベット順」の並び替え）ため、自然順（大小文字を区別する標準の文字列比較）をバックエンド・フロントエンドの両経路で一貫して採用する。キーワード検索（Issue #23）の大文字小文字非依存とは独立した設計判断であり、混同しない
- **NULL capacity の実現方式**: `listPaginated` 経路は DB の `ORDER BY ... NULLS LAST` 相当（Spring Data `Sort.Order` の null 処理指定）に委ねる。`listWithAvailabilityFilter` 経路は Java 側の `Comparator`（`nullsLast` 相当）で実現する。両経路とも最終的な見え方が一致することを Build and Test で確認する

曖昧な点はなし（Requirements Analysis・User Stories で主要な判断は確定済み）のため、本ステージでの追加確認質問はなし。

## 承認

この内容で Functional Design 成果物を生成し、承認を得てから Code Generation へ進む。
