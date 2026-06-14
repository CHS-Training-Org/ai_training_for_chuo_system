# PROVENANCE

このディレクトリは [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) の一部を逐語的に取り込んだ vendored スナップショットです。

- **リポジトリ**: https://github.com/awslabs/aidlc-workflows
- **固定コミット**: `b19c81928bdf1b8d13856f462fcf2ede1720b4cb`（2026-06-08）
- **VERSION**: `0.1.8`（`aidlc-rules/VERSION`、CHANGELOG.md より確認）
- **ライセンス**: MIT No Attribution（`LICENSE` を同梱、上流 `LICENSE` を転記）
- **取得日**: 2026-06-14

## 取り込み範囲

`aidlc-rules/aws-aidlc-rule-details/common/` 配下の全11ファイルを `common/` に逐語コピー。

| ファイル | 上流パス |
|---|---|
| `common/ascii-diagram-standards.md` | `aidlc-rules/aws-aidlc-rule-details/common/ascii-diagram-standards.md` |
| `common/content-validation.md` | `aidlc-rules/aws-aidlc-rule-details/common/content-validation.md` |
| `common/depth-levels.md` | `aidlc-rules/aws-aidlc-rule-details/common/depth-levels.md` |
| `common/error-handling.md` | `aidlc-rules/aws-aidlc-rule-details/common/error-handling.md` |
| `common/overconfidence-prevention.md` | `aidlc-rules/aws-aidlc-rule-details/common/overconfidence-prevention.md` |
| `common/process-overview.md` | `aidlc-rules/aws-aidlc-rule-details/common/process-overview.md` |
| `common/question-format-guide.md` | `aidlc-rules/aws-aidlc-rule-details/common/question-format-guide.md` |
| `common/session-continuity.md` | `aidlc-rules/aws-aidlc-rule-details/common/session-continuity.md` |
| `common/terminology.md` | `aidlc-rules/aws-aidlc-rule-details/common/terminology.md` |
| `common/welcome-message.md` | `aidlc-rules/aws-aidlc-rule-details/common/welcome-message.md` |
| `common/workflow-changes.md` | `aidlc-rules/aws-aidlc-rule-details/common/workflow-changes.md` |

各ファイルの raw URL: `https://raw.githubusercontent.com/awslabs/aidlc-workflows/b19c81928bdf1b8d13856f462fcf2ede1720b4cb/aidlc-rules/aws-aidlc-rule-details/common/<file>`

## 取り扱い方針

- このディレクトリの内容は**改変しない**（上流 diff の基準とするため）。
- BookFlow 向けに再構成・翻案した活性資産は `.claude/rules/` に別途配置する。
- 採用状況・反映先・上流追従の手順は [`Docs/spec/aidlc-adoption.md`](../../Docs/spec/aidlc-adoption.md) を参照。
- `Docs/` 配下や Zensical のサイト nav には含めない（上流参照であり BookFlow の仕様ではないため）。

## 上流同期手順

1. `awslabs/aidlc-workflows` の最新コミットを確認する。
2. `common/` 配下の各ファイルを新しい上流コミットの内容と diff する（このディレクトリが基準スナップショット）。
3. 差分があった内容について、`Docs/spec/aidlc-adoption.md` の採用台帳・`.claude/rules/` を更新する。
4. このディレクトリの内容・`PROVENANCE.md` の固定コミット・取得日を新しい値に更新する。
5. `Docs/spec/aidlc-adoption.md` の固定コミット表記も合わせて更新する。
