# コントリビューションガイド

---

## ブランチ命名規則

```
feature/<GitHubユーザー名>/<issue番号>-<kebab-case の説明>
```

**例**: `feature/taro/42-add-tag-search`

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
   git checkout -b feature/<GitHubユーザー名>/<issue番号>-<説明>
   ```
2. 実装・コミットする
3. PR を作成する（GitHub の PR テンプレートを埋める）
4. CI（GitHub Actions）がグリーンになることを確認する
5. [セルフレビューチェックリスト](#セルフレビューチェックリスト)を満たしたら、自分で PR をマージする（メンターの承認は不要。[ADR-023](Docs/decision/ADR-023-mentor-gate-removal.md) 参照）

---

## セルフレビューチェックリスト

PR を出す前に以下を確認する。

- [ ] `pnpm lint` / `./gradlew checkstyleMain` がエラーなし
- [ ] `pnpm test` / `./gradlew test` が全パス
- [ ] 変更に対応したテストを追加した
- [ ] `README.md` や `CLAUDE.md` の更新が必要な場合は更新した

---

## メンターのサポート（任意）

メンターの承認はマージの条件ではない。メンターは Issue・PR に任意のタイミングでコメントする役割であり、レビュー依頼を出す・待つ必要はない（[ADR-023](Docs/decision/ADR-023-mentor-gate-removal.md) 参照）。

TODO: `@claude` 等のメンションで自動 PR レビューを行わせる仕組みを導入予定だが、現時点では未実装。導入までは上記のセルフレビューのみで完結する。

---

> **ブランチ保護について**:  
> `main` ブランチは以下のルールで保護される。  
> 直接 push 禁止 / PR 必須 / 必須 status check（`CI Frontend / ci`・`CI Backend / ci`）通過必須 / 承認レビューは必須にしない（`Require approvals` はオフ、CODEOWNERS 不使用）
