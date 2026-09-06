# Build Instructions — resource-list-filter

> 全体のビルド手順は既存の [`CLAUDE.md`](../../../../../CLAUDE.md) §よく使うコマンドを出典とする。ここでは今回の変更の検証に使った実際のコマンドのみ記載する。

## Prerequisites
- **Build Tool**: Gradle（Kotlin DSL、Spring Boot Gradle Plugin）／ pnpm 11.5.0 + Next.js 15
- **Dependencies**: 追加なし（既存の `build.gradle.kts` / `package.json` の依存関係のみ使用）
- **System Requirements**: devcontainer 環境（Java 25 toolchain、Node.js）

## Build Steps

### バックエンド
```bash
cd backend
./gradlew build
```
- **Expected Output**: `BUILD SUCCESSFUL`
- **Build Artifacts**: `backend/build/libs/*.jar`、テストレポート `backend/build/reports/`
- **Common Warnings**: Checkstyle の `MethodName` 警告（テストメソッド名の `methodName_condition_expectedBehavior` 規約による、ADR-018 準拠。既存全テストクラスで発生する既知の警告であり `isIgnoreFailures` の対象外＝ビルド失敗にはならない）

### フロントエンド
```bash
cd frontend
pnpm build
```
- **Expected Output**: `✓ Compiled successfully` → 全ルートの静的/動的レンダリング結果が表示される
- **Build Artifacts**: `frontend/.next/`
