# Business Rules — reservation-list-filter

## BR-01: 大文字小文字を区別しない部分一致

`resourceName` は `reservation.resource.name` に対して、大文字小文字を区別せず部分文字列として含まれる予約を検索対象とする。

- **対応要件**: RSV-01, RSV-04
- **実装方式**: keyword 検索（Issue #23）と同じ `LOWER(r.resource.name) LIKE LOWER(...)` パターン

## BR-02: 未入力（null/空/空白のみ）は「フィルタなし」

`resourceName` を trim した結果が空文字の場合、resourceName フィルタを一切適用しない。

- **対応要件**: RSV-05
- **適用層**: フロントエンド（送信前）・バックエンド（受信後）の両方で trim・null 判定を行う（多層防御。keyword 検索と同じ方針）

## BR-03: ワイルドカード文字のエスケープ

`resourceName` に `%` または `_` が含まれる場合、それらは LIKE 演算子のワイルドカードとしてではなく、リテラル文字として扱われるようエスケープする。

- **対応要件**: ビジネス要求シートに明記は無いが、keyword 検索（NFR-05）と同一のメカニズム（LOWER+LIKE 部分一致）を使うため、一貫性のために適用する
- **実装方式**: keyword 検索と同じエスケープ文字 `!`（`\` ではなく `!` を使う理由も同じ：Java 文字列リテラルと JPQL の二重エスケープ回避）

## BR-04: from/to の重複判定は半開区間 overlap

`from`・`to` で指定した期間と、予約の `startAt`〜`endAt` が重複する予約を対象とする。判定ロジックは既存の `ResourceService.overlaps`（半開区間 `[start, end)`、`existingStart.isBefore(to) && existingEnd.isAfter(from)`）と同一の意味論を用いる。JPQL では `r.startAt < :to AND r.endAt > :from` と表現する。

- **対応要件**: RSV-02
- **理由**: `checkConflict` の重複判定と一致させることが、ビジネス要求シートの AI 活用ポイント欄で明示的に求められている

## BR-05: from/to の同時指定必須

`from`・`to` のいずれか一方のみが指定された場合は `400 VALIDATION_ERROR` とする。

- **対応要件**: RSV-06
- **実装方式**: 既存の `ResourceController#list` の `from`/`to` 同時指定チェックと同じパターン（Controller 層で `ValidationException` を throw）

## BR-06: 既存のロール別可視範囲は新規フィルタと独立して維持

ADMIN は全予約、それ以外のロールは自分の予約（`requesterId` 一致）のみという既存の可視範囲は、resourceName・period フィルタの適用有無に関わらず常に維持される。

- **対応要件**: 既存仕様の維持（回帰させてはならない制約として明記）

## BR-07: 既存パラメータとの後方互換性

`resourceName`・`from`・`to` のいずれも送信されない既存の API 呼び出しの動作は一切変化しない（既存4メソッドは無変更）。

- **対応要件**: NFR-04
