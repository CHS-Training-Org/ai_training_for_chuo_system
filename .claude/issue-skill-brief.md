# ハンドオフ仕様：issue 起票スキルを skill-creator で作る

> **このファイルの使い方（別セッション向け）**
> 1. Claude Code を再起動し、`skill-creator` プラグインがロードされた状態で起動する
>    （`skill-creator@claude-plugins-official` は `~/.claude/settings.json` の `enabledPlugins` で有効化済み。
>    有効化後に再起動していないセッションでは未ロードになる）。
> 2. このファイル全文を読み込む。
> 3. `skill-creator` スキルを起動し、「下記仕様の issue 起票スキルを新規作成して」と指示する。
> 4. 本書の「確定事項」は決定済み。再質問せず、その通りに実装すること。
>    「実装者が判断/確認する点」だけ、必要ならユーザーに確認する。
>
> 作成元セッション日付: 2026-06-29 / 調査ブランチ: feature/claude-review-workflow

---

## 1. ミッション

ユーザーから質問（インタビュー）形式で issue の内容を聞き取り、テンプレートに沿った本文を組み立て、
**`gh` CLI で GitHub に実際に issue を起票する**スキルを作る。

リポジトリ: `CHS-Training-Org/ai_training_for_chuo_system`（remote origin = https、確認済み）。

---

## 2. 確定事項（ユーザー決定済み・再質問不要）

| 項目 | 決定 |
|------|------|
| 登録方法 | **実際に起票まで行う**（`gh issue create` で GitHub に直接作成。本文出力だけで終わらせない） |
| 対応テンプレート | **課題テンプレート（必須/選択）と汎用 Issue の両方**を作成可能にする |
| スキル作成手段 | **skill-creator を使う**（このハンドオフの前提そのもの） |

---

## 3. 環境事実（このセッションで実地確認済み）

- **`gh` CLI は未インストール**。`command -v gh` で不在を確認済み。
  → スキルの前提条件として `gh` のインストールと `gh auth login`（認証）が必要。
  Windows なので導入例は `winget install --id GitHub.cli`。
- **既存 Issue テンプレート**（`.github/ISSUE_TEMPLATE/`）:
  - `required-task.yml` … 「必須課題（STEP）」。`title: "[STEP-XX] "`、`labels: [required]`
  - `optional-task.yml` … 「選択課題（エンハンス）」。`title: "[Enhance] "`、`labels: [optional]`
  - `config.yml` … `blank_issues_enabled: false`（**Web UI からの自由記述 issue は禁止**）
- **ラベル運用**（`.github/labels.yml` が真実の源、`Docs/guide/issue-registration.md` に手順）:
  - `required` / `optional` … テンプレートが自動付与。ただし **gh 起票ではテンプレート自動ラベルが効かないため `--label` で明示必須**。
  - `level:beginner|intermediate|advanced`、`type:frontend|backend|fullstack`、`sequential`、`in-progress` … **メンターが起票後に手動付与**。スキルでは付けない（任意で案内文に含める）。
  - ラベル実体がリポジトリに無いと **付与がサイレントに無視される**（label-sync 前提）。
- **既存スキルの置き場所**: `.claude/skills/`（`aidlc` / `draft-pr` / `drawio-skill` / `update-spec`）。
  - **最も近い既存スキル = `draft-pr`**。ただし draft-pr は「gh が無いので本文の下書きまで。作成は学習者が行う」方針。本スキルは方針が異なり **gh で実起票する**点が新しい。
- このリポは **Claude Code 専一**（`AGENTS.md` は導入しない）。
- 起票手順の正典: [`Docs/guide/issue-registration.md`](../Docs/guide/issue-registration.md)（必読。ラベルマッピング §mapping、gh 起票例 §howto あり）。

---

## 4. スキル仕様

### 4.1 名前・配置・frontmatter

- 配置: `.claude/skills/register-issue/SKILL.md`（名前案 `register-issue`。実装者が `create-issue` 等に変えても可）
- frontmatter `name:` はディレクトリ名と一致させる。
- `description:` は日本語で、**起動トリガになる動詞**を含める:
  「issue を起票/登録/作成したいとき」「GitHub issue を作る」「課題 issue を立てる」等。
  （誤発火防止のため「issue の本文を読む」等の無関係動作は含めない）
- このリポの既存スキル（`draft-pr/SKILL.md` 等）の体裁・トーンに合わせる。日本語で記述。

### 4.2 対話フロー

1. **issue 種別を選択**（`AskUserQuestion`、3択）:
   - 必須課題（STEP）
   - 選択課題（エンハンス）
   - 汎用 Issue
2. 種別ごとに項目を聞き取る（下表）。テンプレート YAML の `body` 項目をそのまま質問項目にする。
3. 聞き取った内容で **Markdown 本文を組み立てる**（gh はフォーム YAML を使えないので、各フィールドを見出し付き Markdown に再構成する）。
4. **プレビューを提示し、起票してよいか確認**してから作成する（外向き・不可逆操作なので確認必須）。
5. `gh issue create` を実行し、**作成された issue の URL を出力**する。
6. メンターが追加ラベル（`level:*` / `type:*` / `sequential`）を後付けする運用を案内文として添える。

### 4.3 種別ごとの聞き取り項目と本文マッピング

#### 必須課題（STEP）— `required-task.yml` 準拠
| 項目 | 必須 | 形式 |
|------|------|------|
| 対応する要件ドキュメントへのリンク | ○ | テキスト（例 `Docs/guide/curriculum.md#step-01`） |
| ゴール | ○ | 複数行 |
| 前提条件 | – | 複数行 |
| 完了条件（自己チェック項目。受入条件はドキュメント側が真実の源、再掲しない） | ○ | 複数行 |
| AI活用ヒント | – | 複数行 |
| 推定工数 | ○ | ドロップダウン: 半日 / 1日 / 2〜3日 / 1週間以上 |

- タイトル: `[STEP-XX] <概要>`（XX を聞き取る）
- ラベル: `--label required`

#### 選択課題（エンハンス）— `optional-task.yml` 準拠
| 項目 | 必須 | 形式 |
|------|------|------|
| ビジネス要求シートへのリンク | ○ | テキスト（例 `Docs/spec/enhancements/<short-desc>.md`） |
| ゴール | ○ | 複数行 |
| 前提条件 | – | 複数行 |
| 完了条件（同上・再掲しない） | ○ | 複数行 |
| AI活用ヒント | – | 複数行 |
| 推定工数 | ○ | ドロップダウン: 半日 / 1日 / 2〜3日 / 1週間以上 |
| 難易度 | – | ドロップダウン: Beginner / Intermediate / Advanced |

- タイトル: `[Enhance] <概要>`
- ラベル: `--label optional`
- 注意: `level:*` ラベルはメンターが後付け。スキルでは付けない（難易度の選択値は本文に残すだけ）。

#### 汎用 Issue
- リポジトリ既定テンプレートには無い形式。一般的な issue 様式で聞き取る:
  - タイトル
  - 概要 / 背景
  - 詳細（やること、または再現手順）
  - 期待する結果 / 完了の定義
  - 補足（任意）
- ラベル: 実装者が判断（後述の確認ポイント参照）。

### 4.4 gh 実行の作り込み（重要）

- **前提チェック**: 実行前に `gh` の有無と認証を確認。無ければインストール（`winget install --id GitHub.cli`）と `gh auth login` を案内して中断する。
- **本文は `--body-file` で渡す**。インライン `--body "..."` は PowerShell のクォート/改行で壊れやすい。
  本文を一時ファイル（scratchpad）に書き出し、`gh issue create --body-file <path>` を使う。
- コマンド例:
  ```bash
  gh issue create \
    --title "[Enhance] リソース一覧の検索・フィルタ追加" \
    --label "optional" \
    --body-file /path/to/body.md
  ```
- **テンプレート自動ラベルは gh では効かない**ので `--label` は必ず明示（`Docs/guide/issue-registration.md` §gh 注意書きと整合）。

### 4.5 質問様式の規律（`.claude/rules/aidlc-questions.md` 準拠）

- `AskUserQuestion` を使う。1回最大4問。選択肢が3つ超に分岐するなら質問を分割。
- 選択肢は意味のあるものだけ・相互排他。曖昧回答は追加質問で解消。

---

## 5. Gotchas（スキルの「Gotchas」節に必ず書く）

- gh 起票はテンプレートのフォーム/自動ラベルをバイパスする → `--label` 明示が必須。
- ラベル実体がリポジトリに無いと付与がサイレントに無視される（label-sync 前提。`Docs/guide/issue-registration.md` §label-sync）。
- PowerShell のクォート問題 → 本文は `--body-file` で渡す。
- `config.yml` は Web UI の自由記述を禁止しているが、**gh 起票はこれをバイパスできる**。
  「汎用 Issue」を gh で作るとリポの「自由記述禁止」方針と緊張関係になる点を明記する。
- 完了条件・受入条件は **ドキュメント側が真実の源**。issue 本文に詳細を再掲しない（二重管理防止。テンプレートの注記と整合）。

---

## 6. 実装者が判断/確認する点（ユーザー確認が要りうる）

1. **汎用 Issue のラベル**: 無ラベルで作るか、起票時に既存ラベルから選ばせるか。
   リポは自由記述を嫌う運用なので「ラベル必須化（最低1つ選択）」を推奨だが、ユーザーに確認してよい。
2. **skill-creator の Definition of Done（実際に動かす検証）**: 実起票は本物の issue を作ってしまう。
   検証は (a) 本文ファイル生成＋ gh コマンド組み立てまでを確認、または (b) テスト issue を作成して直後に `gh issue close`/削除、のいずれかにする。実装者が安全な方を選ぶ。
3. スキル名（`register-issue` / `create-issue` / `issue` 等）。

---

## 7. 参照ファイル一覧（別セッションが最初に読むべきもの）

- `.github/ISSUE_TEMPLATE/required-task.yml`
- `.github/ISSUE_TEMPLATE/optional-task.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/labels.yml`
- `Docs/guide/issue-registration.md`（起票手順・ラベルマッピングの正典）
- `.claude/skills/draft-pr/SKILL.md`（最も近い既存スキル。体裁の参考）
- `.claude/rules/aidlc-questions.md` / `.claude/rules/aidlc-guardrails.md`（質問・出力の規律）
