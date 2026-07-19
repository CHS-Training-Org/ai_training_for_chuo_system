---
name: update-spec
description: BookFlow の仕様書 Docs/spec/（requirements / screen-spec / api-spec / er-diagram）を Spec-first ルールに沿って更新・新規作成する。機能の追加・変更・削除、API／画面／データモデル／要件／権限の変更、エンハンス課題の実装開始時に必ず使う。「仕様を更新して」「spec を直して」「仕様書を書いて」と言われたとき、および仕様に影響しうるコード変更を始める前・新しい仕様ページを作るときも必ずこのスキルを使うこと。実装より先に仕様を更新する運用なので、コードを書く前に起動するのが正解。
---

# update-spec — BookFlow 仕様書を Spec-first で更新する

`Docs/spec/` は BookFlow の「真実の源」。このスキルは「どのファイルをどう更新し、何をチェックするか」を案内する。

## 1. Spec-first 原則（要約）

機能の追加・変更・削除を行うときは、**実装より先に仕様を更新する**。実装と仕様の乖離を防ぎ、メンターが仕様差分から先にレビューできるようにするため。

- 正式ルールは [`Docs/spec/index.md` の「仕様更新ルール（Spec-first）」](../../../Docs/spec/index.md#spec-first) が正。本スキルはその実行手段なので矛盾させないこと。
- 仕様更新は実装と**同一 PR** で提出する。独立した `docs(spec): <変更内容>` コミットに分けてもよいし、実装コミットに同梱してもよい（分ける場合は PR の先頭コミットにする）。

## 2. 変更種別 → 更新対象ファイル

まず変更内容を下表で分類し、更新先を特定する。**1 機能の変更は通常複数ファイルにまたがる**（例：API を 1 本足すなら、api-spec のエンドポイント定義に加え requirements の権限マトリクスと screen-spec の呼び出し元画面も確認する）。

| 変更内容 | 主な更新先 | 連動して確認するもの |
|---------|-----------|--------------------|
| 要件・ロール・権限・ユースケース | `requirements.md`（UC 一覧表 ＋ 該当 §セクションの両方） | §共通の API 権限マトリクス・画面アクセス権限表・ステータス遷移図 |
| 画面の追加・変更 | `screen-spec.md`（画面一覧表 ＋ 画面遷移図 ＋ 該当 §セクション） | requirements の画面アクセス権限表、呼び出す API（api-spec） |
| API の追加・変更 | `api-spec.md`（エンドポイント一覧表 ＋ 該当 §セクション。§共通の認証/日時/エラー/ページネーションに影響するならそちらも） | requirements の API 権限マトリクス、呼び出す画面（screen-spec） |
| データモデル変更 | `er-diagram.md`（Mermaid ER 図 ＋ エンティティ定義表 ＋ インデックス方針表） | **正は Flyway マイグレーション**（`backend/src/main/resources/db/migration/`）。必ず突合する |
| エンハンス課題（ビジネス要求シート） | `Docs/spec/enhancements/<課題>.md`（新規作成。様式は §5 参照） | 課題に応じて requirements / screen-spec / api-spec / er-diagram も確認 |

> **注意**：ER 図の正は ER 図そのものではなく Flyway の SQL。データモデルを変えるときは新しいマイグレーション（`V0xx__*.sql`）と er-diagram.md を同時に整合させる。

## 3. 更新手順

1. 変更内容を整理し、上のマッピング表で更新対象ファイルを特定する。
2. 対象ファイルの既存セクション構造・表記規約に合わせて更新する。**表記の具体例・テンプレートは [`references/spec-conventions.md`](references/spec-conventions.md) を読んでから書く**（アンカー付与基準・各ファイルの記述フォーマット・Mermaid 使い分け・文体）。
3. 下の「更新後チェックリスト」を実行する。
4. コミットする。独立した `docs(spec): <変更内容>` コミットに分ける場合は PR の先頭コミットにする。実装コミットに同梱する場合は、そのコミットメッセージ（`feat:`/`fix:` 等）に仕様更新を含めてよい。

## 4. 更新後チェックリスト

- **一覧表と本文の整合**：エンドポイント一覧 ⇄ 各 § の詳細、画面一覧 ⇄ 遷移図 ⇄ 詳細、UC 一覧 ⇄ 各 UC セクション。一覧に足したら本文も足す（逆も同様）。
- **総数表記の更新**：明示的な件数の記載を grep で洗い出し、漏れなく直す。既知の箇所：
  - `index.md`：「全 10 画面」（管理ファイル一覧の screen-spec の説明）
  - `requirements.md`：「8 ユースケース」
  - `er-diagram.md`：「5 つのインデックス」
  - api-spec.md には「全 X エンドポイント」の明示記載はないが、件数を書くなら `### \`METHOD /path\`` 見出しを自分で数えて確認する（現状 18 本）。経年劣化を避けたいなら数を書かず「一覧表と § 詳細の件数を突合する」とだけ書く方がよい。
- **相互リンク・アンカーの整合**：リンク先アンカー（`#uc-05`・`#datetime-format` 等）が実在するか。新規見出しを他所から参照するなら明示アンカー `{ #id }` を付ける（→ references 参照）。
- **管理ファイル一覧との整合**：新規ファイルを足したら `Docs/spec/index.md` の管理ファイル一覧表に行を追加する。
- **権限マトリクスへの反映**：API・画面を足したら requirements.md の API 権限マトリクス／画面アクセス権限表、screen-spec のサイドナビ表に行を追加する。

## 5. 新規仕様ページの作成手順

1. `Docs/spec/` 配下に作成する（エンハンス課題の要件書は `Docs/spec/enhancements/` サブディレクトリに置く。様式は [`references/spec-conventions.md`](references/spec-conventions.md) の「enhancements/\<課題\>.md — ビジネス要求シートのテンプレート」を使う。配置規約・運用原則は [`Docs/spec/enhancements/index.md`](../../../Docs/spec/enhancements/index.md) を参照）。
2. 既存ファイルの冒頭スタイルを踏襲する：

   ```
   # タイトル

   > 対象読者：学習者・メンター
   > 参照：[requirements.md](./requirements.md) / [api-spec.md](./api-spec.md)

   ---
   ```

3. `Docs/spec/index.md` の管理ファイル一覧表へ 1 行追加する。
4. `zensical.toml` の nav に追記する。`仕様 (Spec)` のリストにファイルパス文字列を 1 行加える（`docs_dir = "Docs"` 起点の相対パス。先頭の `Docs/` は付けない）：

   ```toml
   {"仕様 (Spec)"   = [
     "spec/index.md",
     "spec/requirements.md",
     "spec/screen-spec.md",
     "spec/api-spec.md",
     "spec/er-diagram.md",
     "spec/enhancements/<new-page>.md",   # ← 追記
   ]},
   ```

5. ビルド確認：

   ```bash
   docker compose -f .devcontainer/docker-compose.yml exec docs uv run zensical build
   ```

## 参照

- 表記規約の実例集（書く前に読む）：[`references/spec-conventions.md`](references/spec-conventions.md)
- 正式ルール：[`Docs/spec/index.md#spec-first`](../../../Docs/spec/index.md#spec-first)
