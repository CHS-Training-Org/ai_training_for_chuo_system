# 仕様書 (Spec)

> 対象読者：学習者・メンター
> 参照：[PROJECT_PLAN.md](../PROJECT_PLAN.md) / [ARCHITECTURE.md](../ARCHITECTURE.md)

BookFlow の実装仕様を正確に記述します。学習者が機能を理解する際の参照元です。  
更新責任：メンター

---

## 管理ファイル一覧

| ファイル | 目的 | 対象読者 |
|---------|------|---------|
| [requirements.md](./requirements.md) | 要件定義。機能要件・非機能要件・ロール権限・ステータス遷移を定義 | 学習者・メンター |
| [screen-spec.md](./screen-spec.md) | 画面仕様書。全 10 画面のレイアウト・操作・バリデーションを定義 | 学習者・メンター |
| [api-spec.md](./api-spec.md) | REST API 仕様書。エンドポイント・リクエスト/レスポンス・シーケンス図を定義 | 学習者・メンター |
| [er-diagram.md](./er-diagram.md) | ER 図（Mermaid）。データモデル・テーブル定義・リレーションを定義 | 学習者・メンター |

---

## OpenAPI / Swagger UI の参照方法

バックエンドは Springdoc OpenAPI（[ADR-015](../decision/ADR-015-backend-api-docs.md)）により、実装コードから OpenAPI ドキュメントを自動生成している。バックエンド起動中に以下の URL で参照できる（いずれも認証不要）。

| URL | 内容 |
|-----|------|
| <http://localhost:8080/swagger-ui.html> | Swagger UI（ブラウザでエンドポイントを一覧・試行） |
| <http://localhost:8080/v3/api-docs> | OpenAPI 3.1 ドキュメント（JSON） |

**起動前提**：DevContainer 内で `cd backend && ./gradlew bootRun`（postgres コンテナが起動済みであること）。

**Try it out で保護エンドポイントを呼ぶには**：Bearer JWT が必要。cognito-local から JWT を取得し、Swagger UI 右上の「Authorize」ボタンに設定する。

```bash
# 事前に bash scripts/provision-cognito.sh でプロビジョニング済みであること
bash scripts/provision-cognito.sh --jwt hanako.tanaka@example.com   # JWT が標準出力に出る
```

### 位置づけと既知の制限

**正式な API 仕様は [api-spec.md](./api-spec.md)**。OpenAPI 出力はアノテーション最小の自動生成であり、以下の点で実際の API と表示が異なる。

- `currentUser` / `user` / `pageable` がクエリパラメータとして表示されるが、**実際には送信不要**（`@CurrentUser`（認証プリンシパル）と `Pageable` の引数が springdoc に解決されず漏れているもの。ページネーションの実パラメータは `page` / `size`）
- エラーレスポンス（400〜500）が全エンドポイントに一律表示されるが、各エンドポイントで実際に返るステータス・エラーコードは api-spec.md の記載が正
- 日時の `format: date-time` はオフセット付き（RFC 3339）を示唆するが、実際のワイヤー形式はオフセットなしのローカル日時（[api-spec.md §共通 日時フォーマット](./api-spec.md#datetime-format)参照）
- `status` / `category` / `role` の enum 値は OpenAPI に現れない（DTO が string 型のため）。許容値は api-spec.md を参照
