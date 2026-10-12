# Build Instructions（recurring-reservation）

## Prerequisites

- **Build Tool**: Gradle wrapper 9.5.1（backend）、pnpm（frontend）、npm（docs-next）
- **Runtime**: Java 25、Node.js 24
- **Dependencies**: 本ユニットで新しい依存は追加していない（`org.hibernate.annotations.ColumnDefault` は Spring Data JPA が推移的に持つ Hibernate のクラス）
- **Environment Variables**: ビルドとテストには不要。起動時は `DB_URL`・`DB_USERNAME`・`DB_PASSWORD`（既定は `localhost:5432` の `bookflow`）
- **System Requirements**: ビルドとテストは省メモリ・直列で実行する（メモリ枯渇の再発防止）。複数のビルド・テストを同時に走らせない

## Build Steps

### 1. backend

```bash
cd backend
./gradlew clean build --max-workers=1
```

`spotlessCheck`、`checkstyleMain`、`test` を含む。

### 2. frontend

```bash
cd frontend
pnpm lint && pnpm format:check && pnpm test
NODE_OPTIONS=--max-old-space-size=1536 pnpm build
```

### 3. docs-next

```bash
cd docs-next
NODE_OPTIONS=--max-old-space-size=2048 npm run build
```

リンクとアンカーが壊れていると失敗する（`onBrokenLinks` / `onBrokenAnchors` が `throw`）。

### 4. Verify Build Success

- **backend**：`BUILD SUCCESSFUL`。成果物は `backend/build/libs/bookflow-0.0.1-SNAPSHOT.jar`。Checkstyle の警告は `checkstyleMain` が 4 件（既存のコード由来）、`checkstyleTest` は `MethodName`（ADR-018 の命名規約が下線を含むため）で、どちらも失敗にはならない
- **frontend**：`Compiled successfully`。`/reservations/new` と `/reservations/[id]` が動的ルートとして出る。成果物は `frontend/.next/`
- **docs-next**：`[SUCCESS] Generated static files`。drawio の SVG について `image-size` の警告が出るが、既存で、ビルドは成功する

## Troubleshooting

### `INSERT INTO reservations` を生 SQL で実行するテストが NOT NULL 違反で落ちる

- **Cause**: `reservations.recurrence_type` は NOT NULL。H2 の `create-drop` はエンティティからテーブルを作るため、既定値を持たせないと、列を省略した INSERT が通らない
- **Solution**: `Reservation.recurrenceType` の `@ColumnDefault("'NONE'")` を外さない。生 SQL の INSERT を足すときも、繰り返しの列は省略してよい

### `ddl-auto: validate` で起動に失敗する

- **Cause**: `Reservation` の `@Column` と V003 の列の名前・型・nullable が食い違っている
- **Solution**: `V003__add_reservation_recurrence.sql` と `Reservation.java` の 3 列（`recurrence_type` VARCHAR(10)、`recurrence_until` DATE、`series_id` UUID）を突き合わせる
