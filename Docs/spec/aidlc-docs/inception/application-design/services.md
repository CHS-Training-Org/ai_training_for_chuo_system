# Services — CSV 帳票出力（Issue #29）

## ReportService（新規）

- **責務**: CSV 帳票出力ユースケースの中核サービス。予約データの取得条件の組み立てから CSV バイト列の生成までを担う。
- **オーケストレーションパターン**: `ReportController` から呼ばれる単一のユースケースメソッド（`generateReservationsCsv`）が、リポジトリ呼び出し（データ取得）→ CSV 変換（private メソッド）→ バイト列化、の 3 段を内部で直列に実行する。既存 `ReservationService`（一覧取得・詳細取得・申請・更新・キャンセルの複数ユースケースを束ねる）とは異なり、単一目的の小さなサービスとする。
- **他サービスとの連携なし**: `ApprovalService` 等、他のユースケース Service への依存は発生しない（読み取り専用・既存データの変換のみのため）。
- **トランザクション境界**: 読み取り専用（`@Transactional(readOnly = true)`）。既存 `ReservationService.list()`/`.get()` と同じ方針。

## 既存サービスとの責務分担

| サービス | 責務 | 本タスクでの変更 |
|---|---|---|
| `ReservationService` | 予約 CRUD ユースケース（所有権チェック・ステータス遷移を含む） | 変更なし |
| `ReportService`（新規） | 予約データの CSV 帳票出力（読み取り専用・ADMIN 限定） | 新規作成 |
| `ResourceService` | リソース CRUD・空き状況照会 | 変更なし |

`ReportService` は `ReservationService` の内部メソッドやドメインロジック（`ResourceService.overlaps` 等）を直接呼び出さず、`ReservationRepository` から独立して必要なクエリメソッドを呼び出す。理由：`ReservationService` の既存メソッドはページング・所有権フィルタ・ステータス遷移といった CSV 出力には不要な関心事を含んでおり、そのまま再利用すると不要な結合が生じるため。

## フロントエンド側の「サービス層」相当

Next.js 側にドメインサービス層は存在しない（BFF 層の Server Actions / Route Handler がその役割を兼ねる）。

- **CSV レポート Route Handler**: `ReportService` に対応するフロントエンド側の窓口。セッション検証 → バックエンド呼び出し → レスポンス転送、という単一のオーケストレーションを行う。既存の Server Actions（`reservations.ts` 等）と異なり、JSON ではなくバイナリレスポンスをそのまま転送する点が特徴。
