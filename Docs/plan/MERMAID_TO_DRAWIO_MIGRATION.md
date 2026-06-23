---
type: plan
title: mermaid 図 → drawio 全面移行計画
description: Docs/ 配下の全 mermaid 図（8 ファイル・16 図）を drawio-skill で描画した .drawio.svg に切り替える手順・規約・チェックリスト
tags: [plan, drawio, mermaid, migration, docs]
timestamp: 2026-06-21
audience: メンター・リポジトリ管理者・AI エージェント
references:
  - .claude/skills/drawio-skill/SKILL.md
  - .claude/skills/drawio-skill/references/diagram-types.md
  - zensical.toml
  - Docs/ARCHITECTURE.md
  - Docs/spec/er-diagram.md
  - Docs/spec/screen-spec.md
  - Docs/spec/requirements.md
  - Docs/spec/api-spec.md
  - Docs/guide/dev-workflow.md
  - Docs/guide/curriculum.md
  - Docs/guide/coding-conventions.md
---

# mermaid 図 → drawio 全面移行計画

---

## このドキュメントについて

BookFlow の設計ドキュメントは現在 mermaid 図で記述されており、Zensical サイトが
`pymdownx.superfences` custom_fences（`zensical.toml:163`）でネイティブ描画している。
本計画はこれらを `drawio-skill`（BookFlow 版 v1.14.0）による `.drawio.svg` に全面置換する
手順・規約・チェックリストを定める。

### drawio-skill の制約（事前把握必須）

| 制約 | 詳細 |
|------|------|
| mermaid 自動変換なし | drawio-skill は mermaid を読まない。Claude が各図を読み解いて `.drawio` XML を手書き生成する |
| 手動エクスポート工程あり | `.drawio` → `.drawio.svg` の変換は **VSCode 拡張 `hediet.vscode-drawio`** での手動操作（自動化不可） |
| Markdown 埋め込み規約なし | 本計画で初めて規約を新設する |
| フォールバック | VSCode 拡張が使えない場合は `scripts/encode_drawio_url.py` でブラウザ編集 |

---

## 対象範囲

- **対象**: `Docs/` 配下の全 Markdown ファイル（8 ファイル・16 図）
- **除外**: `vendor/aidlc-rules/` と `.aidlc-rule-details/`（上流逐語保存・テンプレート）
- **除外**: `common/content-validation.md` の mermaid プレースホルダ（型なし・内容なし）

---

## 対象図インベントリ（全16図）

実施時は各図ごとに ① → ④ の順で進め、完了後にチェックを入れる。

### Docs/ARCHITECTURE.md（2 図）

| # | mermaid 行 | 種類 | 図タイトル / 内容 | drawio 難度 | 出力ファイル名 |
|---|-----------|------|-----------------|------------|--------------|
| 1 | L20 | flowchart TD | **システム構成図** — AI/FE/AUTH/サーバーレス/BE/DB の 6 サブグラフ構成。絵文字ラベル含む | 中（サブグラフ多い） | `architecture-system.drawio.svg` |
| 2 | L143 | flowchart LR | **ローカル開発環境の構成概要** — Docker Compose（Next.js・Spring Boot・PostgreSQL・LocalStack）と cognito-local | 小（5ノード） | `architecture-local-dev.drawio.svg` |

進捗:

- [ ] 図1: ① `.drawio` XML 生成（Claude）
- [ ] 図1: ② `.drawio.svg` エクスポート（VSCode 拡張・手動）
- [ ] 図1: ③ `Docs/ARCHITECTURE.md` L20 の mermaid ブロックを `![システム構成図](diagrams/architecture/architecture-system.drawio.svg)` に置換（Claude）
- [ ] 図1: ④ サイトビルド＋ライト/ダーク両モードで目視確認

- [ ] 図2: ① `.drawio` XML 生成
- [ ] 図2: ② `.drawio.svg` エクスポート
- [ ] 図2: ③ L143 置換 → `![ローカル開発環境の構成概要](diagrams/architecture/architecture-local-dev.drawio.svg)`
- [ ] 図2: ④ 確認

---

### Docs/spec/er-diagram.md（1 図）

| # | mermaid 行 | 種類 | 図タイトル / 内容 | drawio 難度 | 出力ファイル名 |
|---|-----------|------|-----------------|------------|--------------|
| 3 | L19 | erDiagram | **ER 図** — departments / users / resources / reservations / approval_steps の 5 エンティティとリレーション | 中（5エンティティ・多対1含む） | `er-diagram.drawio.svg` |

drawio-skill プリセット: `ERD`（`references/diagram-types.md` 参照）。

進捗:

- [ ] 図3: ① `.drawio` XML 生成
- [ ] 図3: ② `.drawio.svg` エクスポート
- [ ] 図3: ③ L19 置換 → `![ER 図](../diagrams/spec/er-diagram.drawio.svg)`
- [ ] 図3: ④ 確認

---

### Docs/spec/screen-spec.md（1 図）

| # | mermaid 行 | 種類 | 図タイトル / 内容 | drawio 難度 | 出力ファイル名 |
|---|-----------|------|-----------------|------------|--------------|
| 4 | L37 | flowchart TD | **画面遷移図** — `/auth/signin` 起点・10 画面・ロール条件付きエッジ含む | 中（10ノード） | `screen-spec-navigation.drawio.svg` |

進捗:

- [ ] 図4: ① `.drawio` XML 生成
- [ ] 図4: ② `.drawio.svg` エクスポート
- [ ] 図4: ③ L37 置換 → `![画面遷移図](../diagrams/spec/screen-spec-navigation.drawio.svg)`
- [ ] 図4: ④ 確認

---

### Docs/spec/requirements.md（2 図）

| # | mermaid 行 | 種類 | 図タイトル / 内容 | drawio 難度 | 出力ファイル名 |
|---|-----------|------|-----------------|------------|--------------|
| 5 | L144 | stateDiagram-v2 | **予約ステータス遷移図** — PENDING / APPROVED / REJECTED / CANCELLED の 4 状態 | 小（4状態） | `requirements-reservation-status.drawio.svg` |
| 6 | L163 | stateDiagram-v2 | **承認ステップ ステータス遷移図** — PENDING / APPROVED / REJECTED の 3 状態 | 小（3状態） | `requirements-approval-step-status.drawio.svg` |

状態遷移図は drawio-skill で Flowchart プリセット（菱形ゲートノード）を流用する。

進捗:

- [x] 図5: ① `.drawio` XML 生成
- [x] 図5: ② `.drawio.svg` エクスポート
- [x] 図5: ③ L144 置換 → `![予約ステータス遷移図](../diagrams/spec/requirements-reservation-status.drawio.svg)`
- [ ] 図5: ④ 確認

- [ ] 図6: ① `.drawio` XML 生成
- [ ] 図6: ② `.drawio.svg` エクスポート
- [ ] 図6: ③ L163 置換 → `![承認ステップ ステータス遷移図](../diagrams/spec/requirements-approval-step-status.drawio.svg)`
- [ ] 図6: ④ 確認

---

### Docs/spec/api-spec.md（5 図）⚠️ 最高難度

> **注意**: シーケンス図 5 本が集中する最難ファイル。ライフライン・活性化バー・`par`/`opt`
> ブロック・メッセージ順序を座標で手動再現するため、他の図種より工数・検証コストが高い。
> 1 図ずつ確認してから次へ進むこと。

| # | mermaid 行 | 種類 | 図タイトル / 内容 | drawio 難度 | 出力ファイル名 |
|---|-----------|------|-----------------|------------|--------------|
| 7 | L252 | sequenceDiagram | **サインイン〜JWT 検証シーケンス図** — Browser / Next.js / Cognito / Spring の 4 参加者、セッション Cookie 取得〜API 呼び出し | **大** | `api-spec-signin-jwt.drawio.svg` |
| 8 | L480 | sequenceDiagram | **リソース一覧・空き確認シーケンス図** — Browser / Next.js / Spring / DB の 4 参加者、①カテゴリフィルター ②空き確認の 2 シナリオ | **大** | `api-spec-resource-availability.drawio.svg` |
| 9 | L711 | sequenceDiagram | **申請シーケンス図（2 パターン）** — ①即時確定（requires_approval=false）②承認待ち（requires_approval=true）。approval_steps INSERT 含む | **大** | `api-spec-reservation-apply.drawio.svg` |
| 10 | L886 | sequenceDiagram | **承認・却下シーケンス図** — ①承認パス（PENDING→APPROVED）②却下パス（PENDING→REJECTED）。重複予約再チェック含む | **大** | `api-spec-approval.drawio.svg` |
| 11 | L1001 | sequenceDiagram | **ダッシュボード情報取得シーケンス図** — Browser / Next.js / Spring の 3 参加者。`par` 並行取得・`opt` 条件ブロック含む | **大** | `api-spec-dashboard.drawio.svg` |

drawio-skill プリセット: `UML Sequence`（`references/diagram-types.md` 参照）。
`par`・`opt` は drawio の "Combined Fragment" ボックス（`swimlane` スタイル）で表現する。

進捗（図7〜11 各4ステップ）:

- [ ] 図7: ① XML 生成 / ② エクスポート / ③ L252 置換 → `![サインイン〜JWT 検証シーケンス図](../diagrams/spec/api-spec-signin-jwt.drawio.svg)` / ④ 確認
- [ ] 図8: ① / ② / ③ L480 置換 → `![リソース一覧・空き確認シーケンス図](../diagrams/spec/api-spec-resource-availability.drawio.svg)` / ④
- [ ] 図9: ① / ② / ③ L711 置換 → `![申請シーケンス図](../diagrams/spec/api-spec-reservation-apply.drawio.svg)` / ④
- [ ] 図10: ① / ② / ③ L886 置換 → `![承認・却下シーケンス図](../diagrams/spec/api-spec-approval.drawio.svg)` / ④
- [ ] 図11: ① / ② / ③ L1001 置換 → `![ダッシュボード情報取得シーケンス図](../diagrams/spec/api-spec-dashboard.drawio.svg)` / ④

---

### Docs/guide/dev-workflow.md（3 図）

| # | mermaid 行 | 種類 | 図タイトル / 内容 | drawio 難度 | 出力ファイル名 |
|---|-----------|------|-----------------|------------|--------------|
| 12 | L48 | flowchart TD | **INCEPTION フェーズフロー** — Workspace Detection（必須）→ RE（条件付き）→ RA → User Stories → Workflow Planning → … → 第1ゲート。緑/オレンジ/紫の 3 色コーディング有 | 中（7ノード） | `dev-workflow-inception.drawio.svg` |
| 13 | L86 | flowchart TD | **CONSTRUCTION フェーズフロー** — Functional Design → NFR → Code Generation → Build and Test → 第2ゲート。同 3 色コーディング | 中（7ノード） | `dev-workflow-construction.drawio.svg` |
| 14 | L128 | flowchart TD | **標準開発フロー** — Issue 選択→ブランチ作成→ INCEPTION（第1ゲート）→ Spec-first → CONSTRUCTION → Build and Test → PR → レビュー（第2ゲート）→ マージ | 中（10ノード） | `dev-workflow-standard.drawio.svg` |

進捗:

- [ ] 図12: ① / ② / ③ L48 置換 → `![INCEPTION フェーズ](../diagrams/guide/dev-workflow-inception.drawio.svg)` / ④
- [ ] 図13: ① / ② / ③ L86 置換 → `![CONSTRUCTION フェーズ](../diagrams/guide/dev-workflow-construction.drawio.svg)` / ④
- [ ] 図14: ① / ② / ③ L128 置換 → `![標準開発フロー](../diagrams/guide/dev-workflow-standard.drawio.svg)` / ④

---

### Docs/guide/curriculum.md（1 図）

| # | mermaid 行 | 種類 | 図タイトル / 内容 | drawio 難度 | 出力ファイル名 |
|---|-----------|------|-----------------|------------|--------------|
| 15 | L25 | flowchart TD | **学習パスマップ** — 新人パス（STEP-01〜05→選択課題）と中堅パスの 2 分岐 | 小（7ノード） | `curriculum-learning-path.drawio.svg` |

進捗:

- [ ] 図15: ① / ② / ③ L25 置換 → `![学習パスマップ](../diagrams/guide/curriculum-learning-path.drawio.svg)` / ④

---

### Docs/guide/coding-conventions.md（1 図）

| # | mermaid 行 | 種類 | 図タイトル / 内容 | drawio 難度 | 出力ファイル名 |
|---|-----------|------|-----------------|------------|--------------|
| 16 | L117 | flowchart LR | **4 層アーキテクチャ図** — presentation → application → domain、infrastructure が横断点線。4 ノード | 小（4ノード） | `coding-conventions-4-layer.drawio.svg` |

進捗:

- [x] 図16: ① `.drawio` XML 生成 / [x] ② `.drawio.svg` エクスポート / [x] ③ L117 置換 → `![4 層アーキテクチャ](../diagrams/guide/coding-conventions-4-layer.drawio.svg)` / [ ] ④

---

## 新設：drawio 図の配置・命名規約

### ディレクトリ構造（新設）

```
Docs/
  diagrams/
    architecture/      # Docs/ARCHITECTURE.md 用
    spec/              # Docs/spec/ 用
    guide/             # Docs/guide/ 用
```

`docs_dir = "Docs"`（`zensical.toml:22`）配下なので、`site/` ビルド時に静的ファイルとして配信される。

### ファイル命名規則

```
<元ファイル名（拡張子なし）>-<図の内容（ケバブケース）>.drawio.svg
```

例: `er-diagram.drawio.svg`、`api-spec-signin-jwt.drawio.svg`

### Markdown からの参照（相対パス）

| 元ファイル位置 | diagrams への相対パス |
|---------------|----------------------|
| `Docs/ARCHITECTURE.md` | `diagrams/architecture/<name>.drawio.svg` |
| `Docs/spec/*.md` | `../diagrams/spec/<name>.drawio.svg` |
| `Docs/guide/*.md` | `../diagrams/guide/<name>.drawio.svg` |

記法例:

```markdown
![ER 図](../diagrams/spec/er-diagram.drawio.svg)
```

サイズ指定が必要な場合は `attr_list` 拡張（`zensical.toml` 有効）を使用:

```markdown
![システム構成図](diagrams/architecture/architecture-system.drawio.svg){ width=800 }
```

---

## 配色・ダークモード対応（設計判断）

### 問題

現在の mermaid 図はサイトのライト/ダーク切替（`zensical.toml` の `default`/`slate` パレット）に
追従するが、静的 `.drawio.svg` は色が固定されるため自動追従しない。
放置するとダークモードで白背景が浮く・暗色の線や文字が見えなくなる。

### 採用方針: CSS で白カードを敷く

drawio 図は **白背景（`fillColor=#FFFFFF`）で統一**し、ダークモード時は CSS が白カードを
自動適用することで判読性を保つ。

**新規 CSS ファイル**: `Docs/stylesheets/drawio.css`（新設）

```css
/* drawio SVG — ダークモードで白背景カードを適用して判読性を確保 */
[data-md-color-scheme="slate"] img[src$=".drawio.svg"] {
  background-color: #ffffff;
  border-radius: 4px;
  padding: 8px;
}
```

**`zensical.toml` の `extra_css` への追記**（1 行追加）:

```toml
extra_css = ["stylesheets/design-showcase.css", "stylesheets/drawio.css"]
```

### drawio 図内の配色統一

全図共通で以下のスタイルを使用し、ばらつきを防ぐ:

| 要素 | 設定 |
|------|------|
| ページ背景 | 白（`fillColor=#FFFFFF`）または透過 |
| ノード塗り | 薄色（`#EFF6FF` 系・`#F0FDF4` 系 等） |
| ノード枠線 | `strokeColor=#334155`（dark slate） |
| テキスト | `fontColor=#1E293B`（十分なコントラスト） |
| エッジ | `strokeColor=#475569` |
| 必須/重要ノード | 緑系: `fillColor=#DCFCE7, strokeColor=#16A34A`（dev-workflow 等の強調維持） |
| 条件付きノード | オレンジ系: `fillColor=#FFF7ED, strokeColor=#EA580C` |
| ゲートノード | 紫系: `fillColor=#F3E8FF, strokeColor=#7C3AED` |

dev-workflow 図の 3 色コーディング（緑/オレンジ/紫）は意味を持つため維持する。

---

## 変換手順（工程と担当者）

```
Step 1: [Claude]  mermaid 図を読み、.drawio 平文 XML を手書き生成
                   - SKILL.md Step 1-2 に従う
                   - 図種別プリセット: .claude/skills/drawio-skill/references/diagram-types.md
                   - 配色は上記「drawio 図内の配色統一」に従う
                   - python3 があれば scripts/validate.py でリント

Step 2: [手動]    VSCode 拡張 hediet.vscode-drawio で各 .drawio を開く
                   File > Export As > SVG > "Include a copy of my diagram"（埋め込みオン）
                   Docs/diagrams/<area>/<name>.drawio.svg として保存
                   ※ この工程は自動化不可能（拡張の手動操作が必須）

Step 3: [Claude]  各 .md の ```mermaid ブロックを
                   ![タイトル](相対パス/<name>.drawio.svg) に置換
                   見出し・キャプション・注釈は維持する（図ブロックのみ置換）

Step 4: [確認]    サイトビルドで疎通確認・ライト/ダーク両モードで目視確認
```

---

## mermaid 設定の扱い

`zensical.toml:160-164` の custom_fences mermaid エントリは **変更しない**（将来用に温存）。

```toml
# 変更不要（このまま残す）
[project.markdown_extensions.pymdownx.superfences]
custom_fences = [
  { name = "mermaid", class = "mermaid", format = "pymdownx.superfences.fence_code_format" },
]
```

---

## 変更ファイル一覧

| ファイル | 種別 | 内容 |
|---------|------|------|
| `Docs/diagrams/architecture/architecture-system.drawio.svg` | 新規 | 図1 |
| `Docs/diagrams/architecture/architecture-local-dev.drawio.svg` | 新規 | 図2 |
| `Docs/diagrams/spec/er-diagram.drawio.svg` | 新規 | 図3 |
| `Docs/diagrams/spec/screen-spec-navigation.drawio.svg` | 新規 | 図4 |
| `Docs/diagrams/spec/requirements-reservation-status.drawio.svg` | 新規 | 図5 |
| `Docs/diagrams/spec/requirements-approval-step-status.drawio.svg` | 新規 | 図6 |
| `Docs/diagrams/spec/api-spec-signin-jwt.drawio.svg` | 新規 | 図7 |
| `Docs/diagrams/spec/api-spec-resource-availability.drawio.svg` | 新規 | 図8 |
| `Docs/diagrams/spec/api-spec-reservation-apply.drawio.svg` | 新規 | 図9 |
| `Docs/diagrams/spec/api-spec-approval.drawio.svg` | 新規 | 図10 |
| `Docs/diagrams/spec/api-spec-dashboard.drawio.svg` | 新規 | 図11 |
| `Docs/diagrams/guide/dev-workflow-inception.drawio.svg` | 新規 | 図12 |
| `Docs/diagrams/guide/dev-workflow-construction.drawio.svg` | 新規 | 図13 |
| `Docs/diagrams/guide/dev-workflow-standard.drawio.svg` | 新規 | 図14 |
| `Docs/diagrams/guide/curriculum-learning-path.drawio.svg` | 新規 | 図15 |
| `Docs/diagrams/guide/coding-conventions-4-layer.drawio.svg` | 新規 | 図16 |
| `Docs/ARCHITECTURE.md` | 変更 | mermaid ブロック ×2 を画像タグに置換 |
| `Docs/spec/er-diagram.md` | 変更 | mermaid ブロック ×1 を画像タグに置換 |
| `Docs/spec/screen-spec.md` | 変更 | mermaid ブロック ×1 を画像タグに置換 |
| `Docs/spec/requirements.md` | 変更 | mermaid ブロック ×2 を画像タグに置換 |
| `Docs/spec/api-spec.md` | 変更 | mermaid ブロック ×5 を画像タグに置換 |
| `Docs/guide/dev-workflow.md` | 変更 | mermaid ブロック ×3 を画像タグに置換 |
| `Docs/guide/curriculum.md` | 変更 | mermaid ブロック ×1 を画像タグに置換 |
| `Docs/guide/coding-conventions.md` | 変更 | mermaid ブロック ×1 を画像タグに置換 |
| `Docs/stylesheets/drawio.css` | 新規 | ダークモード対応 CSS |
| `zensical.toml` | 変更 | `extra_css` に `drawio.css` を追記 |
| `zensical.toml`（mermaid custom_fences） | **変更しない** | 将来用に温存 |

---

## 検証手順

全 16 図のチェックボックスが完了したら、以下を順に実施する。

```bash
# 1. mermaid ブロックの残存確認（対象 8 ファイル）
grep -rn '```mermaid' Docs/ARCHITECTURE.md Docs/spec/ Docs/guide/
# → 出力ゼロが合格

# 2. drawio.svg ファイルの存在確認（16 ファイル）
find Docs/diagrams -name "*.drawio.svg" | sort
# → 16 件が合格

# 3. サイトビルド
docker compose exec docs uv run zensical build
# → エラーなし・site/ 生成が合格

# 4. リンク切れ確認（ビルド後）
grep -r 'alt=' site/ | grep -v 'drawio.svg'
# 任意: 壊れた img src がないかブラウザ DevTools で確認
```

ブラウザでの目視確認（人手）:

- [ ] ライトモード（default）で全 16 図が正常表示される
- [ ] **ダークモード（slate）で全 16 図の文字・線が判読可能** — CSS による白カードが適用されていること
- [ ] 図のキャプション・前後の見出しが維持されている

---

## 補足: `zensical.toml` の nav への追記について

現在 `Docs/plan/` には `PHASE4_AI_DRIVEN_DEV_TASKS.md` のみが nav に登録されている。
本ファイル（`MERMAID_TO_DRAWIO_MIGRATION.md`）を nav に追加する場合は
`zensical.toml` の `計画 (Plan)` セクションに1行追記すること。

```toml
{ "計画 (Plan)" = [
    "plan/PHASE4_AI_DRIVEN_DEV_TASKS.md",
    "plan/MERMAID_TO_DRAWIO_MIGRATION.md",  # 追記
] },
```
