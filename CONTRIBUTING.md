# コントリビューションガイド

---

## ブランチ命名規則

```
feature/<issue番号>-<kebab-case の説明>
```

**例**: `feature/42-add-tag-search`

- `main` への直接 push は禁止。必ず PR 経由でマージする。
- `main` からブランチを切って作業する（Fork 方式は採用しない）。

---

## コミットメッセージ（Conventional Commits）

```
<type>: <概要（英語または日本語）>
```

| type | 用途 |
|------|------|
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | コードの動作に影響しない変更（フォーマット等） |
| `refactor` | バグ修正・機能追加を伴わないリファクタリング |
| `test` | テストの追加・修正 |
| `chore` | ビルドプロセス・補助ツールの変更 |

**例**:
```
feat: タグ検索 API を追加
fix: 重複予約チェックのロジックを修正
docs: README にクイックスタートを追記
```

---

## PR 提出の手順

1. `main` から作業ブランチを作成する
   ```bash
   git checkout main && git pull
   git checkout -b feature/<issue番号>-<説明>
   ```
2. 実装・コミットする
3. PR を作成する（GitHub の PR テンプレートを埋める）
4. CI（GitHub Actions）がグリーンになることを確認する
5. メンターをレビュワーに指定してレビュー依頼する

---

## セルフレビューチェックリスト

PR を出す前に以下を確認する。

- [ ] `pnpm lint` / `./gradlew checkstyleMain` がエラーなし
- [ ] `pnpm test` / `./gradlew test` が全パス
- [ ] 変更に対応したテストを追加した
- [ ] `README.md` や `CLAUDE.md` の更新が必要な場合は更新した

---

## メンターへのレビュー依頼

1. PR の Reviewers に担当メンターを追加する
2. PR 本文の「レビュー依頼コメント」欄に、特に見てほしいポイントを記載する
3. `CODEOWNERS` に記載されたメンターには自動でレビュー依頼が届く

---

> **ブランチ保護について**:  
> `main` ブランチは以下のルールで保護されている。  
> 直接 push 禁止 / PR 必須 / CI 通過必須 / 最低 1 名のレビュー承認が必要
