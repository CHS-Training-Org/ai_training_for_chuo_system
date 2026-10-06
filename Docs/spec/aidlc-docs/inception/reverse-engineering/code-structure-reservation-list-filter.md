# Code Structure — reservation-list-filter（Issue #24）追加調査

> 既存の RE 成果物（`code-structure-resource-sort.md` 等）は Resource ドメイン専用のため、本課題（Reservation ドメイン）には転用不可。全面的な再生成はせず、本課題の設計判断に必要な部分のみを本ファイルに記載する。

## 現状の一覧取得実装

- `ReservationController#list`（`GET /api/reservations`）は `status`（`List<ReservationStatus>`、任意）と `Pageable`（`page`/`size`/`sort`）のみを受け付ける。`resourceName`・`from`・`to` に相当するパラメータは存在しない
- `ReservationService#list` はロール判定（ADMIN は全件、それ以外は `requesterId` 一致のみ＝自分の予約だけ）と `status` 指定有無の組み合わせで、既存の 4 つの導出 `@Query` メソッド（`findAllFetch`・`findByStatusInFetch`・`findByRequesterIdFetch`・`findByRequesterIdAndStatusInFetch`、いずれも `JOIN FETCH r.resource, r.requester` 付き）に分岐する
- ページネーションは `Page<Reservation>` を `Pageable` ごとリポジトリへ渡す**本物の DB ページング**（Resource の `from`/`to` 空き確認経路のような Java 側手動ページネーションではない）

## 設計判断点（Functional Design で確定する事項）

### 1. 組み合わせ爆発への対応

既存の「ロール（2）× status 有無（2）」= 4 メソッドに、本課題の `resourceName` 有無（2）× `from`/`to` 有無（2）を素朴に掛け合わせると **4 × 2 × 2 = 16 メソッド**になる。本リポジトリの既存方針（nullable パラメータの単一 JPQL ではなく、フィルタ条件ごとに専用 `@Query` メソッドを用意する。`ResourceRepository` の keyword 検索実装〔8 メソッド〕と同じ考え方）を踏襲するなら、本課題でも同様に機械的な 16 メソッド構成になる見込み。共通条件（`resourceName` 部分一致・`from`/`to` 重複判定）を `ResourceRepository.KEYWORD_MATCH` と同じパターンでインターフェース定数化し、JPQL 文字列の重複・ズレを防ぐ方針が妥当

### 2. from/to の重複判定は JPQL で完結できる（Resource の空き確認とは性質が異なる）

Resource の空き確認（`from`/`to`）は「予約という別エンティティの存在」を確認する必要があったため、`ResourceService` では候補 Resource を全件取得してから Java 側で `Reservation` の重複を確認する手動フィルタ（`listWithAvailabilityFilter`）が必要だった。一方、本課題は **`Reservation` エンティティ自身の `startAt`/`endAt` カラムを絞り込む**だけなので、`r.startAt < :to AND r.endAt > :from` という単純な JPQL 述語で表現でき、既存の `Pageable` ベースの DB ページングに追加条件として組み込める（Java 側の手動ページネーション・候補リスト事前取得は不要）

### 3. 重複（期間フィルタ）の意味論は既存の `overlaps` と統一する

`checkConflict`（`ReservationService.java:306` 付近）が使う重複判定ロジック（`ResourceService.overlaps`）は半開区間 `[start, end)` 同士の重複判定（`existingStart.isBefore(to) && existingEnd.isAfter(from)`）であり、境界が一致する場合（例: 既存 10:00-11:00、新規 11:00-12:00）は重複としない。本課題の期間フィルタ（RSV-02「指定期間内に開始または終了する予約を返す」）も、この既存の半開区間の意味論に合わせて JPQL 条件を組み立てるのが一貫性がある（`r.startAt < :to AND r.endAt > :from`）

### 4. resourceName フィルタは `Reservation.resource.name` への部分一致

`Reservation` は `@ManyToOne(fetch = LAZY)` で `Resource` と関連し、既存の一覧クエリは既に `JOIN FETCH r.resource` しているため N+1 の心配なく `r.resource.name LIKE ...` で絞り込める。大文字小文字非依存にするかはビジネス要求シートに明記が無いため Requirements Analysis で確認する

### 5. Mockito テストへの影響

`ReservationServiceTest`（Mockito、デフォルト STRICT_STUBS）には `list()` を対象にした既存スタブが無い（create/update/cancel/get が中心）。そのため `list()` のシグネチャに `resourceName`/`from`/`to` を追加しても、`ResourceService#list` に keyword を追加したときのような**既存スタブ破綻は発生しない**。`ReservationControllerTest` は MockMvc + H2 実データの結合テストであり、同様に影響なし

## フロントエンド

- `reservations/page.tsx` は現状、専用フィルタフォームを持たず、ステータスごとの固定リンク（タブ切替）のみ
- 新規 `ReservationFilterForm.tsx` は `resources/ResourceFilterForm.tsx` と同じパターン（Client Component、`FormData` から値取得、`trim()`・センチネル値で「未指定」を表現、`data-testid="reservation-filter-form-<field>-<element>"` 命名）を踏襲する
- `frontend/src/server/actions/reservations.ts` の `ListReservationsParams`（非公開 interface）に `resourceName`/`from`/`to` を追加する。`from`/`to` は既存の `toIsoWithSeconds` ヘルパー（datetime-local の 16 文字入力を秒付き ISO に正規化）を流用する
