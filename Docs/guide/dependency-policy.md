# 依存更新ポリシー（Dependabot）

> 対象読者：メンター・リポジトリ管理者  
> 参照：[PROJECT_PLAN.md §5 リスク管理](../PROJECT_PLAN.md) / [operations-guide.md](./operations-guide.md) / [ADR-011 バックエンド：ビルドツール](../decision/ADR-011-backend-build-tool.md)

このページは、BookFlow の**依存ライブラリ・コンテナイメージ・GitHub Actions の自動更新設定と運用方針**を一元化します。  
設定の真実の源は [`.github/dependabot.yml`](../../.github/dependabot.yml) であり、このページはその方針・背景・運用手順を説明します。

---

## Dependabot 設定の概要 { #config }

Dependabot v2 で 4 つのエコシステムを監視します。

| エコシステム | `package-ecosystem` | `directory` | 更新間隔 | 対象 |
|---|---|---|:---:|---|
| GitHub Actions | `github-actions` | `/` | 月次 | `.github/workflows/*.yml` の `uses:` |
| フロントエンド（pnpm） | `npm` | `/frontend` | 月次 | `frontend/package.json`（`pnpm-lock.yaml` を検知して pnpm として処理） |
| バックエンド（Gradle） | `gradle` | `/backend` | 月次 | `backend/build.gradle.kts` |
| コンテナイメージ | `docker-compose` | `/.devcontainer` | 四半期 | `.devcontainer/docker-compose.yml` の `image:` タグ |

**設計判断：`docker-compose` エコシステムを使う理由**  
本リポジトリに Dockerfile は存在せず、コンテナイメージは `.devcontainer/docker-compose.yml` の `image:` 行でのみ定義されています。Dependabot の `docker`（Dockerfile 対象）と `docker-compose`（Compose ファイル対象）は別エコシステムのため、`docker-compose` を指定しています。

!!! note "メンター・リポジトリ管理者向け"
    Dependabot は push 後に GitHub がスキーマを検証し、リポジトリの **Insights → Dependabot** にエコシステムが表示されます。初回は設定追加の push からしばらく後に PR が起票されます。ローカル環境からはトリガーできません。

---

## 更新サイクル { #schedule }

| 対象 | 間隔 | 根拠 |
|------|:----:|------|
| FE（pnpm）・BE（Gradle）・GitHub Actions | **月次** | [PROJECT_PLAN.md §5](../PROJECT_PLAN.md) の「依存更新ポリシー（月次チェック）」に整合。セキュリティパッチの取り込み遅延を 1 か月以内に抑える |
| コンテナイメージ（Docker Compose） | **四半期** | 学習環境は安定性を優先。ベースイメージ更新は DevContainer 再ビルドを伴うため、頻繁な変更を避ける |

---

## グルーピング方針 { #groups }

Dependabot PR の本数を絞り、メンターのレビュー負荷を軽減するため、**minor / patch 更新はグループにまとめて 1 PR に集約**します。Major 更新は破壊的変更を個別に検討するため 1 依存につき 1 PR です。

| 更新種別 | PR の扱い |
|----------|----------|
| minor / patch | グループ PR（エコシステムごとに 1 PR にまとめる） |
| major | 個別 PR（依存ごとに個別起票） |

`open-pull-requests-limit` はエコシステムごとに設定しています（GitHub Actions・FE・BE は 5、コンテナイメージは 3）。上限を超えた場合は既存 PR がマージまたはクローズされるまで新規起票が停止します。

---

## Dependabot PR の扱い { #pr-handling }

Dependabot が起票する PR も学習者の PR と**同じ CI ゲートと第 2 ゲートを通します**。

### CI ゲート（自動）

| status check | 概要 |
|---|---|
| `CI Frontend / ci` | Lint・フォーマットチェック・ユニットテスト（`paths: frontend/**` で発火） |
| `CI Backend / ci` | Gradle テスト・Spotless・Checkstyle（`paths: backend/**` で発火） |
| `Security Scan / trivy` | 依存関係の脆弱性スキャン（全 PR で発火） |

!!! warning "Security Scan がブロックした場合"
    Trivy が HIGH / CRITICAL の脆弱性を検出して CI がブロックされた場合は、そのまま更新を取り込んではいけません。別途 fixable な更新が存在しないか確認し、必要に応じて依存バージョンを手動調整するか PR をクローズしてください（[dev-workflow.md §8](./dev-workflow.md#flow) 参照）。

### メンター Approve（第 2 ゲート）

CI が green になった後、メンター（またはリポジトリ管理者）が内容を確認して Approve → マージします。  
レビュー時の確認観点は [review-criteria.md](./review-criteria.md) を参照してください。

---

## ラベル { #labels }

Dependabot PR には自動的に **`type:dependencies`** ラベルが付きます（[`.github/dependabot.yml`](../../.github/dependabot.yml) の `labels:` で設定）。  
コミットメッセージプレフィックスは `chore`（[coding-conventions.md §コミット・PR 規約](./coding-conventions.md#commit-pr) の Conventional Commits `chore` に整合）。

!!! note "label-sync 実行の確認"
    `type:dependencies` ラベルは `.github/labels.yml` に追加済みです。Dependabot が初回 PR を起票する**前**に label-sync workflow を実行してラベル実体をリポジトリに作成してください。手順は [issue-registration.md §label-sync の実行](./issue-registration.md#label-sync) を参照してください。

---

## 学習者への反映方針 { #learner-policy }

Dependabot がマージした main ブランチの更新を、進行中の学習者にどう反映するかの方針です。

- **進行中の学習者には main 更新を強制しない**：`feature/<issue番号>-<short-desc>` ブランチで作業中の学習者は、main にマージされた依存更新を取り込む必要はありません。
- **進行中 feature ブランチへの取り込みは任意**：学習者が必要と判断した場合のみ `git merge main` または `git rebase main` を行います。
- **新規開始者は最新 main から始める**：新しく学習を開始する学習者は、課題取り組み開始時に最新の main ブランチを起点にしてください。

なお、`vendor/aidlc-rules/` の上流同期（[3.7 AI-DLC 実ファイルの取り込み](../plan/PHASE4_AI_DRIVEN_DEV_TASKS.md)）は Dependabot ではなく手動の diff・反映手順で管理しており、本ポリシーとは別系統です。

---

## 将来の拡張 { #future }

- **`devcontainers` エコシステム**：`devcontainer-lock.json`（DevContainer Features のロック）を対象にする追加エントリを設けることができます（`package-ecosystem: "devcontainers"`）。現時点ではタスク定義の 4 エコシステム外のため未設定です。
- **Gradle `dependencyLocking`**：`dependencyLocking` を有効化すると `gradle.lockfile` が生成され、再現性が向上します。Dependabot も lockfile を更新するようになります（現状はマニフェスト直接更新）。必要に応じて別タスクとして検討してください。

---

## 関連ドキュメント

- 運用責任マトリクス（main 保守・依存更新の担当）：[operations-guide.md §役割分担](./operations-guide.md#roles)
- 標準開発フロー・CI ゲートの詳細：[dev-workflow.md](./dev-workflow.md#flow)
- レビュー観点・評価基準：[review-criteria.md](./review-criteria.md)
- ラベル体系・label-sync 手順：[issue-registration.md](./issue-registration.md)
- ADR-011（Gradle 採用・Dependabot 整備の約束）：[ADR-011-backend-build-tool.md](../decision/ADR-011-backend-build-tool.md)
- リスク管理（月次チェック・Dependabot の計画）：[PROJECT_PLAN.md §5](../PROJECT_PLAN.md)
