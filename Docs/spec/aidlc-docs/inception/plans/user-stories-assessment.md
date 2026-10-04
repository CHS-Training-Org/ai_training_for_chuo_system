# User Stories Assessment — resource-list-sort

## Request Analysis

- **Original Request**: `docs-next/docs/spec/enhancements/beginner/resource-list-sort.md`（リソース一覧のソート順選択）
- **User Impact**: Direct（`/resources` 画面に新規UI要素〔ソート選択ドロップダウン〕が追加され、一覧の表示順が変わる）
- **Complexity Level**: Medium
- **Stakeholders**: BookFlow認証済みユーザー（MEMBER/APPROVER/ADMIN共通）

## Assessment Criteria Met

- [x] High Priority: **New User Features** — ユーザーが直接操作する新規UI（ソート選択ドロップダウン）
- [x] High Priority: **User Experience Changes** — 既存の一覧表示順（登録日時昇順固定）が変更され、ユーザーの操作フローに並び替えという新しい手順が加わる
- [x] Medium Priority: **Scope** — frontend（ドロップダウンUI）・backend（`sort`パラメータ・2つの取得経路への適用）にまたがる
- [x] Medium Priority: **Options** — ソート選択UIの構造（フィールド+方向を1つにまとめるか分離するか）に複数の実装選択肢がある

## Decision

**Execute User Stories**: Yes
**Reasoning**: ユーザーが直接操作する新規UI要素の追加であり、High Priority Execution の「New User Features」「User Experience Changes」に該当する。前回ユニット（resource-search）と同様の判断基準。

## Expected Outcomes

- ソート選択UIの具体的な挙動（フィールド+方向の表現方法、ページネーションとの関係）を受入条件レベルで明確化する
- 既存のkeyword検索・category・from/toフィルタとの組み合わせ時の期待動作を明文化する
