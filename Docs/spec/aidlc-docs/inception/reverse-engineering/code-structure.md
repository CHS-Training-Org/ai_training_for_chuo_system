# Code Structure

## Build System
- **Type**: Gradle（Kotlin DSL、`backend/build.gradle.kts`）、pnpm（`frontend/package.json`）
- **Configuration**: Java 25、Spring Boot 4.0.6、Spotless（google-java-format）、Checkstyle。FE は oxlint と oxfmt。

### Existing Files Inventory（CSV 出力の変更候補）
- `backend/.../presentation/ReservationController.java` - 予約 API。`/api/reports` は未存在
- `backend/.../application/ReservationService.java` - 予約のユースケース
- `backend/.../domain/ReservationRepository.java` - ページング付き `@Query`。期間指定なし
- `backend/.../domain/Reservation.java` - `LocalDateTime` の `startAt` / `endAt`、`status`
- `backend/.../presentation/UserController.java` - `@PreAuthorize("hasRole('ADMIN')")` の実例
- `backend/.../presentation/exception/GlobalExceptionHandler.java` - 統一エラー
- `backend/.../infrastructure/security/SecurityConfig.java` - 認証・認可設定
- `backend/src/test/.../support/BaseControllerTest.java`、`WithMockAdmin` ほか - ロール別テスト基盤
- `frontend/src/lib/api-client.ts` - JSON 専用（`request` は非公開、本文は常に `res.json()`）
- `frontend/src/server/actions/reservations.ts` - 予約の Server Action
- `frontend/src/app/(authenticated)/reservations/page.tsx` - ADMIN は「全予約一覧」として全件表示
- `frontend/src/app/(authenticated)/admin/{resources,users}/` - 管理者ページ。予約系の管理者ページは無い
- `frontend/src/components/layout/nav-items.ts` - ロール別ナビ
- `frontend/tests/unit/msw/handlers.ts` - MSW スタブ

## Design Patterns
### 4 レイヤー
- **Location**: `backend/src/main/java/com/example/bookflow/`
- **Purpose**: domain / application / presentation / infrastructure の分離
### BFF（Server Action）
- **Location**: `frontend/src/server/actions/`
- **Purpose**: JWT をサーバーに閉じ込め、Zod でレスポンスを検証

## Critical Dependencies
### opencsv など CSV ライブラリ
- **Version**: 未導入
- **Usage**: なし。導入するか手書きにするかは設計判断
