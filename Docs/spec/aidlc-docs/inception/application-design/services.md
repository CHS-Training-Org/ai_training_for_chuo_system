# Services

## ReportService
- **Responsibilities**: 帳票出力のオーケストレーション。HTTP の知識（ヘッダ、ファイル名）は持たない。
- **Orchestration**:
  1. `from` を `from.atStartOfDay()`、`to` を `to.plusDays(1).atStartOfDay()`（排他的な上端）に変換する（null はそのまま）
  2. `ReservationSpecifications.forReport(...)` と `Sort`（`startAt` 昇順、`id` 昇順）で `ReservationRepository.findAll` を呼ぶ
  3. 各予約を `ReservationCsvRow` に変換する（トランザクション内で LAZY 関連を読む）
  4. `ReservationCsvWriter.write` でバイト列にして返す
- **Transaction**: `@Transactional(readOnly = true)`。`open-in-view: false` のため、LAZY 読み込みはこの範囲で終える（fetch join で N+1 も避ける）。
- **Authorization**: Service には置かず、Controller の `@PreAuthorize` が担う（`UserController` と同じ流儀）。

## 既存 Service への影響
- `ReservationService` は変更しない。帳票は予約のライフサイクルと責務が異なるため、別 Service に分ける。

## フロントエンドの経路
- ブラウザは同一オリジンの Route Handler を呼ぶ。Route Handler が `createApiClient(getAccessToken).getRaw(...)` でバックエンドを呼び、Authorization はサーバー側で付与する。
