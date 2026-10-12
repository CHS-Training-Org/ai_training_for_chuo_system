# User Stories Assessment — recurring-reservation

## Request Analysis

- **Original Request**: 予約申請フォームで毎週・毎月の繰り返しと終了日を指定し、1 回の操作で複数の予約を一括登録する。`POST /api/reservations` が繰り返しパターンを受け付けて複数件を作り、詳細画面でシリーズの情報を確認できる（GitHub Issue #31）
- **User Impact**: Direct（MEMBER が予約申請フォームを操作し、登録結果と詳細画面を確認する。APPROVER は承認画面に並ぶ N 件を処理する）
- **Complexity Level**: Medium（frontend と backend にまたがり、日付の生成規則、全件の重複判定とロールバック、下書き・承認フローとの併用、レスポンスの配列化という複数のシナリオがある）
- **Stakeholders**: MEMBER（定例会議室を繰り返し予約する立場）、APPROVER（承認が必要なリソースで N 件を個別に承認する立場）

## Assessment Criteria Met

- [x] High Priority: **New User Features**（予約申請フォームの繰り返し入力、詳細画面のシリーズ情報）、**User Experience Changes**（既存の申請フローとレスポンスの形が変わる）、**Complex Business Logic**（月末スキップ、基準日からの数え方、自己重複、下書き・承認との併用）
- [ ] Medium Priority: （High Priority に該当するため評価不要）
- [x] Benefits: 受入条件 15 項目を、ストーリー単位の独立した受入条件に分け、Code Generation でのテスト漏れ（特に月末スキップ、終了日当日、日またぎ、自己重複、400 の 3 パターン）を防ぐ

## Decision

**Execute User Stories**: Yes
**Reasoning**: 利用者が直接操作する既存フローの拡張で、日付の生成規則とエラーの分岐が多い。SKIP 条件（純粋なリファクタリング・単純なバグ修正・インフラのみ・ドキュメントのみ）はいずれも該当しない。規模は中程度のため、ストーリーは 8 件に抑える。

## Expected Outcomes

- 繰り返し日の生成規則（毎週・毎月・月末スキップ・終了日当日・日またぎ）が、ストーリー単位の受入条件として書き分けられ、日付生成の純粋関数のユニットテスト項目にそのまま対応する
- 重複時の全件ロールバック、検証の 400、下書き・承認要リソースとの併用が、独立した受入条件になり、`ReservationServiceTest` と `ReservationControllerTest` のテスト項目に対応する
