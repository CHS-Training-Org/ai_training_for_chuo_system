# Build and Test Summary（recurring-reservation）

## スコープ判定（Adaptive Execution）

- **Unit Tests**: ALWAYS EXECUTE（Code Generation で生成済み。本ステージで `clean build` による fresh な実行で確認）
- **Integration Tests**: EXECUTE（`ReservationControllerTest`（H2、68 件）。加えて、V003 と CHECK 制約と `validate` 起動を、使い捨ての PostgreSQL 16 で手動確認）
- **E2E Tests**: SKIP（新規の E2E は追加せず、既存の E2E も変更の必要がない）。ブラウザでの実機確認の手順を `e2e-test-instructions.md` に記載
- **Performance Tests**: SKIP（性能要件の NFR Requirements ステージは SKIP 判定）。件数上限なしの所要時間の確認は、`e2e-test-instructions.md` の手順 C に記載
- **Contract Tests**: SKIP（モノリスのため対象外）。OpenAPI への反映は `ReservationControllerTest` で確認した
- **Security Tests**: SKIP（Security Baseline 拡張は不採用。権限は既存の予約作成と同じで、追加の認可はない）

## Build Status

- **Build Tool**: Gradle 9.5.1（backend）/ pnpm + Next.js 15（frontend）/ Docusaurus（docs-next）
- **Build Status**: Success（3 つとも）
- **Build Artifacts**: `backend/build/libs/bookflow-0.0.1-SNAPSHOT.jar`、`frontend/.next/`、`docs-next/build/`
- **Build Time**: backend `clean build --max-workers=1` 約 26 秒、frontend（lint、format:check、test、build）約 83 秒

## Test Execution Summary

### Unit Tests

- **Total Tests**: 639（backend 375 + frontend 264）
- **Passed**: 639
- **Failed**: 0
- **本ユニットの新規**: 104 件（backend 73 + frontend 31）
- **Coverage**: 未計測
- **Status**: Pass

### Integration Tests

- **自動（H2）**: `ReservationControllerTest` 68 件（うち本ユニットの新規 26 件）が成功
- **手動（PostgreSQL 16）**: 次の 4 点が期待どおり
  - V001、V002 を適用した既存データへの V003 の適用（既存の行は `NONE`・NULL・NULL）
  - 2 つの CHECK 制約による不整合な行の拒否（6 通りの INSERT）
  - `idx_reservations_series_id` の存在
  - アプリの起動（Flyway が 3 つのマイグレーションを適用し、`ddl-auto: validate` を通る）
- **Status**: Pass

### Additional Tests

- **E2E Tests**: N/A。ブラウザでの手動確認（手順 A、B、C）は未実施
- **Contract / Security / Performance Tests**: N/A

## 品質ゲート

- backend：`./gradlew clean build --max-workers=1` が成功（`spotlessCheck`・`checkstyleMain`・`test` を含む）。`checkstyleMain` の警告 4 件は既存のコード由来で、本ユニットの追加分は 0 件。`checkstyleTest` の警告は、ADR-018 の命名規約による `MethodName` のみ（既存のテストと同じ）
- frontend：`pnpm lint` エラーなし、`pnpm format:check` は all matched files use the correct format、`pnpm build` は Compiled successfully
- docs-next：`npm run build` が成功（drawio の SVG の `image-size` の警告は既存）

## break-and-verify の記録

実装を一時的に壊し、該当テストが失敗することを確認してから復元した（Code Generation 時に実施）。

- backend（5 種類）：自己重複の検出、既存予約との重複判定、月次のスキップ（丸めに変える）、`joinSeries` の呼び出し、検証をロックの後ろへ移す
- frontend（4 種類）：終了日の必須検証、「繰り返さない」での終了日の除外、トーストの件数、`NONE` での詳細の非表示

## 既知の制約と残る確認

- **ブラウザでの実機確認は未実施**：繰り返しの入力、トースト、詳細画面のシリーズ情報（`e2e-test-instructions.md` の手順 A、B）
- **ロック下の一括作成の並行性と所要時間は未確認**：同時申請と、1 年・2 年分の所要時間（手順 C）
- **件数上限なしのリスク**：極端に遠い終了日は、ロック保持時間とメモリを増やし、`LocalDate` の上限付近では日付計算が例外になりうる。要件の決定事項 4 で受け入れ済みで、見直し候補は上限件数の導入（超過は 400）
- **画面遷移図と ER 図（drawio の SVG）は未更新**：`screen-spec.md` と `er-diagram.md` の表を正とする
- **設計書への未反映**：実装中に見つけた `@ColumnDefault("'NONE'")`（テストの生 SQL の INSERT 対策）は、`functional-design/` に反映していない（`code/backend-summary.md` に記録）

## Overall Status

- **Build**: Success
- **All Tests**: Pass
- **Ready for Operations**: Yes（BookFlow では CI 品質ゲート `CI Frontend` / `CI Backend` が Operations 相当。PR 作成と push の後に自動実行される。手動確認の残りは、PR 前にブラウザで行うことを推奨する）
