# Dependencies

## Internal Dependencies
- `ResourceFilterForm` / `page.tsx` -> `listResourcesAction`（Compile）: 検索条件を API に渡すため。
- `listResourcesAction` -> `GET /api/resources`（Runtime）: HTTP 呼び出し。
- `ResourceController` -> `ResourceService` -> `ResourceRepository` / `ReservationRepository`（Compile）: 4 層の依存方向。
- `PaginationNav` は `query` に searchParams をそのまま受けてページ遷移時に条件を引き継ぐ。`keyword` を足したとき追加実装が要るかは Code Generation で確認する。

## External Dependencies
- 新規の外部依存は不要の見込み（Spring Data JPA の既存機能で足りるかは設計時に確認する）。
