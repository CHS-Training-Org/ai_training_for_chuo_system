# Backend Summary — reservation-list-filter

## 変更ファイル（すべて既存ファイルの修正、新規ファイルなし）

- `backend/src/main/java/com/example/bookflow/domain/ReservationRepository.java`
  - `RESOURCE_NAME_MATCH`（大文字小文字非依存の部分一致、ESCAPE `!`）・`PERIOD_MATCH`（半開区間 `[startAt, endAt)` の重複判定）の2つの共通 JPQL 条件をインターフェース定数として追加
  - 新規12メソッド追加（既存4メソッド `findAllFetch`/`findByStatusInFetch`/`findByRequesterIdFetch`/`findByRequesterIdAndStatusInFetch` は無変更）：resourceName有無・period有無・status有無・role（ADMIN/非ADMIN）の組み合わせを網羅する `find...Fetch` 系メソッド（`business-logic-model.md` の16メソッド一覧表が単一の正）
  - 各メソッドは `JOIN FETCH r.resource JOIN FETCH r.requester` を維持（N+1回避、既存方針を踏襲）
- `backend/src/main/java/com/example/bookflow/application/ReservationService.java`
  - `list()` のシグネチャに `String resourceName`・`LocalDateTime from`・`LocalDateTime to` を追加
  - `normalizeResourceName`（trim・空文字→null）・`escapeLikeResourceName`（`!`→`!!`、`%`→`!%`、`_`→`!_` の順でエスケープ）の private ヘルパーを追加（`ResourceService` と同じロジックをローカルに実装、クラス間の静的依存は作らない）
  - `hasResourceNameFilter`・`hasPeriodFilter`・`hasStatusFilter`・`isAdmin` の組み合わせで16メソッドに分岐するロジックを実装
- `backend/src/main/java/com/example/bookflow/presentation/ReservationController.java`
  - `list()` に `resourceName`/`from`/`to` を `@RequestParam(required = false)` で追加
  - `from`/`to` の同時指定チェック（`(from == null) != (to == null)` で `ValidationException`）を `ResourceController` と同じパターンで追加

## テスト

- `backend/src/test/java/com/example/bookflow/application/ReservationServiceTest.java`
  - 新規 `@Nested class List_`（8件）：role×resourceName有無×period有無×status有無の組み合わせごとの repository メソッド呼び分け検証、ワイルドカードエスケープ検証（`"50%off_now!"` → `"50!%off!_now!!"`）、空白resourceNameが未フィルタ扱いになることの検証
- `backend/src/test/java/com/example/bookflow/presentation/ReservationControllerTest.java`
  - resourceName・period 専用 seed（リソース4件: `RESOURCE_FILTER_A_ID`/`RESOURCE_FILTER_B_ID`（デコイ）/`RESOURCE_FILTER_PERCENT_ID`/`RESOURCE_FILTER_PERCENT_DECOY_ID`、予約6件）を追加
  - 統合テスト11件を追加：大文字小文字非依存一致、`%` のリテラル一致（ワイルドカード化しないことの検証）、空白resourceNameの無視、期間重複の包含/除外、境界隣接（半開区間）の非重複、`from`のみ/`to`のみ指定時の400検証（2件）、resourceNameフィルタ時のロール別可視性（MEMBER/ADMIN、2件）、resourceName+status のAND合成

## 自己検証（break-and-verify）

過去ユニット（resource-search/resource-sort）のCIレビューで指摘された「対象コードを無効化しても pass してしまう弱いテスト」パターンを避けるため、以下を実装直後に自己検証した（各ケースで意図したテストのみが red になることを確認し、復元後に `git diff --stat` が元の差分と一致することを確認済み）：

- `RESOURCE_NAME_MATCH` の `LOWER` 除去 → `list_resourceNameCaseInsensitive_matchesRegardlessOfCase` が red
- `escapeLikeResourceName` の `%` エスケープ除去 → `list_resourceNameWithPercentCharacter_matchesLiteralPercentNotWildcard` が red
- `PERIOD_MATCH` の境界条件変更（`<`/`>` → `<=`/`>=`） → `list_periodAdjacentToReservation_excludesNonOverlappingBoundary` が red
- `PERIOD_MATCH` の片側条件除去（`startAt`/`endAt` いずれかのみ） → `list_periodOverlap_includesReservationWithinRangeAndExcludesOutsideRange` が red
- `isAdmin` の強制 `true` 固定 → 新規 `list_memberWithResourceNameFilter_doesNotSeeOtherMembersMatchingReservation` に加え既存 `list_memberAccess_returnsOwnReservationsOnly` も red（既存の役割分離テストとの非重複を確認）
- `hasStatusFilter` の強制 `false` 固定 → 新規 `list_resourceNameWithStatusFilter_appliesAndCondition` に加え既存 `list_withStatusFilter_returnsFilteredReservations` と Service層の組み合わせテスト3件も red
- Controller の from/to 同時指定チェック削除 → `list_fromOnlyWithoutTo_returns400ValidationError`・`list_toOnlyWithoutFrom_returns400ValidationError` が red

## 実行結果

- `./gradlew spotlessApply checkstyleMain`：差分なし。Checkstyle 警告2件（`ReservationRepository.java:33`/`:45` の `MethodName`）は本変更と無関係な既存メソッド（`findByResource_IdAndStatusIn`・`findByResource_IdInAndStatusIn`）
- `./gradlew test --tests "*ReservationServiceTest" --tests "*ReservationControllerTest"`：BUILD SUCCESSFUL（`ReservationServiceTest$List_` 8件、`ReservationControllerTest` 29件、すべて成功）
- `./gradlew test`：バックエンド全体 BUILD SUCCESSFUL

## 技術判断の根拠（Functional Design からの変更なし）

- Resource の `from`/`to` 可用性フィルタは候補リソースを取得後に Java 側で重複する予約を除外する2段階処理（手動ページネーション）が必要だったが、Reservation 自身の `from`/`to` フィルタは `Reservation.startAt`/`endAt` に対する単一エンティティの JPQL 述語で表現できるため、既存の `Page<Reservation>` によるDBページネーションをそのまま維持できる（手動ページネーションへの変更は不要）
- resourceName のワイルドカードエスケープはビジネス要求シートに明記はないが、keyword 検索（Issue #23）と同一メカニズム（`LOWER` + `LIKE`）であるため一貫性のため適用（BR-03）
- 16メソッドの組み合わせ構成は、既存の「nullable JPQL 条件を避ける」方針（H2/PostgreSQL のパリティ懸念）を踏襲し、共通 JPQL 定数で重複ロジックのドリフトを防止
