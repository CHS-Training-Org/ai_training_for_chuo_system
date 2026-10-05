# Logical Components — resource-list-filter

本ユニットでは新規の論理コンポーネント（キュー・キャッシュ・サーキットブレーカー・メッセージブローカー等）は導入しない。

## 既存コンポーネントへの変更点一覧

| コンポーネント | 層 | 変更内容 |
|---|---|---|
| `ResourceController` | presentation | `keyword` クエリパラメータの受付、長さバリデーション（`ValidationException`） |
| `ResourceService` | application | `keyword` の trim・空文字判定・ワイルドカードエスケープ、`ResourceRepository.search` への引数伝播 |
| `ResourceRepository` | domain | `@Query` カスタムJPQLによる `search` メソッド追加（`category`/`isActive`/`keyword` を null許容条件で組み合わせ） |
| `ResourceFilterForm.tsx` | frontend | キーワード入力欄の追加（`label` 付き） |
| `frontend/src/server/actions/resources.ts` | frontend（BFF） | `ListResourcesParams` に `keyword?: string` を追加 |
| `frontend/src/app/(authenticated)/resources/page.tsx` | frontend | `SearchParams` interface に `keyword?: string` を追加し `listResourcesAction` に伝播 |

## コンポーネント間の関係（変更なし）

既存のアーキテクチャ依存関係（`dependencies.md` 参照：presentation → application → domain）をそのまま維持する。横断的関心事（`infrastructure` の認証・認可）への変更はない。
