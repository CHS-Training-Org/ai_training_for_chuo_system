# Business Overview

> 分析範囲: 課題「リソース一覧の検索・フィルタ追加」に関係するリソース一覧機能に絞った Reverse Engineering（BookFlow 全体の網羅は行わない）。

## Business Description
- **Business Description**: BookFlow は社内の施設・備品（会議室・備品・社用車）を予約する Web システム。ロールは MEMBER / APPROVER / ADMIN。
- **Business Transactions（本課題に関係するもの）**:
  - UC-02 リソース一覧・空き確認: 全ロールがリソースをカテゴリ・空き日時で絞り込んで閲覧する（ADMIN は無効リソースも見える）。
  - リソース詳細、予約作成、リソース管理（ADMIN）は本課題の対象外。
- **Business Dictionary**:
  - リソース: 予約対象の施設・備品（`resources` テーブル）。
  - 空き確認: `from`/`to` 指定時に PENDING/APPROVED の予約と重複するリソースを除外する絞り込み。

## Component Level Business Descriptions
### frontend `/resources`（リソース一覧画面）
- **Purpose**: リソースをカード一覧で表示し、絞り込みフォームを提供する。
- **Responsibilities**: searchParams の受け取り、`listResourcesAction` の呼び出し、ページネーション表示。

### backend ResourceController / ResourceService
- **Purpose**: `GET /api/resources` でロール別・条件別のリソース一覧を返す。
