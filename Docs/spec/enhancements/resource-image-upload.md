---
type: spec
title: リソース画像アップロード
description: 施設・備品のリソースに画像をアップロード・表示するエンハンス課題のビジネス要求シート
tags: [spec, enhancement, resource, image-upload]
timestamp: 2026-06-16
audience: 学習者・メンター
references:
  - Docs/spec/requirements.md
  - Docs/spec/enhancements/index.md
---

# リソース画像アップロード

---

## 背景

現在の `resources` テーブルには画像を保持するカラムが存在せず、リソース詳細画面に写真を表示する機能がありません。会議室・設備の見た目を画像で確認できることで、利用者が予約前に場所や環境を把握しやすくなります。

ARCHITECTURE.md の技術マッピングでは、リソース画像保存の外部サービスとして **Amazon S3**（開発環境では LocalStack）が拡張先として明示されています。本課題では LocalStack 上の S3 互換ストレージと連携した画像アップロード・表示機能を縦切りで実装します。

## 要件

| # | 要件 |
|---|------|
| RES-01 | `resources` テーブルに画像 URL を格納するカラム（例：`image_url TEXT`）を Flyway マイグレーションで追加する |
| RES-02 | `POST /api/resources/{id}/image` エンドポイントを新設し、管理者が画像ファイル（JPEG/PNG）をアップロードできる |
| RES-03 | アップロードされた画像は LocalStack 上の S3 バケットに保存し、得られた URL を `resources.image_url` に保存する |
| RES-04 | `GET /api/resources/{id}` のレスポンスに `imageUrl` フィールドを追加する |
| RES-05 | リソース詳細画面（`/resources/{id}`）と管理画面（`/admin/resources`）に画像表示・アップロード UI を追加する |
| RES-06 | ファイルサイズ上限（例：5 MB）とファイル形式（JPEG/PNG）のバリデーションをバックエンドで行う |

## 受入条件

- [ ] 管理者がリソース管理画面から画像ファイルを選択してアップロードできる
- [ ] アップロードした画像がリソース詳細画面に表示される
- [ ] JPEG・PNG 以外のファイルを送信すると 400 エラーが返る
- [ ] 5 MB を超えるファイルを送信すると 400 エラーが返る
- [ ] LocalStack の S3 バケットに画像が保存されていることを確認できる
- [ ] `image_url` が未設定の場合はデフォルト画像またはプレースホルダーを表示する

## 影響範囲

- 対象レイヤー：両方
- 更新が必要な spec：
  - `er-diagram.md` §`resources` テーブル — `image_url` カラムを追記
  - `api-spec.md` — `POST /api/resources/{id}/image`・`GET /api/resources/{id}` の `imageUrl` フィールドを追記
  - `screen-spec.md` §`/resources/{id}` — 画像表示エリアを追記；§`/admin/resources` — アップロード UI を追記

## AI 活用ポイント

- plan mode で「AWS SDK for Java v2（`S3Client`）を使うか、Spring の `ResourceLoader` / `FileSystemResource` で代替するか」を相談する
- `.devcontainer/docker-compose.yml` に LocalStack サービスを追加し、S3 バケットを初期化するスクリプトを AI に生成させる（LocalStack の設定は `docker-compose.override.yml` を使う等）
- `@Value("${aws.s3.bucket-name}")` 等の設定プロパティの管理と、`application-local.yml` への追記方法を AI に確認する
- フロントエンドの画像アップロード UI は `<input type="file">` + Server Action で実装する（Next.js App Router での `FormData` 送信パターン）
