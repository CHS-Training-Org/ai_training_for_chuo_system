# Build Instructions（csv-export）

## Prerequisites
- **Build Tool**: Gradle wrapper（BE、`backend/gradlew`）、pnpm（FE）
- **Dependencies**: Java 25（BE）、Node.js と pnpm（FE）。依存は初回に各ツールが取得する。本課題で追加した依存はない（D-2 = 自前実装）。
- **Environment Variables**: ビルドと自動テストには不要。FE の動作確認には `frontend/.env.local`（`frontend/.env.local.example` からコピー）が要る。Route Handler は既存の `BACKEND_URL`（未設定なら `http://localhost:8080`）を使う。
- **System Requirements**: DevContainer 内での実行を前提とする。
- **本課題での制約**:
  - `pnpm build` は dev サーバーと `.next` を共有していて壊れるため実行しない。FE のビルド確認は、`pnpm test`、`pnpm lint`、`pnpm format:check`、`pnpm exec tsc --noEmit` で代える。`pnpm build` 相当の確認（Next.js の本番ビルド）は PR の CI（`CI Frontend`）に任せる。
  - DevContainer の `docs-next` には docusaurus が入っておらず `npm run build` は失敗するため、docs のビルドはローカルで実行しない。PR の CI（Docs Check / build）で、リンクとアンカーの破損を確認する。

## Build Steps

### 1. Install Dependencies
```bash
cd frontend && pnpm install
```
BE の依存は `./gradlew` の実行時に解決される。

### 2. Configure Environment
```bash
cp frontend/.env.local.example frontend/.env.local   # 未作成の場合のみ
```

### 3. Build All Units
```bash
cd backend && ./gradlew clean build --offline    # コンパイル、bootJar、spotlessCheck、checkstyle、全テスト
cd frontend && pnpm exec tsc --noEmit            # FE の型検査（pnpm build の代わり）
```
`--offline` は依存が取得済みのときに付ける（外すとネットワークから取得する）。

### 4. Verify Build Success
- **Expected Output**: BE は `BUILD SUCCESSFUL`。FE の `tsc` は出力なしで終了コード 0。
- **Build Artifacts**: BE は `backend/build/libs/bookflow-0.0.1-SNAPSHOT.jar`（と `-plain.jar`）。FE は成果物なし（`pnpm build` を実行しないため）。
- **Common Warnings**: `checkstyleMain` の警告 2 件（既存。`ReservationRepository` の `findByResource_IdAndStatusIn` と `findByResource_IdInAndStatusIn` の `MethodName`）。`checkstyleTest` の警告 203 件（すべて `MethodName`。ADR-018 の `method_condition_expected` 命名が checkstyle のパターンに合わないため。うち 52 件が本課題で追加したテスト）。ビルドは失敗しない。

## Troubleshooting

### Build Fails with Dependency Errors
- **Cause**: 依存が未取得の状態で `--offline` を付けた、またはネットワークに届かない。
- **Solution**: `--offline` を外して再実行する。

### Build Fails with Compilation Errors
- **Cause**: `spotlessCheck` の整形違反、または型エラー。
- **Solution**: BE は `./gradlew spotlessApply`、FE は `pnpm format` を実行してから再ビルドする。FE の型エラーは `pnpm exec tsc --noEmit` で確認する。

### `Specification` のメソッドが見つからない
- **Cause**: Spring Data JPA の版が変わり、`Specification.allOf` などの API が変わった（本課題は 4.0.5 で確認）。
- **Solution**: `ReservationSpecifications` と `ReservationReportService` の合成部分を、解決された版の API に合わせる。
