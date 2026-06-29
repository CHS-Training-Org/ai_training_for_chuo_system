---
name: create-issue
description: BookFlow の GitHub Issue を対話形式で聞き取り、テンプレート様式の本文を組み立てて gh CLI で実際に起票する。「issue を起票/登録/作成したい」「課題 issue を立てたい」「STEP の issue を作って」「エンハンス課題を起票して」「GitHub に issue を作る」と言われたとき、または必須課題（STEP）・選択課題（エンハンス）・汎用 Issue を立てたいときに使う。本文の下書きだけで終わらせず、確認のうえ `gh issue create` まで実行して issue URL を返すのが責務。issue の本文を読む・検索する等の無関係動作では使わない。
---

# create-issue — GitHub Issue を聞き取って実起票する

ユーザーからインタビュー形式で内容を聞き取り、Issue テンプレートの様式に沿った Markdown 本文を組み立て、**`gh` CLI で `CHS-Training-Org/ai_training_for_chuo_system` に実際に Issue を起票する**スキル。本文の下書きで終わらせず、プレビュー確認を経て起票まで行い、作成された Issue の URL を返す。

対応する起票種別は 3 つ:

- **必須課題（STEP）** — `.github/ISSUE_TEMPLATE/required-task.yml` 準拠
- **選択課題（エンハンス）** — `.github/ISSUE_TEMPLATE/optional-task.yml` 準拠
- **汎用 Issue** — リポジトリ既定テンプレートには無い一般様式

> **やること**：聞き取り → 本文組み立て → プレビュー確認 → `gh issue create` 実行 → URL 提示。
> **下書きだけが欲しい場合**は draft-pr ではなく、このスキルの「§5 起票前の確認」までで止めればよい（起票してよいか確認するゲートがある）。

---

## 1. 前提チェック（最初に必ず実行）

起票は外向き・不可逆操作なので、`gh` が使えることを最初に確かめる。

```bash
gh auth status
```

- `gh` コマンドが見つからない → インストールを案内して中断する（Windows なので `winget install --id GitHub.cli`）。インストール後にシェルの再起動が必要な点も伝える。
- `gh` はあるが未認証 → `gh auth login` を案内して中断する。
- 認証済み → 続行する。

`gh` が使えないまま聞き取りだけ進めても起票できないので、**聞き取りより前にこのチェックを行う**。

---

## 2. 対話フロー

1. **種別を選択**してもらう（§3）。
2. 種別ごとの項目を聞き取る（§4）。テンプレート YAML の `body` 項目をそのまま質問にする。
3. 聞き取った内容で **Markdown 本文を組み立てる**（§4 のマッピング）。
4. 本文・タイトル・付与ラベルの **プレビューを提示し、起票してよいか確認**する（§5）。
5. 確認が取れたら `gh issue create` を実行する（§6）。
6. 作成された **Issue の URL を提示**し、メンターによる追加ラベル付与の運用を案内する（§7）。

---

## 3. 種別の選択

`AskUserQuestion` で 3 択を提示する（`.claude/rules/aidlc-questions.md` の様式に従う）:

- **必須課題（STEP）** — STEP-01〜05 等の必須課題
- **選択課題（エンハンス）** — Beginner / Intermediate / Advanced のエンハンス課題
- **汎用 Issue** — 上記テンプレートに当てはまらない一般的な Issue

---

## 4. 種別ごとの聞き取り項目と本文マッピング

各項目を聞き取り、**見出し付き Markdown** に再構成する。`gh` はフォーム YAML を使えないため、テンプレートの各フィールドを `### <ラベル>` の見出しブロックとして本文に並べる。

未入力の任意項目は本文に含めない（空見出しを残さない）。受入条件・完了条件の詳細は **ドキュメント側が真実の源**なので、本文に再掲しない（§8 Gotchas）。

### 4.1 必須課題（STEP）

| 項目 | 必須 | 形式 |
|------|------|------|
| 対応する要件ドキュメントへのリンク | ○ | テキスト（例 `Docs/guide/curriculum.md#step-01`） |
| ゴール | ○ | 複数行 |
| 前提条件 | – | 複数行 |
| 完了条件（レビュー依頼前の自己チェック。詳細な受入条件は再掲しない） | ○ | 複数行 |
| AI活用ヒント | – | 複数行 |
| 推定工数 | ○ | 半日 / 1日 / 2〜3日 / 1週間以上 |

- STEP 番号も聞き取り、タイトルを `[STEP-XX] <概要>` にする。
- ラベル: `--label "required"`

### 4.2 選択課題（エンハンス）

| 項目 | 必須 | 形式 |
|------|------|------|
| ビジネス要求シートへのリンク | ○ | テキスト（例 `Docs/spec/enhancements/<short-desc>.md`） |
| ゴール | ○ | 複数行 |
| 前提条件 | – | 複数行 |
| 完了条件（同上・再掲しない） | ○ | 複数行 |
| AI活用ヒント | – | 複数行 |
| 推定工数 | ○ | 半日 / 1日 / 2〜3日 / 1週間以上 |
| 難易度 | – | Beginner / Intermediate / Advanced |

- タイトル: `[Enhance] <概要>`
- ラベル: `--label "optional"`
- **難易度を聞いても `level:*` ラベルは付けない**。`level:beginner` 等はメンターが起票後に手動付与する運用なので、選択値は本文に残すだけにする（§8 Gotchas）。

### 4.3 汎用 Issue

リポジトリ既定テンプレートには無い形式。一般様式で聞き取る:

- タイトル
- 概要 / 背景
- 詳細（やること、または再現手順）
- 期待する結果 / 完了の定義
- 補足（任意）

- **ラベルは必須**（最低 1 つ）。`.github/labels.yml` の既存ラベルを提示し、`AskUserQuestion`（複数選択可）で選ばせる。このリポは自由記述 Issue を嫌う運用（`config.yml` で Web UI の blank issue を禁止）なので、gh 起票でも無ラベルにせず性質を表すラベルを付ける。
  - 既存ラベル: `required` / `optional` / `sequential` / `level:beginner|intermediate|advanced` / `type:frontend|backend|fullstack` / `in-progress`
  - 選んだものを `--label "<name>"` で 1 つずつ渡す。

---

## 5. 起票前の確認（必須ゲート）

起票は外向き・不可逆なので、実行前に必ず止める。以下をまとめて提示し、起票してよいか確認する:

- **タイトル**
- **付与する `--label`**（複数あれば全部）
- **本文の全文**（組み立てた Markdown）

ユーザーが承認したら起票に進む。修正要望があれば本文を直して再提示する。

---

## 6. gh で起票する

本文は **`--body-file` で渡す**。インライン `--body "..."` は PowerShell のクォート・改行で壊れやすい。本文を scratchpad に一時ファイルとして書き出し、それを渡す。

PowerShell が主シェルなので、コマンドは1行（または PowerShell のバックティック継続）で組み立てる。bash のバックスラッシュ継続は使わない。

```
gh issue create --title "[Enhance] リソース一覧の検索・フィルタ追加" --label "optional" --body-file <scratchpad>/issue-body.md
```

- ラベルが複数のときは `--label "a" --label "b"` のように繰り返す。
- **テンプレートの自動ラベル付与は gh では効かない**ため、`required` / `optional` も含めて `--label` を必ず明示する（`Docs/guide/issue-registration.md` §howto の注意書きと整合）。
- 成功すると gh が Issue の URL を標準出力に返す。
- **未登録ラベルでの失敗に備える**：`--label` のラベル実体がリポジトリに無いと gh は `could not add label: 'X' not found` 等で**エラーになり issue は作られない**（§8）。このエラーが出たら、勝手にラベルを外して再起票せず、label-sync 未実行の可能性をユーザーに伝えて対処を促す（`Docs/guide/issue-registration.md` §label-sync）。心配な場合は起票前に `gh label list` で実体を確認してもよい。

---

## 7. 起票後の案内

- 作成された **Issue の URL** を提示する。
- メンターが運用する追加ラベル（`sequential` / `level:*` / `type:*`）は**このスキルでは付けない**。起票後にメンターが [§ラベルマッピング規則](../../../Docs/guide/issue-registration.md#mapping) に従って手動付与する旨を一言添える。

---

## 8. Gotchas

- **gh 起票はテンプレートのフォーム・自動ラベルをバイパスする** → `required` / `optional` も `--label` で明示しないと付かない。
- **ラベル実体が無いときの挙動は経路で異なる**：
  - Web テンプレートの自動付与は、ラベル実体が無いと**サイレントに無視**される（label-sync 前提。`Docs/guide/issue-registration.md` §label-sync）。
  - **gh の `--label` はサイレントに無視されず、ハードエラーになる**（`could not add label: 'X' not found` 等）。gh はラベル名を API で解決してから起票するため、未登録ラベルを指定すると **issue 自体が作られず失敗する**。`required` / `optional` を含め、起票前にラベル実体が存在することが前提（§6 で対処）。
- **PowerShell のクォート問題** → 本文は必ず `--body-file` で渡す。インライン `--body` は使わない。
- **汎用 Issue と「自由記述禁止」方針の緊張関係**：`config.yml` は `blank_issues_enabled: false` で Web UI の自由記述を禁止しているが、**gh 起票はこれをバイパスできる**。汎用 Issue を作る際はこの点を意識し、ラベル付与（§4.3）で性質を明示して運用方針と齟齬が出ないようにする。
- **完了条件・受入条件はドキュメント側が真実の源**。Issue 本文に詳細を再掲しない（二重管理防止。テンプレートの注記と整合）。
- **メンター運用ラベルを勝手に付けない**：`sequential` / `level:*` / `type:*` / `in-progress` はメンターが付与する。難易度を聞いても `level:*` は付けない。

---

## 9. 質問様式

聞き取りは2系統を使い分ける:

- **離散的な選択（選択肢が決まっているもの）は `AskUserQuestion`**：種別選択（§3）、推定工数（半日/1日/2〜3日/1週間以上）、難易度（Beginner/Intermediate/Advanced）、汎用 Issue のラベル選択（§4.3）など。`.claude/rules/aidlc-questions.md` 準拠で1回最大4問・相互排他・意味のある選択肢のみ。選択肢が3つ超に分岐するなら質問を分割する。
- **自由記述の項目は会話で聞き取る**：ゴール・前提条件・完了条件・各種リンク・概要・詳細などは決まった選択肢が無いので、`AskUserQuestion` に無理に押し込まず、通常の会話でテキストとして尋ねる。

曖昧な回答や矛盾は、進める前に追加質問で解消する。
