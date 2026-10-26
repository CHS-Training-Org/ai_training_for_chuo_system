# Services（csv-export）

**作成日時**: 2026-10-26T01:37:50+00:00

## `ReservationReportService`（新規、application 層）

| 項目 | 内容 |
|---|---|
| 責務 | 帳票用の予約の取得。入力の検証、検索条件の組み立て、行 DTO への詰め替え |
| トランザクション | `@Transactional(readOnly = true)`。`open-in-view: false` のため、LAZY 関連（リソース名、申請者名）は JOIN FETCH で取得し、このトランザクション内で `ReservationCsvRow` に詰め替えてから返す |
| 依存 | `ReservationRepository`（`JpaSpecificationExecutor`）、`ReservationSpecifications` |
| 依存しないもの | HTTP（`HttpServletResponse` 等）、CSV の書式。CSV 化は presentation 層の `ReservationCsvWriter` が担う |

### 処理の組み立て（`findRows`）

1. `from` と `to` が両方あり `from.isAfter(to)` なら `ValidationException`（400）を投げる。
2. `fromInclusive = from == null ? null : from.atStartOfDay()`、`toExclusive = to == null ? null : to.plusDays(1).atStartOfDay()` を求める。
3. `fetchResourceAndRequester()`、`startAtFrom(fromInclusive)`、`startAtBefore(toExclusive)`、`statusIn(statuses)` を AND で結合する。
4. `findAll(spec, 開始日時昇順 -> 予約 ID 昇順)` で取得する。
5. `ReservationCsvRow::from` で詰め替えて返す。

## Controller から見た処理の流れ

`ReportController.reservationsCsv` は次の順で処理し、業務ロジックを持たない。

1. `reservationReportService.findRows(from, to, status)` で行の一覧を得る。
2. `ByteArrayOutputStream` を用意し、`reservationCsvWriter.write(rows, out)` で CSV を書く。
3. ファイル名を組み立て、ヘッダを付けて `ResponseEntity.ok()` で返す。

認可は Controller の `@PreAuthorize` が担い、Service はロールを見ない（ADMIN 以外が Service に到達しない前提）。既存の `UserController` と同じ分担である。

## frontend の BFF（Route Handler）

Route Handler は Service 層を持たず、backend への中継に限る。

- JWT の取得：`getAccessToken()`（`lib/session.ts`）
- backend の呼び出し：`createApiClient(getAccessToken).getRaw("/reports/reservations/csv", params)`
- 業務ルール（期間の判定、ラベル、エスケープ）は持たない。正は backend とする。フォームでの日付の前後チェックは、利用者に早く気づかせるための補助で、backend の検証を置き換えない。
