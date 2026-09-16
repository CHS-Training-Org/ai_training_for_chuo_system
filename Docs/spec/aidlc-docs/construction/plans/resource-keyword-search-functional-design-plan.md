# Functional Design Plan — `resource-keyword-search`

ユニット：`resource-keyword-search`（単一の縦切りユニット）
入力：
- `Docs/spec/aidlc-docs/inception/requirements/requirements.md`（FR-01〜FR-15、NFR-01〜NFR-07）
- `Docs/spec/aidlc-docs/inception/user-stories/stories.md`（ST-01〜ST-11、受入基準29項目）
- `Docs/spec/aidlc-docs/inception/plans/execution-plan.md`

> Units Generation をスキップしたため、`unit-of-work.md` と `unit-of-work-story-map.md` は存在しない。ユニットの定義と担当ストーリーは実行計画とストーリー文書から直接読み取る。
> 確認質問は `.claude/rules/aidlc-questions.md` に従い `AskUserQuestion` で行う。回答は下記「決定事項」に記録する。

## ユニットの責務と境界

- **責務**：リソース一覧の絞り込み条件にキーワードを加える。照合対象は `Resource.name` と `Resource.description`。
- **担当ストーリー**：ST-01〜ST-11（全件）
- **境界の内側**：`ResourceController`・`ResourceService`・`ResourceRepository`・新設する述語組み立てユーティリティ、フロントエンドのリソース一覧画面まわり。
- **境界の外側**：予約・承認ドメイン、リソース管理画面（`ResourceManagementClient.tsx`）、DB スキーマ。

---

## 確認が必要な事項

### Q1. 複数語を入力したときの扱い

利用者が「会議 プロジェクター」のように空白で区切って入力した場合の解釈を決める必要がある。要求シートは「部分一致」としか書いておらず、ここは確定していない。

- **A. 単一のリテラルとして扱う**：入力全体を1つの文字列として部分一致させる。「会議 プロジェクター」という連続した文字列を含むリソースのみ一致する。
- **B. 空白区切りで AND 分解する**：語ごとに分解し、すべての語が名称または説明文のいずれかに含まれるリソースに一致する。

### Q2. キーワードの前後の空白と最大長

- 前後の空白を取り除いてから照合するか。
- 最大長の制限を設けるか。既存の DTO は `name` に `@Size(max = 100)` を課している。

---

## 決定事項（`AskUserQuestion` の回答）

| 項目 | 決定 |
|---|---|
| Q1 複数語の扱い | 単一リテラル（入力全体を1つの文字列として部分一致させる） |
| Q2 前後の空白と最大長 | 前後の空白を除去（trim）してから照合。除去後が空なら未指定扱い。最大長は 100 文字とし、超過時は `400 Bad Request`（`VALIDATION_ERROR`） |

> Q2 は最初の提示で選択肢のラベル（「上限10文字」）と説明文（「100 文字」）が食い違っていたため、追加の確認質問で 100 文字に確定した。100 文字は検索対象である `resources.name` の列長（varchar 100）および既存 DTO の `@Size(max = 100)` と規則が揃う。

---

## 実行チェックリスト

### 1. ドメインモデルの確認

- [x] 1.1 `Resource` エンティティの検索対象フィールド（`name`・`description`）の型と null 可否を確認する
- [x] 1.2 既存の絞り込み条件（`isActive`・`category`・期間）との関係を整理する
- [x] 1.3 `Docs/spec/aidlc-docs/construction/resource-keyword-search/functional-design/domain-entities.md` を生成する

### 2. 業務ロジックモデルの設計

- [x] 2.1 キーワード正規化の手順（null・空文字・空白のみ・前後の空白）を定める
- [x] 2.2 述語の合成方法（`isActive` / `category` / `keyword` の AND 結合）を定める
- [x] 2.3 `ResourceService.list` の2経路それぞれでの述語の適用点を特定する
- [x] 2.4 期間フィルタとの評価順序（述語で絞ってから占有判定するか、その逆か）を定める
- [x] 2.5 `Docs/spec/aidlc-docs/construction/resource-keyword-search/functional-design/business-logic-model.md` を生成する

### 3. 業務ルールの明文化

- [x] 3.1 照合規則（部分一致・大文字小文字非依存・OR 結合）をルールとして書き下す
- [x] 3.2 `description` が null の行を落とさない条件の組み立て方を定める
- [x] 3.3 LIKE のワイルドカード（`%`・`_`）とエスケープ文字の扱いを定める
- [x] 3.4 入力検証の失敗時の挙動（該当する場合）を定める
- [x] 3.5 各ルールを受入基準（AC-xx-x）に対応づける
- [x] 3.6 `Docs/spec/aidlc-docs/construction/resource-keyword-search/functional-design/business-rules.md` を生成する

### 4. フロントエンド構成の設計

- [x] 4.1 `ResourceFilterForm` のコンポーネント構造と props の変更点を定める
- [x] 4.2 URL searchParams との往復（送出・復元・リセット・ページ送り）の流れを定める
- [x] 4.3 Server Action・画面コンポーネントへの受け渡し経路を定める
- [x] 4.4 入力欄のラベル・配置・アクセシビリティ上の扱いを定める
- [x] 4.5 `Docs/spec/aidlc-docs/construction/resource-keyword-search/functional-design/frontend-components.md` を生成する

### 5. 整合性の確認

- [x] 5.1 設計が FR-01〜FR-15 をすべて満たすことを確認する
- [x] 5.2 設計が受入基準 AC-01-1〜AC-11-4 をすべて満たすことを確認する
- [x] 5.3 4レイヤーアーキテクチャの境界を越えていないことを確認する（NFR-05）

### 6. 状態更新

- [x] 6.1 本プランのチェックボックスをすべて `[x]` にする
- [x] 6.2 `Docs/spec/aidlc-state.md` の Functional Design を完了にする
- [x] 6.3 `Docs/spec/aidlc-audit.md` に記録する

## 生成必須の成果物

- [x] `functional-design/domain-entities.md`
- [x] `functional-design/business-logic-model.md`
- [x] `functional-design/business-rules.md`
- [x] `functional-design/frontend-components.md`（本ユニットは UI を含むため生成する）

## 本ステージで扱わないこと

- 具体的なコード（Code Generation で扱う）
- 変更対象ファイルの列挙と作業順序（Code Generation の Part 1 で扱う）
- インフラ・デプロイ構成（Infrastructure Design はスキップ）
