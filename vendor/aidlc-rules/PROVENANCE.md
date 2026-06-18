# PROVENANCE

このディレクトリは [awslabs/aidlc-workflows](https://github.com/awslabs/aidlc-workflows) の一部を逐語的に取り込んだ vendored スナップショットです。

- **リポジトリ**: https://github.com/awslabs/aidlc-workflows
- **固定コミット**: `b19c81928bdf1b8d13856f462fcf2ede1720b4cb`（2026-06-08）
- **VERSION**: `0.1.8`（`aidlc-rules/VERSION`、CHANGELOG.md より確認）
- **ライセンス**: MIT No Attribution（`LICENSE` を同梱、上流 `LICENSE` を転記）
- **取得日**: 2026-06-14

## 取り込み範囲

`aidlc-rules/aws-aidlc-rules/core-workflow.md`（オーケストレーション本体）と `aidlc-rules/aws-aidlc-rule-details/` 配下の全フォルダ（common / inception / construction / operations / extensions）、計32ファイルを逐語コピー。

raw URL の共通プレフィクス: `https://raw.githubusercontent.com/awslabs/aidlc-workflows/b19c81928bdf1b8d13856f462fcf2ede1720b4cb/`

### オーケストレーション

| ファイル | 上流パス |
|---|---|
| `aws-aidlc-rules/core-workflow.md` | `aidlc-rules/aws-aidlc-rules/core-workflow.md` |

### common（全フェーズ共通、11ファイル）

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

### inception（フェーズ1、7ファイル）

| ファイル | 上流パス |
|---|---|
| `inception/workspace-detection.md` | `aidlc-rules/aws-aidlc-rule-details/inception/workspace-detection.md` |
| `inception/reverse-engineering.md` | `aidlc-rules/aws-aidlc-rule-details/inception/reverse-engineering.md` |
| `inception/requirements-analysis.md` | `aidlc-rules/aws-aidlc-rule-details/inception/requirements-analysis.md` |
| `inception/user-stories.md` | `aidlc-rules/aws-aidlc-rule-details/inception/user-stories.md` |
| `inception/workflow-planning.md` | `aidlc-rules/aws-aidlc-rule-details/inception/workflow-planning.md` |
| `inception/application-design.md` | `aidlc-rules/aws-aidlc-rule-details/inception/application-design.md` |
| `inception/units-generation.md` | `aidlc-rules/aws-aidlc-rule-details/inception/units-generation.md` |

### construction（フェーズ2、6ファイル）

| ファイル | 上流パス |
|---|---|
| `construction/functional-design.md` | `aidlc-rules/aws-aidlc-rule-details/construction/functional-design.md` |
| `construction/nfr-requirements.md` | `aidlc-rules/aws-aidlc-rule-details/construction/nfr-requirements.md` |
| `construction/nfr-design.md` | `aidlc-rules/aws-aidlc-rule-details/construction/nfr-design.md` |
| `construction/infrastructure-design.md` | `aidlc-rules/aws-aidlc-rule-details/construction/infrastructure-design.md` |
| `construction/code-generation.md` | `aidlc-rules/aws-aidlc-rule-details/construction/code-generation.md` |
| `construction/build-and-test.md` | `aidlc-rules/aws-aidlc-rule-details/construction/build-and-test.md` |

### operations（フェーズ3、1ファイル）

| ファイル | 上流パス |
|---|---|
| `operations/operations.md` | `aidlc-rules/aws-aidlc-rule-details/operations/operations.md` |

### extensions（オプトイン拡張、6ファイル）

| ファイル | 上流パス |
|---|---|
| `extensions/security/baseline/security-baseline.md` | `aidlc-rules/aws-aidlc-rule-details/extensions/security/baseline/security-baseline.md` |
| `extensions/security/baseline/security-baseline.opt-in.md` | `aidlc-rules/aws-aidlc-rule-details/extensions/security/baseline/security-baseline.opt-in.md` |
| `extensions/resiliency/baseline/resiliency-baseline.md` | `aidlc-rules/aws-aidlc-rule-details/extensions/resiliency/baseline/resiliency-baseline.md` |
| `extensions/resiliency/baseline/resiliency-baseline.opt-in.md` | `aidlc-rules/aws-aidlc-rule-details/extensions/resiliency/baseline/resiliency-baseline.opt-in.md` |
| `extensions/testing/property-based/property-based-testing.md` | `aidlc-rules/aws-aidlc-rule-details/extensions/testing/property-based/property-based-testing.md` |
| `extensions/testing/property-based/property-based-testing.opt-in.md` | `aidlc-rules/aws-aidlc-rule-details/extensions/testing/property-based/property-based-testing.opt-in.md` |

## 取り扱い方針

- このディレクトリの内容は**改変しない**（上流 diff の基準とするため）。
- BookFlow 向けに再構成・翻案した活性資産は `.claude/rules/` に別途配置する。
- 採用状況・反映先・上流追従の手順は [`Docs/spec/aidlc-adoption.md`](../../Docs/spec/aidlc-adoption.md) を参照。
- `Docs/` 配下や Zensical のサイト nav には含めない（上流参照であり BookFlow の仕様ではないため）。

## 上流同期手順

1. `awslabs/aidlc-workflows` の最新コミットを確認する。
2. 各サブディレクトリ（`common/` / `inception/` / `construction/` / `operations/` / `extensions/` / `aws-aidlc-rules/`）の各ファイルを新しい上流コミットの内容と diff する（このディレクトリが基準スナップショット）。
3. 差分があった内容について、`Docs/spec/aidlc-adoption.md` の採用台帳・`.claude/rules/`・`.claude/skills/` を更新する。
4. このディレクトリの内容・`PROVENANCE.md` の固定コミット・取得日を新しい値に更新する。
5. `Docs/spec/aidlc-adoption.md` の固定コミット表記も合わせて更新する。
