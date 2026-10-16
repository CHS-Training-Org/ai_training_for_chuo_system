# Application Design（統合版）

## 概要
リソース一覧に `keyword` 検索を追加する。BE は JPA `Specification` で category・isActive・keyword を動的に合成し、派生クエリ 8 本を削除して一本化する。FE は既存ファイルの拡張のみ。

## 設計判断
| 項目 | 決定 | 理由 |
|---|---|---|
| 実装方式 | `Specification` | 後続課題で条件が増えても組合せ爆発しない |
| 置き場所 | domain 層の `ResourceSpecifications` | Repository と同じ層で、Spring Data への依存は既存 |
| 既存派生クエリ | 削除して一本化 | 二重経路を避ける。`ResourceServiceTest` のモックは更新する |
| keyword 検証 | Controller（空白除去、100 文字）＋ Specification（エスケープ） | 既存の `from`/`to` 検証と同じ流儀 |
| from/to 経路 | 候補を `findAll(spec)` で取得し、Java 判定と手動ページングは現状維持 | 変更を最小に保つ |
| FE | 既存ファイルの拡張のみ | 再利用の必要が出た時点で切り出す |

## 構成
詳細は components.md、component-methods.md、services.md、component-dependency.md を参照。

## リスクと確認事項（Code Generation で検証する）
- 説明文は `TEXT` 型（nullable）。`lower(description) LIKE` が PostgreSQL と H2 の両方で動くか、テストで確認する。
- 派生クエリを削除するため、`ResourceServiceTest` と `ResourceControllerTest` のモック・呼び出しを新シグネチャに合わせる必要がある。
- ADMIN と非 ADMIN の isActive 条件が従来と同一であること（回帰テストで確認）。
