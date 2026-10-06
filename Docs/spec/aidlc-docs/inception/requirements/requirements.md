# Requirements — reservation-list-filter（Issue #24）

## Intent Analysis Summary

- **User Request**: `docs-next/docs/spec/enhancements/beginner/reservation-list-filter.md`（予約一覧のフィルタ拡張）
- **Request Type**: Enhancement（既存機能への追加）
- **Scope**: Multiple Components（frontend + backend）
- **Complexity**: Moderate（既存の「ロール×status有無」4メソッド構成に resourceName・from/to を加えると最大16メソッドの組み合わせになる設計判断が必要。from/to の重複判定の意味論を既存の `checkConflict`/`overlaps` と一致させる必要あり）
- **Depth**: Standard

## 機能要件

| # | 要件 |
|---|------|
| RSV-01 | `GET /api/reservations` に `resourceName` パラメータを追加し、`Reservation.resource.name` への部分一致で絞り込める |
| RSV-02 | `GET /api/reservations` に `from`・`to` パラメータを追加し、予約期間（`startAt`〜`endAt`）が指定期間と重複する予約を返す。重複判定は既存の `ResourceService.overlaps`（半開区間 `[start, end)`、`existingStart < to && existingEnd > from`）と同一の意味論を用いる |
| RSV-03 | 予約一覧画面に `resourceName`・`from`・`to` の入力 UI を追加し、既存のステータスタブと AND 条件で組み合わせられる |
| RSV-04 | `resourceName` は大文字小文字を区別しない部分一致とする（keyword 検索・Issue #23 と同じ `LOWER()` 比較） |
| RSV-05 | `resourceName` が空・空白のみの場合は未指定として扱う（既存の keyword・sort パラメータと同じ trim・null 変換パターン） |
| RSV-06 | `from`・`to` は同時指定必須とする（片方のみの指定は 400 VALIDATION_ERROR。既存の Resource 空き確認エンドポイントと同じバリデーションパターン） |

## 非機能要件

| # | 要件 |
|---|------|
| NFR-01 | `resourceName`・`from`/`to` は、既存の「ロール×status有無」4メソッド構成に対する専用 `@Query` メソッドとして実装し、nullable パラメータの単一 JPQL は使わない（`ResourceRepository` の keyword 実装と同じ方針。H2/PostgreSQL のパラメータ型推論差異を避けるため） |
| NFR-02 | 共通の JPQL 条件（resourceName 一致・from/to 重複判定）はインターフェース定数として集約し、メソッド間の重複・ズレを防ぐ（`ResourceRepository.KEYWORD_MATCH` と同じパターン） |
| NFR-03 | from/to の重複判定は `Reservation` エンティティ自身の `startAt`/`endAt` への JPQL 述語で完結させ、Java 側の手動ページネーションは導入しない（既存の `Page<Reservation>` ベースの DB ページングを維持する） |
| NFR-04 | 既存の `ReservationServiceTest`・`ReservationControllerTest` が継続して pass すること |

## 受入条件（ビジネス要求シートより）

- [ ] リソース名で絞り込むと、そのリソース名を含む予約のみ表示される
- [ ] 期間（from/to）で絞り込むと、指定期間にかかる予約のみ表示される
- [ ] ステータスタブ・リソース名・期間を組み合わせて絞り込める
- [ ] フィルタをリセットすると全件表示に戻る
- [ ] バックエンドの既存テストが引き続き pass する

## 技術コンテキスト（Reverse Engineering 由来）

- `code-structure-reservation-list-filter.md` 参照。16 メソッドの組み合わせ爆発への対応方針・from/to の意味論・resourceName の大文字小文字非依存の扱いが本ユニットの主要な設計判断点

## 拡張設定（Requirements Analysis で確認済み）

| Extension | Enabled | 備考 |
|---|---|---|
| Security Baseline | No | ユーザー回答（推奨どおり不採用） |
| Resiliency Baseline | No | ユーザー回答（推奨どおり不採用） |
| Property-Based Testing | No | ユーザー回答（推奨どおり不採用） |

## 確認済みの設計判断（ユーザー回答）

- `from`/`to` の重複判定 → `checkConflict`/`overlaps` と同じ overlap 判定（RSV-02）
- `resourceName` の大文字小文字 → 区別しない（RSV-04）
