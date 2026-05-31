# はじめに（環境構築・起動手順）

> 対象読者：学習者（主に新人）
> 参照：[troubleshooting.md](./troubleshooting.md) / [ai-tools-guide.md](./ai-tools-guide.md)

このガイドは STEP-01「環境構築」の手順書として機能します。DevContainer を使って BookFlow のローカル開発環境を構築し、動作確認するまでの全手順を記載しています。

---

## 前提ソフトウェア

<!-- Batch 5 で記述：Docker Desktop（バージョン指定）・VS Code・Dev Containers 拡張のバージョン要件。OS 別の注意事項 -->

---

## 推奨ホストスペック

<!-- Batch 5 で記述：RAM・ストレージ等の推奨スペック。16GB RAM 以上推奨等 -->

---

## クローンから起動まで

<!-- Batch 5 で記述：全コマンドをコピペ可能な形式で記載。git clone → VS Code で「Reopen in Container」→ サービス起動（pnpm dev / ./gradlew bootRun）の手順 -->

---

## 動作確認手順

<!-- Batch 5 で記述：確認 URL と期待するレスポンス。http://localhost:3000（フロントエンド）・http://localhost:8080/actuator/health（バックエンド）等 -->

---

## 初期データ投入

`scripts/seed.sql` には部署・ユーザー・リソース・サンプル予約・承認ステップの初期データが含まれています。DevContainer 起動・PostgreSQL サービス稼働後に一度だけ実行してください（再実行しても冪等です）。

### 実行方法

`psql` クライアントは devcontainer（frontend コンテナ）にインストールされていないため、postgres コンテナに直接コマンドを渡します。

**ステップ 1：postgres コンテナ名を確認する**

```bash
docker ps --format "table {{.Names}}\t{{.Image}}" | grep postgres
```

表示例：`aidevelopmenttutorial_devcontainer-postgres-1`

**ステップ 2：seed を投入する**

```bash
# <postgres コンテナ名> を実際のコンテナ名に置き換える
docker exec -i <postgres コンテナ名> psql -U bookflow -d bookflow < scripts/seed.sql
```

実行例：

```bash
docker exec -i aidevelopmenttutorial_devcontainer-postgres-1 \
  psql -U bookflow -d bookflow < scripts/seed.sql
```

> **docker compose exec を使う場合**：compose プロジェクト名が環境によって異なるため、`docker compose exec postgres psql ...` は「service is not running」と誤判定されることがあります。コンテナ名を直接指定する `docker exec -i` の方法を推奨します。

### 投入後の確認

以下のクエリでデータが入ったことを確認できます。

```bash
docker exec -i <postgres コンテナ名> psql -U bookflow -d bookflow \
  -c "SELECT name, category, requires_approval FROM resources ORDER BY category;"
```

期待する出力（3 件）：

```
       name        | category  | requires_approval
-------------------+-----------+------------------
 プロジェクターA    | EQUIPMENT | f
 第1会議室          | ROOM      | t
 社用車A            | VEHICLE   | f
(3 rows)
```

また、アプリを起動してブラウザで `http://localhost:3000/resources` にアクセスし、リソースが 3 件表示されることでも確認できます。

| 確認項目 | 期待値 |
|---------|--------|
| リソース | 3 件（ROOM・EQUIPMENT・VEHICLE 各 1 件） |
| 予約 | 2 件（APPROVED 1 件・PENDING 1 件） |
| 承認待ち（`/approvals`） | 1 件（第1会議室の申請） |

---

## よくあるトラブル

詳細は [troubleshooting.md](./troubleshooting.md) を参照してください。

<!-- Batch 5 で記述：頻出エラーへの簡易案内と troubleshooting.md の該当セクションへのリンク -->
