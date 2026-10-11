# Requirements — リソース詳細画面の情報拡充

## Intent Analysis

- **User Request**: `docs-next/docs/spec/enhancements/beginner/resource-detail-info.md` の内容をもとに、AI-DLC で実行計画を立てて実装を進める
- **Request Type**: Enhancement（既存機能の拡張。新規リソースドメインの追加ではない）
- **Scope Estimate**: Multiple Components（バックエンド4層 + Flyway マイグレーション + フロントエンド詳細画面 + 管理画面フォーム + 関連 spec 3点）
- **Complexity Estimate**: Moderate（新規データモデル設計は伴わないが、既存の `resources` ドメインを構成する全レイヤーに影響する縦切り変更）
- **Requirements Depth**: Standard（ビジネス要求シートに要件・受入条件が明記済みのため、ゼロからの要件定義ではなく、実装方式の確定と非機能面の明文化を中心に行う）

## Source

- ビジネス要求シート: `docs-next/docs/spec/enhancements/beginner/resource-detail-info.md`
- 既存実装の把握: `Docs/spec/aidlc-docs/inception/reverse-engineering/code-structure.md`、`.../api-documentation.md`

## Extension Configuration（確定）

| Extension | Enabled | 理由 |
|---|---|---|
| Security Baseline | No | 学習用モノレポにおける小規模フィールド追加（PoC 相当）で、新規の認可・入力境界は生じない |
| Resiliency Baseline | No | 可用性・DR 設計を要件レベルで検討する必要のない変更範囲 |
| Property-Based Testing | No | 複雑なビジネスロジック・データ変換を伴わない単純な CRUD フィールド追加 |

## Functional Requirements

| # | 要件 | 由来 |
|---|------|------|
| FR-01 | `resources` テーブルに `equipment TEXT NULL`（設備一覧）・`notes TEXT NULL`（利用上の注意）の2カラムを Flyway マイグレーションで追加する | RES-01 |
| FR-02 | `Resource` エンティティ・`ResourceResponse` DTO に `equipment` / `notes` を追加し、`GET /api/resources/{id}` のレスポンスに含める | RES-02 |
| FR-03 | `CreateResourceRequest` / `UpdateResourceRequest` に `equipment` / `notes`（ともに任意項目）を追加し、管理者が登録・編集画面から入力できるようにする | RES-03 |
| FR-04 | リソース詳細画面（`/resources/{id}`）に `equipment` / `notes` を表示する。値が `null`・空文字の場合は当該項目ごと非表示にする | RES-04 |
| FR-05 | `GET /api/resources`（一覧）は `ResourceResponse` を共有 DTO として使うため、`equipment` / `notes` は自然に含まれる。一覧画面側での新規表示は不要（詳細画面のみ表示） | RES-05 |

### 確定した実装方式（クラリファイング質問で解消）

- **カラム名・ラベル**: `equipment`（表示ラベル「設備一覧」）、`notes`（表示ラベル「利用上の注意」）をそのまま採用する。ビジネス要求シートの例示どおり。
- **入力・表示形式**: どちらも**自由記述の段落**として扱う。1つのテキストエリアに自由文で入力し、詳細画面では改行を保持したまま段落として表示する。既存の `description` フィールドと同じ扱いとし、カンマ・改行区切りを箇条書きにパースする処理は実装しない。
- **文字数制約**: 既存の `description`（TEXT、Bean Validation の `@Size` 制約なし）と同様の扱いとし、`equipment` / `notes` にもアプリケーション層での文字数上限は設けない（DB 側の `TEXT` 型の範囲に委ねる）。既存パターンとの一貫性を優先した判断であり、新たな制約を導入する要件は要求シートにない。
- **テーブル構造**: 要求シート RES-01 が「`resources` テーブルに...フィールドを追加する」と明記しているため、別テーブル（`resource_attributes` 等への正規化）は採用しない。単一マイグレーションで `resources` テーブルに直接カラムを追加する。

## Non-Functional Requirements

- **後方互換性**: 新カラムは `NULL` 許容とし、既存データへの移行・デフォルト値設定は不要（受入条件と一致）。
- **回帰防止**: 既存の `ResourceServiceTest` / `ResourceControllerTest`（バックエンド）、`frontend/tests/unit/server/actions/resources.test.ts`（フロントエンド）が引き続き pass すること。
- **型の一貫性**: フロントエンドの `ResourceResponseSchema`（`frontend/src/lib/types/api.ts`）は共有型パッケージを持たずバックエンド DTO と手動同期されているため、`equipment` / `notes`追加時は両者を同時に更新する。
- **採番の一貫性**: Flyway のバージョン番号はリポジトリ全体でグローバル連番（現状 `V001` のみ）。本課題は `V002` を使用する。競合課題（[リソース画像アップロード](/workspace/docs-next/docs/spec/enhancements/advanced/resource-image-upload.md)、[繰り返し予約](/workspace/docs-next/docs/spec/enhancements/intermediate/recurring-reservation.md)）と並行着手する場合は採番調整が必要（本課題単独の実装では問題にならない）。
- **テストカバレッジ**: `equipment` / `notes` を含む API リクエスト・レスポンスの新規テストを追加する（受入条件どおり）。

## データモデル変更

- **新規マイグレーション**: `backend/src/main/resources/db/migration/V002__add_resource_equipment_and_notes.sql`
  - `ALTER TABLE resources ADD COLUMN equipment TEXT;`
  - `ALTER TABLE resources ADD COLUMN notes TEXT;`
- **`Resource` エンティティ**（`ddl-auto: validate` のため、マイグレーションとエンティティのカラム定義を同時に一致させる必要がある）
  - フィールド追加：`equipment (String, nullable)` / `notes (String, nullable)`
  - `create()` / `update()` ファクトリ・業務メソッドへの反映

## API 変更

- `GET /api/resources/{id}` レスポンス（`ResourceResponse`）に `equipment` / `notes` を追加
- `POST /api/resources`（`CreateResourceRequest`）・`PUT /api/resources/{id}`（`UpdateResourceRequest`）に `equipment` / `notes`（任意項目、Bean Validation の必須制約なし）を追加
- `GET /api/resources`（一覧）：`ResourceResponse` を共有するため実装上の追加変更は不要（レスポンスに新フィールドが自然に含まれる）
- 影響を受けないエンドポイント：`PATCH /api/resources/{id}/status`、`GET /api/resources/{id}/availability`

## UI 変更

- **リソース詳細画面**（`frontend/src/app/(authenticated)/resources/[id]/page.tsx`）: 「設備一覧」「利用上の注意」を既存の説明欄と同様の段落表示で追加。値が空の項目は非表示。
- **管理者向けリソース編集フォーム**（`frontend/src/app/(authenticated)/admin/resources/ResourceManagementClient.tsx` の `ResourceForm`）: 新規登録・編集ダイアログ共通で、`equipment` / `notes` のテキストエリア入力欄を追加。
- **フロントエンド型・スキーマ**: `frontend/src/lib/types/api.ts`（`ResourceResponseSchema`）、`frontend/src/lib/schemas/resource.ts`（`CreateResourceSchema` / `UpdateResourceSchema`）に対応するフィールドを追加。

## Spec 更新（Spec-first、`/update-spec` スキルで対応）

> **注意**：ビジネス要求シートの「影響範囲」節は `er-diagram.md` / `api-spec.md` / `screen-spec.md` の3点のみを挙げているが、`docs-next/docs/spec/requirements.md`（ベース機能要件定義書）も更新対象に含める。同ファイルの **RES-04**（「リソース詳細（名称・カテゴリ・定員・場所・説明・承認フロー要否）を閲覧できる」）と **RES-05**（「ADMIN はリソースを新規登録できる（名称・カテゴリ・定員・場所・説明・`requires_approval`・`is_active` を入力）」）はいずれも閲覧・入力可能フィールドを列挙しており、`equipment` / `notes` を追加すると現状の記述と食い違う。なお、この `RES-04`/`RES-05` はビジネス要求シート側の `RES-01`〜`RES-05` とは別文書内の別採番であり、内容上の関連はない。

- `docs-next/docs/spec/requirements.md` §RES-04（閲覧可能フィールド列挙）・§RES-05（登録時入力フィールド列挙）：`equipment` / `notes` を追記
- `docs-next/docs/spec/er-diagram.md` §`resources` テーブル：定義テーブルに `equipment` / `notes` カラムを追記
- `docs-next/static/diagrams/spec/er-diagram.drawio`：`resources` エンティティの表シェイプ（現在9行）に `equipment` / `notes` の2行を追加し、高さ・周辺エンティティとのレイアウトを調整したうえで `er-diagram.drawio.svg` を再エクスポートする（`er-diagram.md` はこのSVGを画像として埋め込んでおり、Markdown側の定義テーブルのみ更新すると図と記述が不一致になる。`drawio-skill` を使う）
- `docs-next/docs/spec/api-spec.md` §`GET /api/resources/{id}` / §`POST /api/resources` / §`PUT /api/resources/{id}`：新フィールドを追記
- `docs-next/docs/spec/screen-spec.md` §`/resources/{id}` / §`/admin/resources`：表示・入力欄を追記

## スコープ外

- [リソース画像アップロード](/workspace/docs-next/docs/spec/enhancements/advanced/resource-image-upload.md)・[カレンダービュー](/workspace/docs-next/docs/spec/enhancements/intermediate/calendar-view.md)との並行実装（競合課題のため対象外）
- 設備情報の構造化（別テーブル `resource_attributes` への正規化、チェックボックス選択式 UI）
- `GET /api/resources` 一覧側の表示変更（RES-05 により対象外）

## 受入条件（ビジネス要求シートより転記）

- [ ] 管理者がリソース登録・編集画面から設備情報・利用上の注意を入力・更新できる
- [ ] リソース詳細画面に設備情報・利用上の注意が表示される（未登録時は非表示でよい）
- [ ] Flyway マイグレーションが正常に実行され、既存データへの影響がない（`NULL` 許容）
- [ ] `GET /api/resources/{id}` のレスポンスに新フィールドが含まれる
- [ ] バックエンドの既存テストが引き続き pass する
- [ ] 新フィールドを含む API 動作のテストを追加する

## リスク・留意事項

- `ddl-auto: validate` のため、マイグレーション適用漏れや型不一致があると起動時に検証エラーとなる。マイグレーション・エンティティ・DTO・フロントエンド型を必ず同時に更新する。
- Flyway バージョン番号のグローバル連番制約により、他の競合課題との並行着手時は `V002` 番号の衝突に注意（本課題単独では問題なし）。
