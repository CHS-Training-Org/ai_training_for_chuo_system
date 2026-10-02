# Reverse Engineering Metadata

**Analysis Date**: 2026-09-16T07:33:01+00:00
**Analyzer**: AI-DLC（`/aidlc` スキル）
**Workspace**: /workspace
**Scope**: 本課題（リソース一覧の検索・フィルタ追加）に関係する範囲に絞った解析。全体像は `docs-next/docs/reference/architecture.md` および `docs-next/docs/spec/` を真実の源として参照し、再導出はしていない。

## Artifacts Generated

- [x] business-overview.md
- [x] architecture.md
- [x] code-structure.md
- [x] api-documentation.md
- [x] component-inventory.md
- [x] technology-stack.md
- [x] dependencies.md
- [x] code-quality-assessment.md

## 解析で確認した主要ファイル

**バックエンド**

- `presentation/ResourceController.java`
- `application/ResourceService.java`
- `domain/ResourceRepository.java`
- `domain/Resource.java`
- `test/.../ResourceServiceTest.java`
- `src/test/resources/application-test.yml`
- `build.gradle.kts`

**フロントエンド**

- `src/app/(authenticated)/resources/page.tsx`
- `src/app/(authenticated)/resources/ResourceFilterForm.tsx`
- `src/server/actions/resources.ts`
- `package.json`

**ドキュメント**

- `docs-next/docs/spec/api-spec.md`（`GET /api/resources` 節）
- `docs-next/docs/spec/enhancements/beginner/resource-list-filter.md`（ビジネス要求シート）

## 次ステージへの申し送り

1. `ResourceService.list` は `from` / `to` の有無で2経路に分岐する。キーワード条件は両経路に適用する必要がある。
2. テスト DB は H2（PostgreSQL 互換モード）であるため、PostgreSQL 固有の `ILIKE` に依存しない大文字小文字非依存の実装が要る。
3. `ResourceRepository` の派生クエリは条件の組み合わせごとに増える構造になっており、キーワード追加の方式選択が設計判断として残っている。
4. `Resource.description` は null を取りうる。部分一致条件で null 行が意図せず除外されないようにする。
