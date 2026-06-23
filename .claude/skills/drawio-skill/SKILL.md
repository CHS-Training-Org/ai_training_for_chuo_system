---
name: drawio-skill
version: 1.14.0
description: draw.io 図（アーキテクチャ図・ER図・フローチャート・UML クラス図／シーケンス図・ネットワーク構成図・ML/DL モデル図・マインドマップなど）を生成・編集したいとき使う。「図を描いて」「drawio で図解して」「ER図を作って」「アーキ図を書いて」「シーケンス図を作りたい」と言われたときや、3つ以上のコンポーネントが絡むシステムを視覚的に説明するときに積極的に使う。カスタムスタイル・豊富なシェイプ・スイムレーン・エクスポート（PNG/SVG/PDF）が必要な場合に最適。.drawio XML を生成し、VSCode の hediet.vscode-drawio 拡張でレンダリング・エクスポートする。
license: MIT
homepage: https://github.com/Agents365-ai/drawio-skill
upstream: https://github.com/Agents365-ai/drawio-skill/tree/v1.14.0/skills/drawio-skill (MIT, Copyright 2026 Agents365-ai)
compatibility: CLIは使用しない。VSCode 拡張 hediet.vscode-drawio（.devcontainer に登録済み）でレンダリング・エクスポートを行う。スクリプト（validate.py 等）はオプションで python3 が必要（devcontainer 未導入の場合は手動目視検証にフォールバック）。autolayout は Graphviz が必要なため未採用（大規模図は手動配置）。
platforms: [vscode-extension]
metadata: {"author":"Agents365-ai","bookflow-adaptation":"CLI廃止・VSCode拡張代用・python3任意","version":"1.14.0"}
---

# Draw.io 図の生成（BookFlow 版）

> **上流スキル**: [Agents365-ai/drawio-skill v1.14.0](https://github.com/Agents365-ai/drawio-skill/tree/v1.14.0/skills/drawio-skill)（MIT）
> **BookFlow 翻案**: CLI は使用しない。`.drawio` XML を生成し、VSCode の `hediet.vscode-drawio` 拡張でレンダリング・エクスポートする。

## 概要

`.drawio` XML ファイルを生成する。レンダリング・エクスポート（PNG/SVG/PDF）は利用者が VSCode の drawio 拡張で行う。

**サポートフォーマット（拡張経由）:** PNG, SVG, PDF, JPG  
**自動 vision 自己チェック**: 本バージョンでは行わない（cli エクスポートが不在のため）。`scripts/validate.py` による構造検証と、利用者の目視確認で代替する。

## 同梱リソース

以下はオンデマンドで参照する（事前にコンテキストへ読み込まない）。

| ファイル | 読むタイミング |
|---|---|
| `references/diagram-types.md` | ユーザーが特定の図の種類を指定したとき（ERD・UML クラス・シーケンス・アーキテクチャ・ML/DL・フローチャート） |
| `references/shapes.md` + `scripts/shapesearch.py` | 特定のシェイプ（AWS/Azure/GCP アイコン・Cisco/Kubernetes・UML/BPMN/ER 記号など）が必要なとき。`shapesearch.py "<keywords>"` で10,000+ シェイプの正式 style 文字列を取得できる |
| `scripts/aiicons.py` | AI/LLM ブランドロゴ（OpenAI・Claude・Gemini・Mistral など）が必要なとき。`aiicons.py "<brand>"` で draw.io の `image` スタイルを返す（lobe-icons CDN 参照；`--embed` でインライン化可） |
| `references/style-presets.md` | スタイルプリセットの学習・適用・管理が必要なとき |
| `references/style-extraction.md` | Learn フロー中に `.drawio`/画像からスタイルを抽出するとき |
| `references/troubleshooting.md` | XML が壊れている・レンダリングがおかしい・シェイプが表示されないとき |
| `scripts/encode_drawio_url.py` | オフラインや拡張が使えない環境でブラウザプレビュー URL を生成したいとき |
| `scripts/pyimports.py` · `jsimports.py` · `goimports.py` · `rustimports.py` | Python / JS・TS / Go / Rust プロジェクトの import グラフを抽出したいとき。出力は `graph.json`（中間フォーマット）。autolayout は未採用のため、グラフ JSON を元に Claude が手動で座標を配置するか、利用者が Graphviz を別途用意して `autolayout.py` を実行する |
| `scripts/pyclasses.py` | Python クラス階層図を描くとき（同上・autolayout 不使用の場合は手動配置） |
| `scripts/validate.py` | `.drawio` を生成したあと、構造リント（dangling エッジ・重複 ID・親参照破損・重なり）を実行したいとき |

## 前提

`hediet.vscode-drawio` 拡張は `.devcontainer/devcontainer.json` に登録済み（`customizations.vscode.extensions`）。devcontainer を起動すれば自動インストールされる。**draw.io デスクトップ CLI は使用しない。**

`scripts/validate.py` などの Python スクリプトは `python3` を要する。devcontainer（node:24-slim ベース）には python3 が標準で含まれていない可能性があるため、スクリプトは**任意の補助**として扱う。python3 が使えない場合は構造検証を省略し、利用者の目視確認に委ねる。

## ワークフロー

開始前に、ユーザーの要求で以下が不明な場合は 1〜3 問を確認する:
- **図の種類** — ERD / UML / シーケンス / アーキテクチャ / ML/DL / フローチャートのどれか？
- **コンポーネント数と技術** — 何が含まれるか？
- **出力先** — 指定がなければ作業ディレクトリ。

**Step 0 — アクティブプリセットの解決**

ユーザーのメッセージに「`<名前>` スタイルで」「`<名前>` スタイルを使って」など明確なプリセット名の言及があるか確認する。あれば → アクティブプリセット = `<名前>`。なければ `~/.drawio-skill/styles/` に `"default": true` のファイルがあるか確認。あればそれを使用。なければ組み込みカラー規約で進む。

プリセット JSON は `~/.drawio-skill/styles/<name>.json` → `<this-skill-dir>/styles/built-in/<name>.json` の順に探す（常に小文字化）。見つかれば返答の最初に `"Using preset <名前> (confidence: <レベル>)."` を明示。

**Step 1 — 計画**

シェイプ・関係性・レイアウト方向（LR または TB）・グループ化（レイヤー・ティア）を特定する。

**Step 2 — XML 生成**

`.drawio` XML ファイルをディスクに書き出す。  
- 小・中規模（〜15ノード）: 座標を手動で配置する。  
- 大規模（依存グラフ・コード構造・15ノード超）: autolayout は未採用。コード抽出器（`jsimports.py` 等）で `graph.json` を生成し、それをもとに座標を手動で計算するか、または利用者が Graphviz を別途用意して `autolayout.py graph.json -o <name>.drawio` を実行する。

生成後、python3 が使える場合は構造リントを実行する:
```bash
python3 <this-skill-dir>/scripts/validate.py <name>.drawio
```
これは drawio を起動せず XML を in-process で解析する（dangling エッジ・重複 ID・親参照破損・重なりを検出）。

**Step 3 — プレビュー確認（利用者操作）**

生成した `.drawio` ファイルを VSCode で開くと `hediet.vscode-drawio` 拡張が自動的にレンダリングする。利用者はそこでレイアウト・接続・ラベルを目視確認する。

即時確認したい場合は `scripts/encode_drawio_url.py` で diagrams.net URL を生成する:
```bash
python3 <this-skill-dir>/scripts/encode_drawio_url.py --edit <name>.drawio
```
生成された URL をブラウザで開くと即時プレビューと編集ができる（ファイルはサーバーにアップロードされない）。

**Step 4 — レビューループ**

利用者のフィードバックをもとに XML を編集し、再保存する。VSCode 上でリアルタイムに再レンダリングされる。

フィードバック種別ごとの最小 XML 変更:

| 要求 | XML 編集 |
|-----|---------|
| X の色を変える | `mxCell` の `style` 内 `fillColor`/`strokeColor` を更新 |
| ノードを追加 | 新しい `mxCell` vertex を次の id で追記 |
| ノードを削除 | 該当 `mxCell` と、それを参照するエッジを削除 |
| X を移動 | 該当 `mxCell` の `mxGeometry` の `x`/`y` を更新 |
| X をリサイズ | 該当 `mxCell` の `mxGeometry` の `width`/`height` を更新 |
| A→B の矢印を追加 | `source`/`target` を A と B の id にしたエッジを追記 |
| ラベルを変更 | 該当 `mxCell` の `value` 属性を更新 |
| レイアウト方向を変更 | XML を全面再生成 |

5 ラウンドを超えたら、利用者に `.drawio` ファイルを draw.io デスクトップ（またはブラウザ版 diagrams.net）で直接編集するよう提案する。

**Step 5 — 最終エクスポート（利用者操作）**

利用者が VSCode で `.drawio` を開き、File > Export as で PNG/SVG/PDF を書き出す。  
編集可能なファイルが必要な場合は `.drawio.png`（拡張が XML を埋め込む）または `.drawio.svg` として保存する。

ファイルパスを報告する（`.drawio` ソースと出力ファイル）。

## フォールバック

python3 が使えない場合: `validate.py` は省略し、XML 生成後に目視確認を促す。  
拡張が使えない場合: `encode_drawio_url.py` でブラウザ URL を生成する。  
どちらも使えない場合: `.drawio` XML のみを提示し、利用者に draw.io デスクトップまたは https://app.diagrams.net/ で開くよう案内する。

## スタイルプリセット

**スタイルプリセット**はユーザーの視覚設定（パレット・シェイプ・フォント・エッジ）を JSON で保存したもの。アクティブなプリセットは、このスキルの組み込みカラー/シェイプ規約を完全に置き換える。

ルックアップ順（SKILL.md Step 0 でプリセット名を解決する場合）:
1. `~/.drawio-skill/styles/<name>.json` — ユーザープリセット（git pull でも消えない）
2. `<this-skill-dir>/styles/built-in/<name>.json` — 同梱ビルトイン（`default`, `corporate`, `handdrawn`）

ユーザー提供の名前は常に小文字化してからファイル操作を行う（スキーマが小文字を強制）。

**その他（Learn フロー・管理操作・適用ルール・バリデーション）は `references/style-presets.md` を参照。**

## Draw.io XML 構造

### ファイルスケルトン

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="drawio" version="26.0.0">
  <diagram name="Page-1">
    <mxGraphModel>
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <!-- ユーザーシェイプは id="2" から始める -->
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

**ルール:**
- `id="0"` と `id="1"` は必須ルートセル — 省略不可
- ユーザーシェイプは `id="2"` から連番
- 全シェイプは `parent="1"`（コンテナ内の場合はコンテナの id）
- 全テキストはスタイルに `html=1` を含める
- XML コメント内で `--` は使用不可（XML 仕様違反）
- 属性値内の特殊文字はエスケープ: `&amp;`, `&lt;`, `&gt;`, `&quot;`
- ラベル内の改行は `&#xa;` を使用（リテラルの `\n` は不可）

### シェイプ種別（vertex）

| Style キーワード | 用途 |
|--------------|-----|
| `rounded=0` | 通常の矩形（デフォルト） |
| `rounded=1` | 角丸矩形 — サービス・モジュール |
| `ellipse;` | 円・楕円 — 開始/終了ノード・データベース |
| `rhombus;` | ひし形 — 判断・分岐 |
| `shape=mxgraph.aws4.resourceIcon;` | AWS アイコン |
| `shape=cylinder3;` | シリンダー — データベース |
| `swimlane;` | タイトルバー付きグループ/コンテナ |

ベンダーブランドアイコン（AWS/Azure/GCP/Cisco/Kubernetes）や非定型シェイプは `shape=mxgraph.*` 名を推測しない — 誤った名前は空白ボックスになる。`python3 <this-skill-dir>/scripts/shapesearch.py "<keywords>"` で正式な style と size を取得するか、`references/shapes.md` のチートシートを参照する。**AI/LLM ブランドロゴ**（OpenAI・Claude・Gemini など）は draw.io に含まれていないため `python3 <this-skill-dir>/scripts/aiicons.py "<brand>"` を使う。

### 必須プロパティ

```xml
<!-- 矩形/角丸ボックス -->
<mxCell id="2" value="Label" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="160" height="60" as="geometry" />
</mxCell>

<!-- シリンダー（データベース） -->
<mxCell id="3" value="DB" style="shape=cylinder3;whiteSpace=wrap;html=1;fillColor=#f5f5f5;strokeColor=#666666;fontColor=#333333;" vertex="1" parent="1">
  <mxGeometry x="350" y="100" width="120" height="80" as="geometry" />
</mxCell>

<!-- ひし形（判断） -->
<mxCell id="4" value="Check?" style="rhombus;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1">
  <mxGeometry x="100" y="220" width="160" height="80" as="geometry" />
</mxCell>
```

### コンテナとグループ

アーキテクチャ図などのネスト構造には draw.io の親子コンテナを使う — 大きなシェイプの上に別のシェイプを重ねるだけでは不可。

| 種類 | Style | 用途 |
|------|-------|------|
| **グループ**（非表示） | `group;pointerEvents=0;` | 視覚的な境界不要、コンテナ自身に接続しない場合 |
| **スイムレーン**（タイトル付き） | `swimlane;startSize=30;` | タイトルバーが必要、またはコンテナ自身に接続がある場合 |
| **カスタムコンテナ** | 任意シェイプに `container=1;pointerEvents=0;` を追加 | 自身に接続を持たないコンテナ |

**キールール:**
- 子ノード間の接続を拾わないコンテナスタイルには `pointerEvents=0;` を追加
- 子ノードは `parent="containerId"` を設定し、座標はコンテナ**相対**で指定

```xml
<!-- スイムレーンコンテナ -->
<mxCell id="svc1" value="User Service" style="swimlane;startSize=30;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">
  <mxGeometry x="100" y="100" width="300" height="200" as="geometry"/>
</mxCell>
<!-- コンテナ内の子 — 座標は親相対 -->
<mxCell id="api1" value="REST API" style="rounded=1;whiteSpace=wrap;html=1;" vertex="1" parent="svc1">
  <mxGeometry x="20" y="40" width="120" height="60" as="geometry"/>
</mxCell>
```

### コネクタ（エッジ）

**重要:** 全エッジ `mxCell` は必ず `<mxGeometry relative="1" as="geometry" />` 子要素を含む。セルフクロージング（`<mxCell ... edge="1" />`）は無効でレンダリングされない。

```xml
<!-- 有向矢印 -->
<mxCell id="10" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="2" target="3">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

<!-- ラベル付き矢印 + 明示的な entry/exit ポイント -->
<mxCell id="11" value="HTTP/REST" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;exitX=0.5;exitY=1;exitDx=0;exitDy=0;entryX=0.5;entryY=0;entryDx=0;entryDy=0;" edge="1" parent="1" source="2" target="4">
  <mxGeometry relative="1" as="geometry" />
</mxCell>

<!-- ウェイポイント付き矢印 -->
<mxCell id="12" value="" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;" edge="1" parent="1" source="3" target="5">
  <mxGeometry relative="1" as="geometry">
    <Array as="points">
      <mxPoint x="500" y="50" />
    </Array>
  </mxGeometry>
</mxCell>
```

**エッジスタイルのルール:**
- アニメーション矢印: スタイルに `flowAnimation=1;` を追加でデータフロー表現可能
- 常に `rounded=1;orthogonalLoop=1;jettySize=auto` を含める（スマートルーティングを有効化）
- 1つのノードに2本以上接続する場合は `exitX/exitY/entryX/entryY` でポイントを分散
- エッジが中間シェイプを回避する必要があるときは `<Array as="points">` でウェイポイントを追加
- 矢印ヘッドのための余地: 最後の折れ曲がりとターゲットシェイプの間は ≥20px 確保

### シェイプ上の接続分散

同一シェイプに複数エッジが接続する場合は、エントリ/エグジットポイントを分散して重なりを防ぐ:

| 位置 | exitX/entryX | exitY/entryY |
|------|-------------|-------------|
| 上中央 | 0.5 | 0 |
| 右中央 | 1 | 0.5 |
| 下中央 | 0.5 | 1 |
| 左中央 | 0 | 0.5 |

N 本が同じ辺に接続する場合: `exitX = 0.25, 0.5, 0.75`... と均等に分散

### カラーパレット（fillColor / strokeColor）

*プリセットがアクティブでない場合のみ使用。*

| 色名 | fillColor | strokeColor | 用途 |
|-----|-----------|-------------|-----|
| Blue | `#dae8fc` | `#6c8ebf` | サービス・クライアント |
| Green | `#d5e8d4` | `#82b366` | 成功・データベース |
| Yellow | `#fff2cc` | `#d6b656` | キュー・判断 |
| Orange | `#ffe6cc` | `#d79b00` | ゲートウェイ・API |
| Red/Pink | `#f8cecc` | `#b85450` | エラー・アラート |
| Grey | `#f5f5f5` | `#666666` | 外部・中立 |
| Purple | `#e1d5e7` | `#9673a6` | セキュリティ・認証 |

### レイアウトのヒント

**間隔 — 複雑さに応じてスケール:**

| 複雑さ | ノード数 | 水平間隔 | 垂直間隔 |
|--------|--------|---------|---------|
| 単純 | ≤5 | 200px | 150px |
| 中程度 | 6–10 | 280px | 200px |
| 複雑 | >10 | 350px | 250px |

**ルーティング廊下:** 行/列の間に ~80px の空きを残してエッジの経路を確保。  
**グリッド整列:** `x`/`y`/`width`/`height` は 10 の倍数にスナップ。  
**一般ルール:**
- 座標割り当て前にグリッドを脳内スケッチ
- 関連ノードを同じ水平・垂直バンドに配置
- 接続が集中するノード（ハブ）は中央に配置
- Kafka/バスなどのイベントバスは列の中央に配置（サービスから左右等距離）

## エクスポート（VSCode 拡張経由）

`.drawio` ファイルを VSCode で開き `hediet.vscode-drawio` 拡張を使ってエクスポートする:

1. **VSCode でファイルを開く** → 拡張が自動的にレンダリング
2. **エクスポート**: パレット（Ctrl+Shift+P）→「Draw.io: Export...」、または右クリックメニューから選択
3. 形式を選ぶ（PNG / SVG / PDF / JPG）
4. 編集可能な成果物が必要な場合は `.drawio.png` / `.drawio.svg`（XML を埋め込んだ二重拡張子）で保存

**ブラウザフォールバック（拡張が使えない場合）:**
```bash
python3 <this-skill-dir>/scripts/encode_drawio_url.py input.drawio        # 閲覧専用
python3 <this-skill-dir>/scripts/encode_drawio_url.py --edit input.drawio # 編集可能エディタ
```
生成 URL はブラウザで開く。ファイルはサーバーにアップロードされない。

## よくあるミス

何かおかしい（レンダリング・レイアウト・エッジのルーティング）ときは `references/troubleshooting.md` を参照。

## 図の種類プリセット

ユーザーが特定の図の種類を指定したとき、`references/diagram-types.md` の該当プリセットを読む:

| ユーザーの言葉 | `references/diagram-types.md` のセクション |
|---|---|
| 「ER図」「スキーマ図」「データモデル」 | ERD |
| 「UMLクラス図」「クラス図」 | UML Class |
| 「シーケンス図」「インタラクション図」 | Sequence |
| 「アーキテクチャ」「システム図」「サービス図」 | Architecture |
| 「ニューラルネット」「ML図」「ディープラーニング」 | ML / Deep Learning Model |
| 「フローチャート」「決定木」「プロセスフロー」 | Flowchart |
