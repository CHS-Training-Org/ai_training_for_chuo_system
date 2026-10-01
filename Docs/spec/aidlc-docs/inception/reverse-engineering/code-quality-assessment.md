---
type: working-doc
title: Code Quality Assessment（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成するコード品質所感（今回のスコープ：リソース一覧機能、STEP-03実装の分析含む）
timestamp: 2026-09-29
---

# Code Quality Assessment

> 現在のブランチ（STEP-04着手前）にはキーワード検索機能はまだ実装されていない。以下は既存のリソース一覧機能全般と、同じ課題の1回目実装（STEP-03、別ブランチ）から得られた所感。

## Test Coverage

- **Overall**: Good（変更したコードには必ずユニットテストを追加する運用が徹底されている）
- **Unit Tests**: `ResourceServiceTest.java`（372行）、`frontend/tests/unit/server/actions/resources.test.ts`（187行）
- **Integration Tests**: `ResourceControllerTest.java`（451行、MockMvc + H2実DB、認証込みのE2E的検証）

## Code Quality Indicators

- **Linting**: Configured（backend: Spotless + Checkstyle、frontend: oxlint）
- **Code Style**: Consistent（Checkstyleの `isIgnoreFailures=false` によりビルド時に強制）
- **Documentation**: Good（`docs-next/docs/spec/` が真実の源として整備されており、Spec-first運用が定着している）

## Technical Debt

- `ResourceService.listWithAvailabilityFilter` は `from`/`to` 指定時に全候補をJava側で取得して手動ページネーションする設計であり、DBページングを使わない。データ量が増えるとパフォーマンス上の課題になり得るが、既存の設計選択でありベース実装からの負債（今回のスコープ外）
- STEP-03（1回目実装）の `toLikePattern` はLIKEワイルドカード文字（`%`・`_`）のエスケープを行っていない。ユーザーがこれらを含むキーワードを入力すると意図しないパターンマッチになりうる
- `ResourceRepository` の派生クエリメソッド6種（`isActive`×`category`の組み合わせ）は、フィルタ条件が増えるたびに組み合わせが増える設計。STEP-03では `@Query` ベースの `search()` に統合する判断がされており、今回もこの方針を踏襲するか検討の余地がある

## Patterns and Anti-patterns

- **Good Patterns**:
  - Server Actions によるBFF層の一元化（クライアントから直接バックエンドを呼ばせない）
  - `@Query`（JPQL）によるクエリの組み合わせ爆発の回避（生SQL禁止のADR-012に準拠）
  - フロントエンドの純関数切り出し（`buildResourceFilterParams`）によるテスト容易性の確保
- **Anti-patterns**:
  - `list()`・`listPaginated()`・`listWithAvailabilityFilter()` のシグネチャにフィルタ条件を1つずつ追加していく方式は、条件が増えるほど引数リストが肥大化する（パラメータオブジェクト化の余地）
