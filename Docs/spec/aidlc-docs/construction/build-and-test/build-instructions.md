# Build Instructions — resource-detail-info

## 前提

- **Build Tool**: Gradle Wrapper（backend）/ pnpm（frontend）
- **依存関係**: 既存の `backend/build.gradle.kts` / `frontend/package.json` から追加・変更なし（本ユニットは既存依存関係のみで実装）
- **環境変数**: 変更なし

## Backend ビルド

```bash
cd backend
./gradlew build
```

- **期待される結果**: `BUILD SUCCESSFUL`。`build/libs/bookflow-0.0.1-SNAPSHOT.jar` が生成される
- **含まれる処理**: コンパイル、Spotless/Checkstyle 検証、JUnit テスト実行（Flyway マイグレーション `V002` の適用含む）

## Frontend ビルド

```bash
cd frontend
pnpm build
```

- **期待される結果**: `✓ Compiled successfully`、型チェック・静的ページ生成まで成功し `/resources/[id]`・`/admin/resources` を含む全ルートが一覧に出力される

## トラブルシューティング

- **Checkstyle 警告（`MethodName` パターン不一致）**：`ADR-018` のテスト命名規約に起因する既知の WARN であり、本ユニットの変更とは無関係
- **Checkstyle 警告（`ReservationRepository` の既存メソッド名）**：本ユニットより前から存在する既存メソッドであり、本ユニットの変更とは無関係
- **Checkstyle 警告（`Resource.create`/`update` の `ParameterNumber` 超過、9引数）**：本ユニットで新規発生。severity は `warning` のためビルドは失敗しない。2フィールド追加のためだけにパラメータオブジェクト／ビルダーを導入するのは本課題の規模に対して過剰と判断し、既知の受容事項として記録する（詳細は `code/backend-summary.md` 参照）
