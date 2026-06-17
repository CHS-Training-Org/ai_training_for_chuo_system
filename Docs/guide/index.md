# 学習者向けガイド (Guide)

> 対象読者：学習者（主に新人）
> 参照：[PROJECT_PLAN.md](../PROJECT_PLAN.md) / [PHASE4_AI_DRIVEN_DEV_TASKS.md](../plan/PHASE4_AI_DRIVEN_DEV_TASKS.md)

学習者が詰まりやすいポイントを先回りして解決するためのガイドです。  
環境構築から AI ツールの活用方法・コーディング規約まで、実装作業に必要な情報を網羅します。

---

## 管理ファイル一覧

| ファイル | 目的 | 対象読者 |
|---------|------|---------|
| [curriculum.md](./curriculum.md) | 学習カリキュラム。学習パスマップ（新人・中堅）と必須ステップ課題 STEP-01〜05（環境構築・運用フロー理解・AI ツール・コードベース把握・既存機能読解）の定義 | 学習者（新人・中堅）・メンター |
| [enhancement-catalog.md](./enhancement-catalog.md) | 選択課題カタログ。エンハンス課題を難易度（Beginner / Intermediate / Advanced）・推定工数・対象レイヤー付きで一覧化。必須ステップ完了後の次の課題選択に使う | 学習者（新人・中堅）・メンター |
| [getting-started.md](./getting-started.md) | 環境構築・起動手順。STEP-01 の手順書として機能。クローンから動作確認・初期データ投入まで | 学習者（主に新人） |
| [ai-tools-guide.md](./ai-tools-guide.md) | AI ツール活用ガイド。Claude Code のセットアップ・使い方・活用チェックリスト。STEP-03 の参照資料 | 学習者（主に新人） |
| [coding-conventions.md](./coding-conventions.md) | コーディング規約。フロントエンド・バックエンドの命名規則・Lint/Format 設定・テスト方針 | 学習者（主に新人） |
| [dev-workflow.md](./dev-workflow.md) | 開発ワークフロー。Issue 選択からブランチ・実装・PR・レビュー・マージまでの標準フロー | 学習者（主に新人） |
| [review-criteria.md](./review-criteria.md) | 評価基準・レビュー観点。第 2 ゲート（メンターレビュー）の完了条件チェックリストと新人/中堅別のレビュー観点表 | メンター・リポジトリ管理者 |
| [issue-registration.md](./issue-registration.md) | ラベル設計と課題 Issue 起票手順。ラベル体系・マッピング規則・起票フロー・label-sync 実行手順 | メンター・リポジトリ管理者 |
| [operations-guide.md](./operations-guide.md) | 運用ガイド。役割分担（運用責任マトリクス）・質問サポートフロー・レビュー応答方針 | メンター・リポジトリ管理者 |
| [dependency-policy.md](./dependency-policy.md) | 依存更新ポリシー。Dependabot 設定（pnpm / Gradle / GitHub Actions / コンテナイメージ）の概要・更新サイクル・Dependabot PR の扱い・学習者への反映方針 | メンター・リポジトリ管理者 |
| [troubleshooting.md](./troubleshooting.md) | よくあるトラブルと解決策。DevContainer・依存インストール・起動・DB 等のエラーと対処法 | 学習者（主に新人） |
