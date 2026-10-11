# Build Instructions

対象: Issue #23 リソース一覧の検索・フィルタ追加（`resource-list-filter`）。
本書は `CLAUDE.md` に記載のコマンドと、今回の作業で実行した検証コマンドをまとめたもの。

## Prerequisites

- **Build Tool**:
  - Frontend: pnpm（Next.js 15 / React 19 / TypeScript）
  - Backend: Gradle wrapper（`./gradlew`、Kotlin DSL）/ Java 25 / Spring Boot 4.0
- **Dependencies**: Frontend は `frontend/` の `pnpm install`。Backend は Gradle が解決する。
- **Environment Variables**: Frontend は `frontend/.env.local`（`cp frontend/.env.local.example frontend/.env.local`）。Cognito 関連の値は `scripts/provision-cognito.sh` の出力を記入する（`CLAUDE.md`）。以下の検証コマンド（test / lint / format:check）で必要かどうかは確認できていない。
- **System Requirements**: Node.js のバージョン、メモリ、ディスク容量は確認できていない。

Backend のテストは H2 を使う（`CLAUDE.md` の技術スタック）。実行に PostgreSQL は不要と見込まれるが、Build and Test ステージでは再確認していない。

## Build Steps

### 1. Install Dependencies

```bash
cd frontend && pnpm install
```

Backend は Gradle wrapper が初回実行時に依存を取得する。

### 2. Configure Environment

```bash
cp frontend/.env.local.example frontend/.env.local
```

### 3. Build / Compile

今回の合否判定に使うコマンドは、ビルド成果物を作る `build` ではなく test / lint / checkstyle である。

```bash
# Backend: コンパイルは test タスクに含まれる
cd backend && ./gradlew test

# Frontend: プロダクションビルド（CLAUDE.md 記載。今回の必須確認項目ではない）
cd frontend && pnpm build
```

### 4. Verify Build Success

- **Expected Output**:
  - Backend: `./gradlew test` が終了コード 0。
  - Frontend: 必須確認項目は `pnpm test` / `pnpm lint`（それぞれ `build-and-test-summary.md` を参照）。
- **Build Artifacts**: 今回の Build and Test ステージで記録したものはない。
- **Common Warnings**（今回の実行で確認された既知の警告）:
  - `checkstyleMain`: `ReservationRepository.java` のメソッド名に関する警告 2 件（今回の変更対象外・未変更のファイル）。
  - `ResourceServiceTest` のコンパイル時、`any(Specification.class)` による unchecked 警告 1 件（エラーではない。計画で定めた書き方）。

## 追加確認: `pnpm build`（合否判定の対象外）

- `pnpm build` は今回の必須確認項目ではない。成功扱いにしておらず、Build and Test の合否判定にも含めない。
- ユーザーの報告によれば、追加で実行した `pnpm build` は `next/font` で失敗した。
- 原因の調査と修正は行っていない。この件が今回の変更に起因するかどうかは確認できていない。

## Troubleshooting

### Backend のフォーマット違反

- **Solution**: `cd backend && ./gradlew spotlessApply` で整形し、`./gradlew spotlessCheck` で再確認する（`CLAUDE.md`）。

### Frontend のフォーマット違反

- **Solution**: `cd frontend && pnpm format` で整形し、`pnpm format:check` で再確認する（`CLAUDE.md`）。

上記以外の原因別の対処は、今回の作業で事例がないため記載しない。
