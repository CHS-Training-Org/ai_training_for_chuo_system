---
type: working-doc
title: Code Quality Assessment（Reverse Engineering）
description: AI-DLC Reverse Engineering ステージが生成するコード品質評価と、DRAFT 追加の影響箇所・未決事項（今回のスコープ：予約の下書き保存）
timestamp: 2026-11-14
---

# Code Quality Assessment

**略記**: `BE/` = `backend/src/main/java/com/example/bookflow/`、`FE/` = `frontend/src/`。

## Test Coverage
- **Overall**: Fair（予約の基本フローは押さえているが、DRAFT と一部の層は未検証）
- **Unit Tests**: backend は `ReservationServiceTest`（Create / Get / Update / Cancel）、`ApprovalServiceTest`、`ResourceServiceTest`。frontend は `reservations.test.ts`（Server Actions）。
- **Integration Tests**: backend は `ReservationControllerTest`（H2 に seed して検証）。frontend の e2e に予約関連は無い。
- **DRAFT を扱うテスト**: backend / frontend とも見つからなかった。MSW の `POST` ハンドラは常に APPROVED を返し、`draft` を見ない。
- **Repository テスト**: `@DataJpaTest` 等は見つからなかった。
- **予約フォーム・ページのコンポーネントテスト**: 見つからなかった。

## Code Quality Indicators
- **Linting**: 設定済み（oxlint / Spotless / Checkstyle）
- **Code Style**: 4 層と命名は一貫している
- **Documentation**: Javadoc が丁寧（遷移の検証責務、`@PreAuthorize` 不使用の方針などが明記）

## Technical Debt
- `FE/app/(authenticated)/reservations/page.tsx` と `[id]/page.tsx` にステータスバッジの色定義が重複している（`FE/lib/labels.ts` には色マップが無い）。
- `OCCUPIED_STATUSES` が 3 つの Service に重複定義されている。
- 取消（`cancel`）は承認ステップを更新せず、残った承認ステップが残る（`ApprovalService` のコメントが「ファントムステップ」と呼ぶ既知事項）。
- テスト環境は H2 + `create-drop` のため、Flyway の CHECK 制約はテストで効かない（制約の根拠はエンティティの注釈になる）。

## Patterns and Anti-patterns
- **Good Patterns**: 4 層の厳守、遷移の事前検証を Service に集約、悲観ロックによる競合防止、占有状態をホワイトリストで持つ（DRAFT が自動的に対象外になる）。
- **Anti-patterns**: `!= PENDING` 方式の否定ガード（`ReservationService.update`、`ApprovalService.guardReservationPending`）は、状態が増えたときに意図せず挙動が変わりやすい。

## DRAFT 追加で挙動が変わる箇所（事実）

| 箇所 | 現状 | DRAFT 追加時の影響 |
|---|---|---|
| `ReservationService.checkReadAccess` | MEMBER 以外は全件読める | 他人の DRAFT を APPROVER が読めてしまう。受入条件は「本人以外は 403（ADMIN は除く）」 |
| `ReservationService.list` | status 未指定は全件（ADMIN は全員分） | 一覧の「すべて」に DRAFT が出る。ADMIN の一覧に他人の DRAFT が出る |
| `ReservationService.update` | PENDING 以外は 422 | DRAFT は更新も正式申請もできない（条件変更が必要） |
| `ReservationService.cancel` | PENDING / APPROVED のみ | DRAFT は取消も削除もできない（削除 API 自体が無い） |
| `ReservationService.create` | 常に重複判定・承認ステップ生成 | DRAFT 時の扱いを決める必要がある |
| `V001` の NOT NULL | `purpose` / `start_at` / `end_at` が必須 | 未入力の下書きを許すなら、Flyway と `nullable` の両方を緩める必要がある |
| `CreateReservationRequest` | `@NotNull` / `@NotBlank` が常に有効 | 同上（DTO 側の障害） |
| `FE/app/(authenticated)/reservations/[id]/edit/page.tsx` | PENDING 以外は `notFound()` | DRAFT は編集画面に入れない |
| `FE/app/(authenticated)/reservations/page.tsx` | `ALL_STATUSES` に DRAFT なし | 下書きタブが出ない |
| 占有判定（3 つの Service） | PENDING / APPROVED のホワイトリスト | 影響なし（DRAFT は占有扱いにならない。意図どおり） |
| 承認一覧（`ApprovalStepRepository`） | `r.status = 'PENDING'` で絞り込み | 影響なし（DRAFT は混入しない） |

## Requirements Analysis へ引き継ぐ論点（仕様が決めていない事項）

1. DRAFT の閲覧権限: 要件シートは「本人のみ」、受入条件は「ADMIN は除く（閲覧可）」。ADMIN は閲覧のみか、編集・削除もできるか。APPROVER は読めないことにするか（現行は全件読める）。
2. 削除: RSV-02 は「削除」に言及するが、DELETE API は仕様・実装ともに無い。追加するのか、取消で代替するのか。
3. DRAFT 作成時の検証: `endAt > startAt` の検証と重複判定を DRAFT でも行うか。必須項目（目的・日時）が未入力でも保存できるようにするか（DB の NOT NULL を緩めるか）。
4. 正式申請（DRAFT から PENDING）: 申請時に重複判定を行うか。承認要のリソースは承認ステップを生成するか。承認不要のリソースは APPROVED にするか（現行の `create` はこの分岐を持つが `update` には無い）。
5. 一覧の見せ方: 「すべて」タブに DRAFT を含めるか。専用の下書きタブにするか。ADMIN の一覧に他人の DRAFT を出すか。
6. 更新対象の仕様書: 要件シートの一覧（`api-spec.md` の POST・PUT、`screen-spec.md` の 3 画面、`requirements.md` の遷移図）に加え、`api-spec.md` の status 列挙、`requirements.md` の RSV-01 と「下書きは対象外」の記述、`er-diagram.md` の「未使用」の記述、遷移図のソース（`docs-next/static/diagrams/spec/requirements-reservation-status.drawio`）にも DRAFT の記述が必要。
