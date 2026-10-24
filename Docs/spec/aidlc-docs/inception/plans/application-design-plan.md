# Application Design Plan: CSV 帳票出力（Issue #29）

## 入力

- `Docs/spec/aidlc-docs/inception/requirements/requirements.md`（承認済み。「設計上の検討事項」9 項目）
- `Docs/spec/aidlc-docs/inception/user-stories/stories.md`（承認済み。US-1〜US-4、受入条件 18 件）
- `Docs/spec/aidlc-docs/inception/plans/execution-plan.md`（承認済み）
- `docs-next/docs/spec/requirements.md` §帳票出力 UC-09 と `screen-spec.md` §`/reservations`（Spec 更新 1 回目、確認済み）
- `docs-next/docs/develop/coding-conventions.md`（4 層の責務、Server Actions、データアクセス）

## 既存規約・既存実装・承認済み要件から決まる事項

確認質問は行わず、根拠とともに採用する。

| # | 検討事項 | 決定 | 根拠 |
|---|---------|------|------|
| D1 | ダウンロード経路 | Server Action で CSV を取得し、ブラウザ側で Blob にしてダウンロードさせる（Route Handler は使わない） | `coding-conventions.md`「`src/server/actions/`：バックエンド API 呼び出しはここに集約」「クライアントからバックエンド API を直接呼ばない。トークンはサーバーサイドに保持する」 |
| D2 | CSV 生成の置き場所 | application 層（帳票 Service と、そこから使う CSV 生成部品） | 4 層の責務表：presentation は「業務ロジックを置かない」、infrastructure も同様、domain は HTTP・DTO に依存しない。CSV の列・表記・並び順は RPT-02 の業務要件 |
| D3 | ADMIN 限定の方法 | Controller に `@PreAuthorize("hasRole('ADMIN')")` | requirements.md の NFR（セキュリティ）、`UserController` / `ResourceController` の前例 |
| D4 | パラメータ検証（片方だけの指定、`from` ≧ `to`） | Controller で `ValidationException` を投げ、既存の `GlobalExceptionHandler` で 400 `VALIDATION_ERROR` にする | `ResourceController#list` の `from` / `to` 同時指定チェックの前例 |
| D5 | 日時の入力欄 | `<Input type="datetime-local">` | `ResourceFilterForm` の `from` / `to` の前例。API は ISO 8601 のローカル日時（仮定 A2） |
| D6 | エラー時の画面表示 | `sonner` の `toast.error` で通知する | `ApprovalTable.tsx` の前例、`layout.tsx` に `Toaster` 配置済み |
| D7 | CSV インジェクション対策 | 採用しない（値を加工せずに出力する） | 要件にない。「要件の追加やスコープ拡大は行わない」の指示。Security Baseline は不適用 |

## 確認質問と回答

BookFlow の運用（`.claude/rules/aidlc-questions.md`）により `AskUserQuestion` で確認し、回答をこの節に転記する。

| # | 論点 | 回答 |
|---|------|------|
| Q1 | 予約データの取得方式 | Specification（`ReservationRepository` に `JpaSpecificationExecutor` を追加し、`ReservationSpecifications` を新設。PR #146 の `ResourceSpecifications` と同じ方式） |
| Q2 | CSV 応答の返し方と件数上限 | `ResponseEntity<byte[]>` で一括して返す。件数上限は設けない |
| Q3 | CSV の生成方法 | 手書き（依存を追加しない） |
| Q4 | 承認状態の日本語表示名の置き場所 | application 層の CSV 生成部品の中に対応表を持つ（domain は変えない） |
| Q5 | `/reservations` 上の入力 UI | ダイアログ。「CSV ダウンロード」ボタンでダイアログを開き、期間とステータス（複数選択）を入力してダウンロードする |
| Q6 | ファイル名 | `reservations_yyyyMMdd.csv`（出力した日のサーバーの日付） |
| Q7 | 改行コード | CRLF |

### 回答の分析

7 問とも単一の選択肢で回答され、曖昧な表現や回答間の矛盾はない。Q1（Specification）は規約の「派生クエリまたは JPQL」と異なるが、PR #146 で同じ方式を採った前例があり、選択の時点で食い違いを提示したうえでの回答である。

### 回答から導いた細部（既存の前例に合わせる）

| # | 細部 | 決定 | 根拠 |
|---|------|------|------|
| D8 | ダイアログの実装 | `Dialog` + `useState` + `useTransition`、失敗時は固定文言の `toast.error` | `ApprovalTable.tsx` の承認・却下ダイアログの前例 |
| D9 | ステータスの複数選択 | ネイティブの `<input type="checkbox">` と `Label`。選択肢は `PENDING` / `APPROVED` / `REJECTED` / `CANCELLED` の 4 つで、何も選ばなければ全ステータス | `components/ui/` にチェックボックス部品がない（新規依存を足さない）。選択肢は `reservations/page.tsx` の `ALL_STATUSES` と同じ |
| D10 | ファイル名の生成元 | BE が `Content-Disposition: attachment; filename="reservations_yyyyMMdd.csv"` を返し、Server Action がそれを読み取って画面へ渡す | RPT-01 の API が CSV の出力元。日付は既存の `createdAt` と同じく `LocalDate.now()`（タイムゾーン変換なし、`api-spec.md` §日時フォーマット） |
| D11 | BOM の受け渡し | Server Action は応答を `TextDecoder("utf-8", { ignoreBOM: true })` でデコードして BOM を文字列に残し、ブラウザ側は受け取った文字列をそのまま Blob にする | 通常の `res.text()` は BOM を取り除くため、BE が付けた BOM がファイルに残らない |

## 計画チェックリスト

- [x] 文脈の分析（requirements.md、stories.md、Spec 更新 1 回目、既存の ReservationController / ReservationService / ReservationRepository / ResourceSpecifications / api-client.ts / reservations/page.tsx）
- [x] 確認質問と回答の分析
- [x] components.md（コンポーネント定義と責務）
- [x] component-methods.md（メソッドシグネチャ。詳細な業務ルールは requirements.md・stories.md を参照）
- [x] services.md（Service の定義とオーケストレーション）
- [x] component-dependency.md（依存関係、通信パターン、データフロー）
- [x] application-design.md（統合版）
- [x] 設計の完全性・一貫性の検証（受入条件 18 件への対応、4 層の依存方向、要件外の振る舞いを足していないこと）
