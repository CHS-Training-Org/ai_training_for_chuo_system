# User Stories Assessment — usage-report

## Request Analysis

- **Original Request**: ADMIN がリソース別の利用実績（承認済み予約の件数と合計利用時間）を、期間を指定して集計し、`/admin/reports` の棒グラフと表で確認できる機能（`GET /api/statistics/resources` と統計ページ）を追加する
- **User Impact**: Direct（ADMIN が新しい画面で期間を指定し、グラフと表を読む）
- **Complexity Level**: Medium（frontend と backend にまたがり、期間重複・切り詰め・0 件のリソースの扱い・ロール別の拒否に複数シナリオがある）
- **Stakeholders**: ADMIN（利用状況を把握する立場）、MEMBER・APPROVER（統計を見られないことを保証される立場）

## Assessment Criteria Met

- [x] High Priority: **New User Features**（新しい統計ページとグラフ）、**Multi-Persona Systems**（ADMIN は可、MEMBER・APPROVER は 403 とロールで挙動が分かれる）、**Complex Business Logic**（期間での切り詰め、0 件のリソースの含め方）
- [ ] Medium Priority: （High Priority に該当するため評価不要）
- [x] Benefits: 受入条件 9 項目を、ストーリー単位の独立した受入条件に分け、Code Generation でのテスト漏れ（特に期間の境界と 0 件のリソース、ステータスの除外）を防ぐ

## Decision

**Execute User Stories**: Yes
**Reasoning**: 新しい画面で操作して結果を読む新規機能であり、ロールによって結果が異なり、集計の規則（切り詰め・0 件の扱い）にシナリオが多い。SKIP 条件（純粋なリファクタリング・単純なバグ修正・インフラのみ・ドキュメントのみ）はいずれも該当しない。ただし規模は小さいため、ストーリーは 5 件程度に抑える。

## Expected Outcomes

- ADMIN の操作（表示・期間指定）と、集計の規則（対象ステータス・0 件のリソース）、MEMBER・APPROVER の拒否を、独立した受入条件として書き分けられる
- 切り詰めと合算の受入条件が、`StatisticsServiceTest`（集計ロジック）のテスト項目にそのまま対応する
