# ADR-011 — バックエンド：ビルドツール

## Status

Accepted

## Context

Spring Boot プロジェクトのビルドツールを決定する。候補は Maven / Gradle。

| 候補 | 学習コスト | AI補完精度 | メンテ活性 | エコシステム整合 |
|---|---|---|---|---|
| Maven | ★★ | ★★★ | ★★ | ★★ |
| Gradle (Kotlin DSL) | ★★★ | ★★★ | ★★ | ★★ |

## Decision

**Gradle（Kotlin DSL）** を採用する。

- `build.gradle.kts` は `pom.xml` より大幅に簡潔で、依存 1 件あたりの記述量が約 1/4
- Kotlin DSL はコードとして読めるため、XML を知らなくてもスキャンしやすい
- Gradle Wrapper（`./gradlew`）で Gradle インストール不要
- AI 補完精度は Maven と同等水準に達している

なお、Spring Boot 公式ドキュメントやオンライン資料の多くが Maven を前提としている点は留意が必要。Gradle 版への読み替えは `implementation(...)` ↔ `<dependency>` の対応を一度把握すれば対応できる。

## Consequences

- ビルドファイルは `build.gradle.kts`（Kotlin DSL）とし、Groovy DSL は使用しない
- `./gradlew`（Gradle Wrapper）経由で実行し、Gradle 本体のインストールを不要にする
- `01_REPO_STRUCTURE.md` に記載の `pom.xml` / `./mvnw` は本 ADR の決定により `build.gradle.kts` / `./gradlew` に読み替える
- CI の Java ビルドコマンドは `./gradlew test` / `./gradlew bootJar` を使用する
- Dependabot で `build.gradle.kts` の依存更新を自動提案する設定を追加する
