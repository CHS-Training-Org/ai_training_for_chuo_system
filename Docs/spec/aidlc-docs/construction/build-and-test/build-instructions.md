# Build Instructions — `resource-keyword-search`

## Prerequisites

| 項目 | 内容 |
|---|---|
| **Build Tool** | Gradle Wrapper（backend）/ pnpm 11.5.0（frontend）/ npm（docs-next） |
| **Dependencies** | Java 25、Node.js（DevContainer が提供）。依存は Gradle と pnpm がロックファイルから解決する |
| **Environment Variables** | ビルドとテストには不要。アプリケーション起動時のみ `frontend/.env.local` が要る（`cp frontend/.env.local.example frontend/.env.local`） |
| **System Requirements** | DevContainer 環境。外部サービス（PostgreSQL・Cognito）はビルドとテストには不要（テストは H2 インメモリ DB、認証はモック JWT） |

本ユニットは依存関係の追加を伴わない。`JpaSpecificationExecutor` と `Specification` はいずれも既存の `spring-boot-starter-data-jpa` に含まれる。

## Build Steps

### 1. 依存関係の解決

```bash
cd frontend && pnpm install --frozen-lockfile
```

バックエンドは Gradle がビルド時に自動解決するため、明示的な手順は不要である。

### 2. 環境の設定

ビルドとテストの範囲では設定不要。

### 3. ビルド

```bash
# バックエンド（コンパイル・フォーマット検証・Checkstyle・テストまで一括）
cd backend && ./gradlew clean build

# フロントエンド
cd frontend && pnpm build
```

### 4. 成功の確認

**バックエンド**

- 期待する出力：`BUILD SUCCESSFUL`
- 生成物：`backend/build/libs/*.jar`（`bootJar` と `jar`）、`backend/build/test-results/test/*.xml`、`backend/build/reports/checkstyle/`
- 許容される警告：`checkstyleMain` が `ReservationRepository` のメソッド名（`findByResource_IdAndStatusIn`・`findByResource_IdInAndStatusIn`）に対して `MethodName` 警告を 2 件出す。Spring Data JPA の関連プロパティ参照記法（`_`）に由来する既存の事項であり、本ユニットの変更とは関係しない。警告であってビルドは失敗しない

**フロントエンド**

- 期待する出力：ルート一覧とバンドルサイズの表示
- 生成物：`frontend/.next/`
- `/resources` は `ƒ (Dynamic)` として出力される（`searchParams` を読むサーバーコンポーネントのため）

## Troubleshooting

### コンパイルエラー：`findByIsActiveTrue` 等が見つからない

- **原因**：本ユニットで `ResourceRepository` から派生クエリメソッド 6 個を削除したため、古いコードが残っていると解決できない
- **対処**：`ResourceSpecifications.listFilter` で述語を組み立て、`findAll(Specification, Pageable)` または `findAll(Specification)` を呼ぶ形に置き換える

### コンパイルエラー：`Specification` が解決できない

- **原因**：`org.springframework.data.jpa.domain.Specification` の import 漏れ
- **対処**：import を追加する。`jakarta.persistence.criteria.Specification` は存在しないため取り違えに注意する

### `UnnecessaryStubbingException` でテストが落ちる

- **原因**：`ResourceServiceTest` は `MockitoExtension` の strict stubs 配下にあり、呼ばれないスタブを許容しない。リポジトリ呼び出しを述語ベースに変えると、旧メソッドのスタブが未使用になる
- **対処**：スタブを `findAll(ArgumentMatchers.<Specification<Resource>>any(), eq(pageable))` および `findAll(ArgumentMatchers.<Specification<Resource>>any())` に書き換える

### Spotless のフォーマット検証で落ちる

- **原因**：`./gradlew build` に含まれる `spotlessCheck` が google-java-format との差分を検出した
- **対処**：`./gradlew spotlessApply` を実行してから再度ビルドする
